import { ollamaChat } from "./ollamaClient";
import type { GameState } from "@/lib/game/state";
import type { PlayerCommand } from "@/lib/rules/engine";

/**
 * AI-powered intent parser
 * Analyzes player input in context to determine what action they want to take
 */

type IntentParserResponse = {
  action_type: "skill_check" | "ability_check" | "attack" | "move" | "use_item" | "cast_spell" | "look" | "interact" | "focus" | "unknown";
  skill?: string;
  ability?: "str" | "dex" | "con" | "int" | "wis" | "cha";
  target_name?: string;
  reasoning?: string;
  dc_suggestion?: number;
};

function getIntentParserPrompt(): string {
  return `You are a D&D rules expert AI that analyzes player actions to determine what game mechanics to trigger.

TASK: Given a player's action and their current situation, determine:
1. What type of action is this?
2. Does it require a skill check or ability check?
3. Which skill/ability should be rolled?

ACTION TYPES:
- attack: ANY offensive action against an enemy (striking, slashing, hitting, shooting, punching, kicking, attacking, swinging at, lunging at, charging, etc.)
- skill_check: Requires a skill roll (stealth, athletics, persuasion, etc.)
- ability_check: Raw ability check (STR, DEX, CON, INT, WIS, CHA)
- move: Pure movement without other actions (walking, running to a location)
- use_item: Using an item from inventory
- cast_spell: Casting a spell
- look: Examining/observing (no roll needed)
- interact: Simple interaction (open door, take item) - may need check
- unknown: Unclear intent

CRITICAL: If the player mentions ANY of these words or phrases, it is an ATTACK action:
- attack, strike, slash, hit, shoot, stab, punch, kick, swing, lunge, charge
- "with my sword", "with my weapon", "with my blade"
- "before he could", "as he draws his bow"
- Any description of causing harm or engaging in combat

SKILLS:
athletics, acrobatics, sleightOfHand, stealth, arcana, history, investigation, nature, religion, animalHandling, insight, medicine, perception, survival, deception, intimidation, performance, persuasion

WHEN TO REQUIRE CHECKS:
- Forcing/breaking things = athletics (STR)
- Picking locks = sleightOfHand (DEX)
- Sneaking = stealth (DEX)
- Climbing difficult surfaces = athletics (STR)
- Balancing = acrobatics (DEX)
- Social manipulation = persuasion/deception/intimidation (CHA)
- Finding hidden things = perception/investigation (WIS/INT)
- Remembering information = history/arcana/religion/nature (INT)

WHEN NOT TO REQUIRE CHECKS:
- Looking at obvious things
- Walking normally
- Talking without persuading
- Opening unlocked doors
- Taking visible items

EXAMPLES:
Input: "I run straight for the goblin on 15,12, slashing him with my sword"
Output: {"action_type": "attack", "reasoning": "Player is slashing with sword - clear attack action"}

Input: "I attack the nearest goblin"
Output: {"action_type": "attack", "reasoning": "Direct attack command"}

Input: "I sneak past the guard"
Output: {"action_type": "skill_check", "skill": "stealth", "reasoning": "Sneaking requires stealth check", "dc_suggestion": 12}

INPUT: "I look around the room"
Output: {"action_type": "look", "reasoning": "Simple observation, no roll needed"}

OUTPUT FORMAT (JSON only):
{
  "action_type": "attack",
  "reasoning": "Player is attacking with sword"
}`;
}

function getUserIntentPrompt(playerInput: string, state: GameState): string {
  const currentRoom = state.map.rooms.find(room => 
    state.playerPos.x >= room.bounds.x && 
    state.playerPos.x < room.bounds.x + room.bounds.width &&
    state.playerPos.y >= room.bounds.y && 
    state.playerPos.y < room.bounds.y + room.bounds.height
  );

  const goblin = state.creatures["npc-1"];
  
  return `PLAYER INPUT: "${playerInput}"

CURRENT SITUATION:
- Location: ${currentRoom?.name || "Unknown area"}
- Room Description: ${currentRoom?.description || "No description"}
- Combat Active: ${state.combat.active ? "Yes" : "No"}
- Nearby Enemy: ${goblin && goblin.hp > 0 ? `${goblin.name} (HP: ${goblin.hp}/${goblin.maxHp})` : "None"}
- Player HP: ${state.creatures[state.playerId].hp}/${state.creatures[state.playerId].maxHp}

Analyze the player's intent and determine what action type and skill/ability check is needed.
Return ONLY valid JSON matching the schema.`;
}

export async function parseIntentWithAI(
  playerInput: string, 
  state: GameState,
  timeoutMs: number = 5000
): Promise<IntentParserResponse | null> {
  try {
    const response = await ollamaChat(
      "http://127.0.0.1:11434",
      {
        model: "qwen2.5:7b",
        messages: [
          { role: "system", content: getIntentParserPrompt() },
          { role: "user", content: getUserIntentPrompt(playerInput, state) },
        ],
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for more consistent parsing
          num_predict: 200, // Short response
        },
      },
      timeoutMs
    );

    // Extract JSON from response
    const content = response.message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[IntentParser] No JSON found in response:", content);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as IntentParserResponse;
    console.log("[IntentParser] Parsed intent:", parsed);
    
    return parsed;
    
  } catch (error) {
    console.warn("[IntentParser] Failed to parse intent with AI:", error);
    return null;
  }
}

/**
 * Convert AI intent response to PlayerCommand
 */
export function intentToCommand(intent: IntentParserResponse): PlayerCommand | null {
  switch (intent.action_type) {
    case "skill_check":
      if (intent.skill) {
        return { kind: "skill", skill: intent.skill as any };
      }
      break;
      
    case "ability_check":
      if (intent.ability) {
        return { kind: "check", ability: intent.ability };
      }
      break;
      
    case "attack":
      return { kind: "attack", target: "nearest" };
      
    case "focus":
      if (intent.target_name) {
        return { kind: "focus", targetName: intent.target_name };
      }
      break;
      
    case "look":
      return { kind: "look" };
      
    case "interact":
      // Try to determine specific interaction
      // This could be expanded based on reasoning
      return { kind: "look" }; // Default to look for now
  }
  
  return null;
}
