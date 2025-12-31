import type { EngineEvent } from "@/lib/game/events";
import type { DiceLogEntry } from "@/lib/rules/dice";
import type { GameLogItem, GameState } from "@/lib/game/state";

function appendLog(state: GameState, item: Omit<GameLogItem, "id" | "at">): GameState {
  const at = Date.now();
  const id = `${at}-${state.log.length}`;
  return { ...state, time: at, log: [...state.log, { ...item, id, at }] };
}

function formatDice(entry: DiceLogEntry): string {
  const rolls = entry.rolls.map((r) => `d${r.sides}=${r.result}`).join(", ");
  
  // Add advantage/disadvantage indicator
  let rollTypeText = "";
  if (entry.rollType === "advantage") {
    rollTypeText = " (advantage)";
  } else if (entry.rollType === "disadvantage") {
    rollTypeText = " (disadvantage)";
  }
  
  // Add critical indicator
  let critText = "";
  if (entry.wasCritical) {
    critText = " ⚡ CRITICAL!";
  } else if (entry.wasCriticalFail) {
    critText = " 💀 CRITICAL FAIL!";
  }
  
  return `${entry.label}: ${rolls}${rollTypeText} → ${entry.total}${critText}`;
}

export function applyDeterministicEventLogs(state: GameState, events: EngineEvent[]): GameState {
  let next = state;
  for (const ev of events) {
    if (ev.type === "Dice") {
      next = appendLog(next, { kind: "dice", text: formatDice(ev.entry) });
    } else if (ev.type === "CreatureDied") {
      next = appendLog(next, { kind: "system", text: `${ev.creatureName} has been slain!` });
    } else if (ev.type === "PlayerDied") {
      next = appendLog(next, { kind: "system", text: `${ev.creatureName} has died!` });
    } else if (ev.type === "CreatureUnconscious") {
      next = appendLog(next, { kind: "system", text: `${ev.creatureName} falls unconscious!` });
    } else if (ev.type === "DeathSave") {
      const result = ev.success ? "SUCCESS" : "FAILURE";
      next = appendLog(next, { 
        kind: "system", 
        text: `Death Save ${result}: ${ev.successes}/3 successes, ${ev.failures}/3 failures` 
      });
    } else if (ev.type === "Stabilized") {
      next = appendLog(next, { kind: "system", text: `${ev.creatureName} is stabilized.` });
    } else if (ev.type === "SavingThrow") {
      const result = ev.success ? "succeeded" : "failed";
      next = appendLog(next, { 
        kind: "system", 
        text: `${ev.creatureName} ${result} DC ${ev.dc} ${ev.ability.toUpperCase()} save (rolled ${ev.total})` 
      });
    } else if (ev.type === "ConcentrationBroken") {
      next = appendLog(next, { 
        kind: "system", 
        text: `Concentration on ${ev.spellName} broken: ${ev.reason}` 
      });
    } else if (ev.type === "InspirationGained") {
      next = appendLog(next, { kind: "system", text: `${ev.creatureName} gained inspiration!` });
    } else if (ev.type === "InspirationUsed") {
      next = appendLog(next, { kind: "system", text: `${ev.creatureName} used inspiration!` });
    } else if (ev.type === "ClassFeatureUsed") {
      next = appendLog(next, { 
        kind: "system", 
        text: `Used ${ev.featureName}: ${ev.effect}` 
      });
    } else if (ev.type === "ItemUsed") {
      next = appendLog(next, { kind: "system", text: `Used ${ev.itemName}: ${ev.effect}` });
    } else if (ev.type === "SpellCast") {
      next = appendLog(next, { kind: "system", text: `Cast ${ev.spellName}: ${ev.effect}` });
    } else if (ev.type === "Looted") {
      next = appendLog(next, { kind: "loot", text: ev.items.length > 0 ? "Loot acquired!" : "Nothing of value.", items: ev.items });
    } else if (ev.type === "Rested") {
      const restType = ev.restType === "short" ? "Short Rest" : "Long Rest";
      next = appendLog(next, { kind: "system", text: `${restType}: ${ev.message}` });
    } else if (ev.type === "MapModified") {
      next = appendLog(next, { kind: "system", text: `You ${ev.action} at (${ev.x}, ${ev.y})` });
    } else if (ev.type === "MapExpanded") {
      next = appendLog(next, { kind: "system", text: `🗺️ The dungeon expands! Discovered ${ev.newRooms} new room(s) to the ${ev.direction}!` });
    }
  }
  return next;
}

export function applyPlayerLine(state: GameState, text: string): GameState {
  return appendLog(state, { kind: "player", text });
}

export function applyDmLines(state: GameState, lines: string[]): GameState {
  let next = state;
  for (const text of lines) {
    const t = text.trim();
    if (!t) continue;
    next = appendLog(next, { kind: "dm", text: t });
  }
  return next;
}
