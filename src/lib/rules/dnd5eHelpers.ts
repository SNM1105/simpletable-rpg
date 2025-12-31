import type { Creature, Ability, CharacterClass, ClassFeature } from "./dnd5e/types";

/**
 * Calculate proficiency bonus based on level
 */
export function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

/**
 * Get saving throw proficiencies by class
 */
export function getSavingThrowProficiencies(characterClass: CharacterClass): Ability[] {
  switch (characterClass) {
    case "fighter":
    case "paladin":
    case "ranger":
      return ["str", "con"];
    case "rogue":
    case "monk":
      return ["dex", "int"];
    case "wizard":
    case "sorcerer":
    case "warlock":
      return ["int", "wis"];
    case "cleric":
    case "druid":
      return ["wis", "cha"];
    case "bard":
      return ["dex", "cha"];
    case "barbarian":
      return ["str", "con"];
    default:
      return ["str", "dex"];
  }
}

/**
 * Check if character is proficient in a saving throw
 */
export function isProficientInSave(creature: Creature, ability: Ability): boolean {
  if (!creature.characterClass) return false;
  const proficiencies = getSavingThrowProficiencies(creature.characterClass);
  return proficiencies.includes(ability);
}

/**
 * Get class-specific starting features
 */
export function getStartingClassFeatures(characterClass: CharacterClass, level: number): ClassFeature[] {
  const features: ClassFeature[] = [];
  
  switch (characterClass) {
    case "fighter":
      features.push({
        name: "Second Wind",
        description: "Recover 1d10 + level HP as a bonus action",
        usesPerRest: 1,
        currentUses: 1,
        rechargeOn: "short",
      });
      if (level >= 2) {
        features.push({
          name: "Action Surge",
          description: "Take an additional action on your turn",
          usesPerRest: 1,
          currentUses: 1,
          rechargeOn: "short",
        });
      }
      break;
      
    case "rogue":
      features.push({
        name: "Sneak Attack",
        description: `Deal an extra ${Math.ceil(level / 2)}d6 damage when you have advantage`,
        rechargeOn: "none",
      });
      if (level >= 2) {
        features.push({
          name: "Cunning Action",
          description: "Dash, Disengage, or Hide as a bonus action",
          rechargeOn: "none",
        });
      }
      break;
      
    case "wizard":
    case "sorcerer":
    case "warlock":
      features.push({
        name: "Spellcasting",
        description: "Cast spells from your spell list",
        rechargeOn: "none",
      });
      break;
      
    case "barbarian":
      features.push({
        name: "Rage",
        description: "Gain damage resistance and bonus damage",
        usesPerRest: level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : 5,
        currentUses: level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : 5,
        rechargeOn: "long",
      });
      break;
      
    case "monk":
      features.push({
        name: "Flurry of Blows",
        description: "Make two unarmed strikes as a bonus action",
        rechargeOn: "none",
      });
      break;
      
    case "paladin":
      features.push({
        name: "Lay on Hands",
        description: `Heal up to ${level * 5} HP per long rest`,
        usesPerRest: level * 5,
        currentUses: level * 5,
        rechargeOn: "long",
      });
      break;
      
    case "ranger":
      features.push({
        name: "Favored Enemy",
        description: "Advantage on tracking and recalling info about favored enemy type",
        rechargeOn: "none",
      });
      break;
      
    case "cleric":
      features.push({
        name: "Channel Divinity",
        description: "Invoke divine power for various effects",
        usesPerRest: 1,
        currentUses: 1,
        rechargeOn: "short",
      });
      break;
      
    case "druid":
      features.push({
        name: "Wild Shape",
        description: "Transform into a beast",
        usesPerRest: 2,
        currentUses: 2,
        rechargeOn: "short",
      });
      break;
      
    case "bard":
      features.push({
        name: "Bardic Inspiration",
        description: `Grant a d${level < 5 ? 6 : level < 10 ? 8 : level < 15 ? 10 : 12} bonus to an ally`,
        usesPerRest: Math.floor((level - 1) / 4) + 2,
        currentUses: Math.floor((level - 1) / 4) + 2,
        rechargeOn: "short",
      });
      break;
  }
  
  return features;
}

/**
 * Calculate hit dice string for a class
 */
export function getHitDiceForClass(characterClass: CharacterClass): string {
  switch (characterClass) {
    case "barbarian":
      return "d12";
    case "fighter":
    case "paladin":
    case "ranger":
      return "d10";
    case "bard":
    case "cleric":
    case "druid":
    case "monk":
    case "rogue":
    case "warlock":
      return "d8";
    case "sorcerer":
    case "wizard":
      return "d6";
    default:
      return "d8";
  }
}

/**
 * Get descriptive HP status
 */
export function getHPStatus(current: number, max: number): string {
  const percent = (current / max) * 100;
  
  if (percent === 100) return "Unharmed";
  if (percent >= 75) return "Barely scratched";
  if (percent >= 50) return "Wounded";
  if (percent >= 25) return "Badly wounded";
  if (percent > 0) return "Near death";
  return "Unconscious";
}
