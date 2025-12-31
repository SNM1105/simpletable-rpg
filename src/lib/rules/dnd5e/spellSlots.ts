import type { SpellSlots } from "./types";

/**
 * Calculate max spell slots for a spellcaster based on their level.
 * This is a simplified version - in real D&D it varies by class.
 * Using the full caster progression (like Wizard/Cleric).
 */
export function calculateSpellSlots(level: number): SpellSlots {
  const slots: SpellSlots = {
    1: { max: 0, current: 0 },
    2: { max: 0, current: 0 },
    3: { max: 0, current: 0 },
    4: { max: 0, current: 0 },
    5: { max: 0, current: 0 },
    6: { max: 0, current: 0 },
    7: { max: 0, current: 0 },
    8: { max: 0, current: 0 },
    9: { max: 0, current: 0 },
  };

  // Full caster spell slot progression (D&D 5e)
  if (level >= 1) {
    slots[1] = { max: 2, current: 2 };
  }
  if (level >= 2) {
    slots[1] = { max: 3, current: 3 };
  }
  if (level >= 3) {
    slots[1] = { max: 4, current: 4 };
    slots[2] = { max: 2, current: 2 };
  }
  if (level >= 4) {
    slots[2] = { max: 3, current: 3 };
  }
  if (level >= 5) {
    slots[1] = { max: 4, current: 4 };
    slots[2] = { max: 3, current: 3 };
    slots[3] = { max: 2, current: 2 };
  }
  if (level >= 6) {
    slots[3] = { max: 3, current: 3 };
  }
  if (level >= 7) {
    slots[4] = { max: 1, current: 1 };
  }
  if (level >= 8) {
    slots[4] = { max: 2, current: 2 };
  }
  if (level >= 9) {
    slots[4] = { max: 3, current: 3 };
    slots[5] = { max: 1, current: 1 };
  }
  if (level >= 10) {
    slots[5] = { max: 2, current: 2 };
  }
  if (level >= 11) {
    slots[6] = { max: 1, current: 1 };
  }
  if (level >= 13) {
    slots[7] = { max: 1, current: 1 };
  }
  if (level >= 15) {
    slots[8] = { max: 1, current: 1 };
  }
  if (level >= 17) {
    slots[9] = { max: 1, current: 1 };
  }
  if (level >= 18) {
    slots[5] = { max: 3, current: 3 };
  }
  if (level >= 19) {
    slots[6] = { max: 2, current: 2 };
  }
  if (level >= 20) {
    slots[7] = { max: 2, current: 2 };
  }

  return slots;
}

/**
 * Reset spell slots to their maximum (long rest)
 */
export function restoreSpellSlots(slots: SpellSlots): SpellSlots {
  const restored = { ...slots };
  for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
    restored[level] = { ...restored[level], current: restored[level].max };
  }
  return restored;
}
