import type { Rng } from "@/lib/random/rng";
import type { GameState, GameLogItem } from "@/lib/game/state";
import { applyPlayerText, resolveNpcTurn } from "@/lib/rules/engine";
import { narrate } from "@/lib/aiDm/mockDm";

function appendLog(state: GameState, item: Omit<GameLogItem, "id" | "at">): GameState {
  const at = Date.now();
  const id = `${at}-${state.log.length}`;
  return { ...state, time: at, log: [...state.log, { ...item, id, at }] };
}

export function stepPlayerInput(state: GameState, rng: Rng, text: string): GameState {
  const result = applyPlayerText(state, rng, text);
  let next = result.nextState;

  const narration = narrate(next, result.events);
  for (const line of narration.lines) {
    next = appendLog(next, line);
  }

  // If combat is active and it's an NPC's turn, resolve exactly one NPC turn.
  const npc = resolveNpcTurn(next, rng);
  if (npc.events.length > 0 || npc.nextState !== next) {
    next = npc.nextState;
    const npcNarration = narrate(next, npc.events);
    for (const line of npcNarration.lines) {
      next = appendLog(next, line);
    }
  }

  return next;
}
