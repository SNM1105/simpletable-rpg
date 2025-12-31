export type Ability =
  | "str"
  | "dex"
  | "con"
  | "int"
  | "wis"
  | "cha";

export type CharacterClass =
  | "fighter"
  | "rogue"
  | "wizard"
  | "cleric"
  | "ranger"
  | "paladin"
  | "barbarian"
  | "bard"
  | "druid"
  | "monk"
  | "sorcerer"
  | "warlock";

export type CreatureType =
  | "humanoid"
  | "beast"
  | "undead"
  | "dragon"
  | "fiend"
  | "aberration"
  | "elemental";

export type DeathSaveState = {
  successes: number; // 0-3
  failures: number; // 0-3
  isStabilized: boolean;
};

export type Skill =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival";

export type AbilityScores = Record<Ability, number>;

export type CreatureId = string;

export type ItemEffect = 
  | { type: "heal"; amount: number }
  | { type: "mana"; amount: number }
  | { type: "buff"; stat: Ability; amount: number; duration: number }
  | { type: "condition"; name: string; duration: number }
  | { type: "none" };

export type Item = {
  name: string;
  quantity: number;
  effect?: ItemEffect;
  description?: string;
};

export type SpellEffect =
  | { type: "damage"; amount: number; damageType: string }
  | { type: "heal"; amount: number }
  | { type: "buff"; stat: Ability; amount: number; duration: number }
  | { type: "condition"; name: string; duration: number }
  | { type: "utility"; description: string };

export type Spell = {
  name: string;
  level: number;
  effect?: SpellEffect;
  description?: string;
};

export type SpellSlots = {
  1: { max: number; current: number };
  2: { max: number; current: number };
  3: { max: number; current: number };
  4: { max: number; current: number };
  5: { max: number; current: number };
  6: { max: number; current: number };
  7: { max: number; current: number };
  8: { max: number; current: number };
  9: { max: number; current: number };
};

export type Condition = {
  name: string;
  description: string;
  duration: number; // rounds remaining
  source?: string; // what caused this condition
};

export type ConcentrationSpell = {
  spellName: string;
  duration: number; // rounds remaining
  effect: string;
};

export type ClassFeature = {
  name: string;
  description: string;
  usesPerRest?: number; // if limited uses
  currentUses?: number;
  rechargeOn: "short" | "long" | "none";
};

export type Creature = {
  id: CreatureId;
  name: string;
  level: number;
  maxHp: number;
  hp: number;
  ac: number;
  abilityScores: AbilityScores;
  proficientSkills: Skill[];
  inventory?: Item[];
  spells?: Spell[];
  spellSlots?: SpellSlots;
  conditions?: Condition[];
  lootTable?: Item[]; // Items this creature drops when defeated
  
  // Character-specific properties
  characterClass?: CharacterClass;
  classFeatures?: ClassFeature[];
  inspiration?: boolean; // has inspiration point
  
  // Combat state
  isUnconscious?: boolean;
  deathSaves?: DeathSaveState;
  concentrating?: ConcentrationSpell;
  
  // Creature properties
  creatureType?: CreatureType;
  hitDice?: string; // e.g., "2d8" for calculating HP on rest
}
