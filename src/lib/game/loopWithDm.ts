import type { Rng } from "@/lib/rules/random/rng";
import type { GameState } from "@/lib/game/state";
import { expandMapInDirection } from "@/lib/game/state";
import type { EngineEvent } from "@/lib/game/events";
import { resolveCommand, parsePlayerCommand, resolveNpcTurn, type PlayerCommand } from "@/lib/rules/engine";
import { applyDeterministicEventLogs, applyDmLines, applyPlayerLine } from "@/lib/game/eventLog";
import { buildDmPayload } from "@/lib/aiDm/dmPrompt";
import { narrate as mockNarrate } from "@/lib/aiDm/mockDm";
import { parseIntentWithAI, intentToCommand } from "@/lib/aiDm/intentParser";
import { createEncounter } from "@/lib/rules/dnd5e/creatureLibrary";

async function fetchDmLines(
  state: GameState, 
  events: EngineEvent[],
  onChunk?: (text: string) => void
): Promise<string[]> {
  const res = await fetch("/api/dm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildDmPayload(state, events)),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DM API ${res.status}: ${text.slice(0, 200)}`);
  }

  // Handle streaming response
  if (res.headers.get("content-type")?.includes("text/event-stream")) {
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) throw new Error("No response body");
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              // Send the complete text for animation
              if (data.text && onChunk) {
                onChunk(data.text);
              }
              return data.lines || [data.text || ""];
            }
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    
    // Fallback if streaming didn't return proper format
    return [];
  }

  // Fallback to non-streaming response
  const data = (await res.json()) as { lines?: unknown };
  if (!Array.isArray(data.lines) || !data.lines.every((x) => typeof x === "string")) {
    throw new Error("DM API returned invalid lines");
  }

  return data.lines;
}

function fallbackDmLines(state: GameState, events: EngineEvent[]): string[] {
  // Use the mock DM, but only take DM text lines.
  const narr = mockNarrate(state, events);
  return narr.lines.filter((l) => l.kind === "dm").map((l) => l.text);
}

// Phase-based turn resolution for sequential dice animations
interface TurnPhase {
  state: GameState;
  events: readonly EngineEvent[];
  dmResponse: string;
}

export async function stepPlayerInputWithDm(
  state: GameState,
  rng: Rng,
  text: string,
  onStreamChunk?: (text: string) => void
): Promise<{ state: GameState; dmResponse: string; phases: TurnPhase[] }> {
  const phases: TurnPhase[] = [];
  let next = applyPlayerLine(state, text);
  
  // Try AI-powered intent parsing first for better natural language understanding
  let command: PlayerCommand = { kind: "unknown", raw: text };
  
  console.log("[GameLoop] Trying AI intent parser...");
  try {
    const intent = await parseIntentWithAI(text, next, 5000);
    if (intent) {
      const aiCommand = intentToCommand(intent);
      if (aiCommand) {
        console.log("[GameLoop] AI parsed command:", aiCommand);
        command = aiCommand;
      }
    }
  } catch (error) {
    console.warn("[GameLoop] AI intent parsing failed:", error);
  }
  
  // Fall back to regex-based parsing if AI didn't understand or failed
  if (command.kind === "unknown") {
    console.log("[GameLoop] AI couldn't parse, trying regex parser...");
    command = parsePlayerCommand(text);
  }
  
  const result = resolveCommand(next, rng, command);

  next = applyDeterministicEventLogs(result.nextState, result.events);
  
  // Check if we need to expand the map (door expansion or edge reached)
  const doorExpansion = result.events.find(e => e.type === "DoorNeedsExpansion");
  const edgeExpansion = result.events.find(e => e.type === "MapEdgeReached");
  const expansionEvent = doorExpansion || edgeExpansion;
  
  if (expansionEvent && (expansionEvent.type === "DoorNeedsExpansion" || expansionEvent.type === "MapEdgeReached")) {
    const direction = expansionEvent.direction;
    const referencePos = expansionEvent.type === "DoorNeedsExpansion" ? expansionEvent.doorPos : expansionEvent.playerPos;
    
    console.log(`[GameLoop] Expanding map in direction: ${direction} (trigger: ${expansionEvent.type})`);
    
    try {
      const { map: expandedMap, newRoomBounds } = await expandMapInDirection(
        next.map,
        referencePos,
        direction,
        "Unexplored regions of the dungeon"
      );
      
      // Update player position if map was offset
      const offsetX = direction === "west" ? 15 : 0;
      const offsetY = direction === "north" ? 10 : 0;
      
      // Update all creature positions
      const updatedCreaturePositions = Object.fromEntries(
        Object.entries(next.creaturePositions).map(([id, pos]) => [
          id,
          { x: pos.x + offsetX, y: pos.y + offsetY }
        ])
      );
      
      // Spawn enemies in new rooms
      const player = next.creatures[next.playerId];
      const newEnemies = createEncounter(player.level, rng);
      const newCreatures = { ...next.creatures };
      
      for (let i = 0; i < newEnemies.length && i < newRoomBounds.length; i++) {
        const enemy = newEnemies[i];
        const room = newRoomBounds[i % newRoomBounds.length];
        const enemyPos = {
          x: room.x + Math.floor(room.width / 2),
          y: room.y + Math.floor(room.height / 2) + (i % 2),
        };
        newCreatures[enemy.id] = enemy;
        updatedCreaturePositions[enemy.id] = enemyPos;
      }
      
      next = {
        ...next,
        map: expandedMap,
        playerPos: { 
          x: next.playerPos.x + offsetX, 
          y: next.playerPos.y + offsetY 
        },
        creaturePositions: updatedCreaturePositions,
        creatures: newCreatures,
      };
      
      // Add map expansion event
      result.events.push({
        type: "MapExpanded",
        direction: direction,
        newRooms: newRoomBounds.length,
      });
      
      next = applyDeterministicEventLogs(next, [result.events[result.events.length - 1]]);
      
      console.log("[GameLoop] Map expanded successfully, new rooms:", newRoomBounds.length);
    } catch (error) {
      console.error("[GameLoop] Failed to expand map:", error);
    }
  }

  // DM narration for player turn (PHASE 1)
  let playerDmResponse = "";
  try {
    const lines = await fetchDmLines(next, result.events, onStreamChunk);
    playerDmResponse = lines.join("\n\n");
  } catch {
    const lines = fallbackDmLines(next, result.events);
    playerDmResponse = lines.join("\n\n");
  }

  phases.push({
    state: next,
    events: result.events,
    dmResponse: playerDmResponse,
  });

  // Clear streaming text between turns
  if (onStreamChunk) {
    onStreamChunk("");
  }

  // Get all NPCs and resolve their turns one by one
  const npcIds = Object.keys(next.creatures).filter(id => id !== next.playerId);
  
  for (const npcId of npcIds) {
    const npc = resolveNpcTurn(next, rng);
    if (npc.events.length > 0 || npc.nextState !== next) {
      next = applyDeterministicEventLogs(npc.nextState, npc.events);
      
      let npcDmResponse = "";
      try {
        const lines = await fetchDmLines(next, npc.events, onStreamChunk);
        npcDmResponse = lines.join("\n\n");
      } catch {
        const lines = fallbackDmLines(next, npc.events);
        npcDmResponse = lines.join("\n\n");
      }

      phases.push({
        state: next,
        events: npc.events,
        dmResponse: npcDmResponse,
      });

      if (onStreamChunk) {
        onStreamChunk("");
      }
    }
  }

  // Combine all DM responses for backwards compatibility
  const fullDmResponse = phases.map(p => p.dmResponse).join("\n\n");

  return { state: next, dmResponse: fullDmResponse, phases };
}
