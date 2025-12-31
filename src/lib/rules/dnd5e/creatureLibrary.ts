import type { Creature, CreatureType } from "./types";
import type { Rng } from "@/lib/random/rng";

/**
 * Library of D&D creatures with proper stats
 */

export function createGoblin(id: string): Creature {
  return {
    id,
    name: "Goblin",
    level: 1,
    maxHp: 7,
    hp: 7,
    ac: 15,
    abilityScores: {
      str: 8,
      dex: 14,
      con: 10,
      int: 10,
      wis: 8,
      cha: 8,
    },
    proficientSkills: ["stealth"],
    creatureType: "humanoid",
    hitDice: "2d6",
    lootTable: [
      { name: "Gold Coins", quantity: 5, description: "Shiny gold coins" },
      { name: "Rusty Dagger", quantity: 1, description: "A worn but usable dagger" },
    ],
  };
}

export function createOrc(id: string): Creature {
  return {
    id,
    name: "Orc",
    level: 1,
    maxHp: 15,
    hp: 15,
    ac: 13,
    abilityScores: {
      str: 16,
      dex: 12,
      con: 16,
      int: 7,
      wis: 11,
      cha: 10,
    },
    proficientSkills: ["intimidation"],
    creatureType: "humanoid",
    hitDice: "2d8+6",
    lootTable: [
      { name: "Gold Coins", quantity: 10, description: "Bloodstained coins" },
      { name: "Greataxe", quantity: 1, description: "A heavy battle axe" },
    ],
  };
}

export function createSkeleton(id: string): Creature {
  return {
    id,
    name: "Skeleton",
    level: 1,
    maxHp: 13,
    hp: 13,
    ac: 13,
    abilityScores: {
      str: 10,
      dex: 14,
      con: 15,
      int: 6,
      wis: 8,
      cha: 5,
    },
    proficientSkills: [],
    creatureType: "undead",
    hitDice: "2d8+4",
    lootTable: [
      { name: "Bone Fragments", quantity: 3, description: "Pieces of ancient bone" },
      { name: "Rusty Sword", quantity: 1, description: "An old shortsword" },
    ],
  };
}

export function createWolf(id: string): Creature {
  return {
    id,
    name: "Wolf",
    level: 1,
    maxHp: 11,
    hp: 11,
    ac: 13,
    abilityScores: {
      str: 12,
      dex: 15,
      con: 12,
      int: 3,
      wis: 12,
      cha: 6,
    },
    proficientSkills: ["perception", "stealth"],
    creatureType: "beast",
    hitDice: "2d8+2",
    lootTable: [
      { name: "Wolf Pelt", quantity: 1, description: "A thick gray pelt" },
    ],
  };
}

export function createBandit(id: string): Creature {
  return {
    id,
    name: "Bandit",
    level: 1,
    maxHp: 11,
    hp: 11,
    ac: 12,
    abilityScores: {
      str: 11,
      dex: 12,
      con: 12,
      int: 10,
      wis: 10,
      cha: 10,
    },
    proficientSkills: ["deception", "stealth"],
    creatureType: "humanoid",
    hitDice: "2d8+2",
    lootTable: [
      { name: "Gold Coins", quantity: 15, description: "Stolen gold" },
      { name: "Leather Armor", quantity: 1, description: "Well-worn leather armor" },
    ],
  };
}

export function createZombie(id: string): Creature {
  return {
    id,
    name: "Zombie",
    level: 1,
    maxHp: 22,
    hp: 22,
    ac: 8,
    abilityScores: {
      str: 13,
      dex: 6,
      con: 16,
      int: 3,
      wis: 6,
      cha: 5,
    },
    proficientSkills: [],
    creatureType: "undead",
    hitDice: "3d8+9",
    lootTable: [
      { name: "Rotting Flesh", quantity: 1, description: "Putrid and useless" },
    ],
  };
}

export function createGiantSpider(id: string): Creature {
  return {
    id,
    name: "Giant Spider",
    level: 1,
    maxHp: 26,
    hp: 26,
    ac: 14,
    abilityScores: {
      str: 14,
      dex: 16,
      con: 12,
      int: 2,
      wis: 11,
      cha: 4,
    },
    proficientSkills: ["stealth"],
    creatureType: "beast",
    hitDice: "4d10+4",
    lootTable: [
      { name: "Spider Silk", quantity: 5, description: "Strong, sticky webbing" },
      { name: "Venom Gland", quantity: 1, description: "Contains potent poison" },
    ],
  };
}

export function createOgre(id: string): Creature {
  return {
    id,
    name: "Ogre",
    level: 2,
    maxHp: 59,
    hp: 59,
    ac: 11,
    abilityScores: {
      str: 19,
      dex: 8,
      con: 16,
      int: 5,
      wis: 7,
      cha: 7,
    },
    proficientSkills: [],
    creatureType: "humanoid",
    hitDice: "7d10+21",
    lootTable: [
      { name: "Gold Coins", quantity: 25, description: "Large pile of coins" },
      { name: "Greatclub", quantity: 1, description: "Massive wooden club" },
    ],
  };
}

/**
 * Get a random creature by difficulty level
 */
export function getRandomCreature(level: number, rng: Rng): Creature {
  const roll = Math.floor(rng.nextFloat01() * 100);
  
  if (level === 1) {
    if (roll < 30) return createGoblin(`enemy-${Date.now()}`);
    if (roll < 50) return createWolf(`enemy-${Date.now()}`);
    if (roll < 70) return createBandit(`enemy-${Date.now()}`);
    if (roll < 85) return createSkeleton(`enemy-${Date.now()}`);
    return createOrc(`enemy-${Date.now()}`);
  }
  
  if (level === 2) {
    if (roll < 25) return createZombie(`enemy-${Date.now()}`);
    if (roll < 50) return createGiantSpider(`enemy-${Date.now()}`);
    if (roll < 75) return createOrc(`enemy-${Date.now()}`);
    return createOgre(`enemy-${Date.now()}`);
  }
  
  // Default to goblin for other levels
  return createGoblin(`enemy-${Date.now()}`);
}

/**
 * Create multiple enemies for an encounter
 */
export function createEncounter(playerLevel: number, rng: Rng): Creature[] {
  const enemies: Creature[] = [];
  const roll = Math.floor(rng.nextFloat01() * 100);
  
  if (playerLevel === 1) {
    // 1-3 weak enemies or 1 strong enemy
    if (roll < 40) {
      // Single goblin
      enemies.push(createGoblin("npc-1"));
    } else if (roll < 70) {
      // 2 goblins
      enemies.push(createGoblin("npc-1"));
      enemies.push(createGoblin("npc-2"));
    } else if (roll < 90) {
      // Single orc or wolf
      enemies.push(roll < 80 ? createOrc("npc-1") : createWolf("npc-1"));
    } else {
      // 3 goblins - challenging!
      enemies.push(createGoblin("npc-1"));
      enemies.push(createGoblin("npc-2"));
      enemies.push(createGoblin("npc-3"));
    }
  } else {
    // Higher levels get tougher encounters
    enemies.push(createOrc("npc-1"));
    if (roll > 50) {
      enemies.push(createOrc("npc-2"));
    }
  }
  
  return enemies;
}
