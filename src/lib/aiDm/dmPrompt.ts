import type { EngineEvent } from "@/lib/game/events";
import type { GameState } from "@/lib/game/state";

export type DmRequestPayload = {
  stateSummary: {
    pcName: string;
    pcHp: string;
    pos: string;
    currentRoom: string;
    roomDescription: string;
    combat: string;
    enemy: string;
    enemyPosition?: string;
  };
  events: EngineEvent[];
  lastPlayerText: string | null;
};

export function buildDmPayload(state: GameState, events: EngineEvent[]): DmRequestPayload {
  const pc = state.creatures[state.playerId];
  const goblin = state.creatures["npc-1"];
  const lastPlayerText =
    [...state.log].reverse().find((x) => x.kind === "player")?.text ?? null;

  const combat = state.combat.active
    ? `active (round ${state.combat.round}, turn ${state.combat.turnIndex + 1}/${state.combat.order.length})`
    : "inactive";

  const enemy =
    goblin && goblin.maxHp
      ? `${goblin.name} HP ${goblin.hp}/${goblin.maxHp}`
      : "none";

  // Find current room
  const currentRoom = state.map.rooms.find(room => 
    state.playerPos.x >= room.bounds.x && 
    state.playerPos.x < room.bounds.x + room.bounds.width &&
    state.playerPos.y >= room.bounds.y && 
    state.playerPos.y < room.bounds.y + room.bounds.height
  );

  // Enemy position
  const goblinPos = state.creaturePositions["npc-1"];
  const enemyPosition = goblin && goblinPos 
    ? `at position ${goblinPos.x},${goblinPos.y}`
    : undefined;

  return {
    stateSummary: {
      pcName: pc.name,
      pcHp: `${pc.hp}/${pc.maxHp}`,
      pos: `${state.playerPos.x},${state.playerPos.y}`,
      currentRoom: currentRoom?.name || "Unknown Area",
      roomDescription: currentRoom?.description || "A nondescript area",
      combat,
      enemy,
      enemyPosition,
    },
    events,
    lastPlayerText,
  };
}

export function dmSystemPrompt(): string {
  return [
    "You are an expert Dungeon Master with years of experience creating immersive fantasy adventures.",
    "Your narration brings the world to life with vivid descriptions, engaging dialogue, and atmospheric detail.",
    "You MUST respond in English only.",
    "",
    "CORE PRINCIPLES:",
    "- Paint vivid sensory pictures: describe sights, sounds, smells, textures, and atmosphere",
    "- Show character emotions and reactions through body language and expressions",
    "- Use dynamic action verbs and evocative language",
    "- Create tension and drama through pacing and description",
    "- Make every moment feel cinematic and engaging",
    "- When NPCs speak, give them distinct voices and personalities",
    "",
    "STRICT RULES:",
    "- NEVER roll dice or determine outcomes - the game engine does that",
    "- NEVER change stats, HP, positions, or mechanical results",
    "- ONLY narrate the events the engine provides - your job is to make them come alive",
    "- If an event shows failure, narrate it dramatically but don't change the outcome",
    "- NEVER repeat dice roll numbers - they're already shown in the game log",
    "- DO NOT say things like 'you rolled a 13' or 'your initiative roll of 15'",
    "- Focus on the OUTCOME and NARRATIVE, not the mechanics",
    "",
    "CRITICAL - RESOLVING ACTIONS:",
    "- When you see a dice roll in the events, YOU MUST conclude what happened",
    "- Example: sleightOfHand check (15) = 'The lock clicks open' or 'The pick snaps'",
    "- Example: attack roll (18) = 'Your blade finds its mark' or 'You miss'",
    "- Don't just describe the attempt - TELL THE PLAYER THE RESULT",
    "- High rolls (15+) = success, low rolls (10-) = failure, middle = partial",
    "- Always end your narration with a clear outcome, not a cliffhanger",
    "- Narrate WHAT happened, not WHAT NUMBER was rolled",
    "",
    "OUTPUT FORMAT:",
    "Return strict JSON: {\"lines\":[\"...\"]}",
    "- DO NOT include markdown code blocks, language tags, or explanations",
    "- DO NOT prefix with 'json' or wrap in ```",
    "- Return ONLY the raw JSON object starting with { and ending with }",
    "- Each line should be 2-4 sentences of rich, detailed narration.",
    "- Aim for 3-5 lines total to fully capture the scene.",
    "- Make every word count - be descriptive but purposeful.",
  ].join("\n");
}

export function dmUserPrompt(payload: DmRequestPayload): string {
  return [
    "STATE SUMMARY:",
    `PC: ${payload.stateSummary.pcName} (HP ${payload.stateSummary.pcHp})`,
    `Current Location: ${payload.stateSummary.currentRoom}`,
    `Room Details: ${payload.stateSummary.roomDescription}`,
    `Position: ${payload.stateSummary.pos}`,
    `Combat: ${payload.stateSummary.combat}`,
    `Enemy: ${payload.stateSummary.enemy}${payload.stateSummary.enemyPosition ? ` ${payload.stateSummary.enemyPosition}` : ""}`,
    payload.lastPlayerText ? `Last player input: "${payload.lastPlayerText}"` : "Last player input: (none)",
    "",
    "EVENTS FROM GAME ENGINE (these are the FACTS that happened):",
    JSON.stringify(payload.events, null, 2),
    "",
    "YOUR TASK:",
    "1. Look at the events - they show dice rolls and mechanical results",
    "2. Narrate what the player tried to do (from their input)",
    "3. Describe the action and outcome dramatically",
    "4. CLEARLY STATE THE OUTCOME based on the roll total",
    "5. Use the room description for environmental details",
    "",
    "REMEMBER:",
    "- Don't leave the player wondering what happened",
    "- If they rolled a 15+ on a skill, they SUCCEEDED",
    "- If they rolled 10-, they FAILED",
    "- Always conclude the action with a definitive result",
    "- DO NOT mention specific dice roll numbers - narrate the outcome instead",
    "- Example: Say 'Your blade strikes true' NOT 'You rolled a 15'",
    "",
    "CRITICAL: Write ONLY in English. Never use Chinese, Japanese, or any other language.",
    "Respond ONLY with JSON.",
  ].join("\n");
}

export function parseDmJson(content: string): { lines: string[] } {
  // Remove markdown code blocks if present
  let trimmed = content.trim();
  if (trimmed.startsWith('```json')) {
    trimmed = trimmed.slice(7);
  } else if (trimmed.startsWith('```')) {
    trimmed = trimmed.slice(3);
  }
  if (trimmed.endsWith('```')) {
    trimmed = trimmed.slice(0, -3);
  }
  trimmed = trimmed.trim();
  
  // Some models may wrap JSON in prose; try to extract the first {...} block.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  const candidate = first >= 0 && last >= 0 && last > first ? trimmed.slice(first, last + 1) : trimmed;

  const parsed = JSON.parse(candidate) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("DM response not an object");

  const lines = (parsed as { lines?: unknown }).lines;
  if (!Array.isArray(lines) || !lines.every((x) => typeof x === "string")) {
    throw new Error("DM response missing lines[]");
  }

  return { lines };
}
