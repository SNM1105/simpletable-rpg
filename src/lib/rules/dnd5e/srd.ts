import type { Ability, AbilityScores, Skill } from "@/lib/rules/dnd5e/types";

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  // 5e SRD rule of thumb.
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

export const SKILL_TO_ABILITY: Record<Skill, Ability> = {
  acrobatics: "dex",
  animalHandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleightOfHand: "dex",
  stealth: "dex",
  survival: "wis",
};

export function abilityCheckBonus(
  abilityScores: AbilityScores,
  ability: Ability
): number {
  return abilityMod(abilityScores[ability]);
}

export function skillCheckBonus(args: {
  abilityScores: AbilityScores;
  skill: Skill;
  level: number;
  proficient: boolean;
}): number {
  const ability = SKILL_TO_ABILITY[args.skill];
  const mod = abilityMod(args.abilityScores[ability]);
  const prof = args.proficient ? proficiencyBonus(args.level) : 0;
  return mod + prof;
}
