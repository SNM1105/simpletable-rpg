import type { DiceLogEntry } from "@/lib/rules/dice";

export type EngineEvent =
  | { type: "Moved"; dx: number; dy: number }
  | { type: "Bumped"; reason: string }
  | { type: "Look" }
  | { type: "Dice"; entry: DiceLogEntry }
  | { type: "AttackResolved"; targetName: string; hit: boolean; damage?: number; wasCritical?: boolean }
  | { type: "CreatureDied"; creatureName: string; creatureId: string }
  | { type: "CreatureUnconscious"; creatureName: string; creatureId: string }
  | { type: "DeathSave"; creatureName: string; success: boolean; successes: number; failures: number }
  | { type: "Stabilized"; creatureName: string }
  | { type: "SavingThrow"; creatureName: string; ability: string; total: number; success: boolean; dc: number }
  | { type: "CombatStarted" }
  | { type: "CombatEnded" }
  | { type: "ItemUsed"; itemName: string; effect: string }
  | { type: "SpellCast"; spellName: string; effect: string; requiresConcentration?: boolean }
  | { type: "ConcentrationBroken"; spellName: string; reason: string }
  | { type: "Looted"; items: string[]; message: string }
  | { type: "Rested"; restType: "short" | "long"; hpRestored: number; message: string }
  | { type: "InspirationGained"; creatureName: string }
  | { type: "InspirationUsed"; creatureName: string; for: string }
  | { type: "ClassFeatureUsed"; featureName: string; effect: string }
  | { type: "MapModified"; action: string; x: number; y: number; oldTile: string; newTile: string }
  | { type: "MapExpanded"; direction: string; newRooms: number }
  | { type: "MapEdgeReached"; direction: "north" | "south" | "east" | "west"; playerPos: { x: number; y: number } }
  | { type: "DoorNeedsExpansion"; doorPos: { x: number; y: number }; direction: "north" | "south" | "east" | "west" };


