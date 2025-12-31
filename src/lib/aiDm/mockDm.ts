import type { EngineEvent } from "@/lib/game/events";
import type { GameState, GameLogItem } from "@/lib/game/state";

export type DmNarration = {
  lines: Array<Omit<GameLogItem, "id" | "at">>;
};

export function narrate(state: GameState, events: EngineEvent[]): DmNarration {
  const pc = state.creatures[state.playerId];
  const goblin = state.creatures["npc-1"];

  const lines: Array<Omit<GameLogItem, "id" | "at">> = [];

  if (events.length === 0) {
    lines.push({
      kind: "dm",
      text: "I’m waiting on an engine event. Try `look`, `n/s/e/w`, `attack`, `start combat`, or `roll 1d20`.",
    });
    return { lines };
  }

  for (const ev of events) {
    if (ev.type === "Look") {
      lines.push({
        kind: "dm",
        text:
          goblin && goblin.hp > 0
            ? `You stand in a cramped stone room. A ${goblin.name} watches you from the shadows.`
            : "You stand in a cramped stone room. Whatever threat was here is now still.",
      });
    }

    if (ev.type === "CombatStarted") {
      lines.push({
        kind: "dm",
        text: "Combat begins. Roll initiative is already resolved by the engine—act when it’s your turn.",
      });
    }

    if (ev.type === "CombatEnded") {
      lines.push({ kind: "dm", text: "Combat ends." });
    }

    if (ev.type === "Moved") {
      lines.push({
        kind: "dm",
        text: `You move one cautious step. (${pc.name} at ${state.playerPos.x},${state.playerPos.y})`,
      });
    }

    if (ev.type === "Bumped") {
      if (ev.reason.startsWith("Unknown command:")) {
        lines.push({ kind: "dm", text: `I didn’t understand that. ${ev.reason}` });
      } else if (ev.reason === "Not your turn.") {
        lines.push({ kind: "dm", text: "Hold. It’s not your turn." });
      } else {
        lines.push({ kind: "dm", text: `You can’t do that. ${ev.reason}` });
      }
    }

    if (ev.type === "Dice") {
      lines.push({
        kind: "dice",
        text: `${ev.entry.label}: ${ev.entry.rolls.map((r) => `d${r.sides}=${r.result}`).join(", ")} → ${ev.entry.total}`,
      });
    }

    if (ev.type === "AttackResolved") {
      if (!ev.hit) {
        lines.push({ kind: "dm", text: `An attack misses ${ev.targetName}.` });
      } else {
        lines.push({
          kind: "dm",
          text: `Steel bites. You hit the ${ev.targetName} for ${ev.damage} damage.`,
        });
      }
    }
  }

  if (goblin && goblin.hp <= 0) {
    lines.push({ kind: "dm", text: "The goblin collapses. The room exhales." });
  }

  return { lines };
}
