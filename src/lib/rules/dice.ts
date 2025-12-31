import type { Rng } from "@/lib/random/rng";

export type RollType = "normal" | "advantage" | "disadvantage";

export type DiceRoll = {
  sides: number;
  result: number;
};

export type DiceLogEntry = {
  label: string;
  rolls: DiceRoll[];
  total: number;
  rollType?: RollType;
  wasCritical?: boolean;
  wasCriticalFail?: boolean;
};

export function rollDie(rng: Rng, sides: number): number {
  if (sides < 2) throw new Error("Die must have at least 2 sides");
  return 1 + Math.floor(rng.nextFloat01() * sides);
}

/**
 * Roll d20 with advantage, disadvantage, or normal
 */
export function rollD20(rng: Rng, rollType: RollType = "normal"): { result: number; wasCritical: boolean; wasCriticalFail: boolean; rolls: number[] } {
  if (rollType === "normal") {
    const roll = rollDie(rng, 20);
    return {
      result: roll,
      wasCritical: roll === 20,
      wasCriticalFail: roll === 1,
      rolls: [roll],
    };
  }
  
  // Roll twice for advantage/disadvantage
  const roll1 = rollDie(rng, 20);
  const roll2 = rollDie(rng, 20);
  
  const result = rollType === "advantage" 
    ? Math.max(roll1, roll2) 
    : Math.min(roll1, roll2);
  
  return {
    result,
    wasCritical: result === 20,
    wasCriticalFail: result === 1,
    rolls: [roll1, roll2],
  };
}

export function rollDice(
  rng: Rng,
  label: string,
  sides: number,
  count: number
): DiceLogEntry {
  if (count < 1) throw new Error("Must roll at least 1 die");
  const rolls: DiceRoll[] = [];
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    const result = rollDie(rng, sides);
    rolls.push({ sides, result });
    total += result;
  }
  return { label, rolls, total };
}
