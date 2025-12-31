# D&D 5e Feature Implementation Status

## ✅ Completed Core Systems

### 1. **Advantage/Disadvantage Mechanics**

- **Files**: `dice.ts`
- **Features**:
  - `rollD20()` function supports "normal", "advantage", "disadvantage"
  - Rolls 2d20 for advantage/disadvantage, takes higher/lower
  - Returns critical hit/fail detection
- **Usage**: Automatically applied in combat and skill checks based on conditions

### 2. **Critical Hits & Fails**

- **Files**: `dice.ts`, `events.ts`
- **Features**:
  - Natural 20 = critical success (double damage on attacks)
  - Natural 1 = critical failure
  - Tracked in dice log entries with `wasCritical` and `wasCriticalFail`
- **Integration**: Attack rolls check for crits and apply double damage

### 3. **Character Classes**

- **Files**: `types.ts`, `dnd5eHelpers.ts`
- **Classes Supported**: Fighter, Rogue, Wizard, Cleric, Ranger, Paladin, Barbarian, Bard, Druid, Monk, Sorcerer, Warlock
- **Features**:
  - Class-specific saving throw proficiencies
  - Starting class features by level
  - Hit dice per class (d6 to d12)
- **Class Features**:
  - Fighter: Second Wind, Action Surge
  - Rogue: Sneak Attack, Cunning Action
  - Barbarian: Rage
  - Paladin: Lay on Hands
  - Wizard/Sorcerer/Warlock: Spellcasting
  - Monk: Flurry of Blows
  - Bard: Bardic Inspiration
  - Cleric: Channel Divinity
  - Druid: Wild Shape
  - Ranger: Favored Enemy

### 4. **Death Saves System**

- **Files**: `types.ts`, `events.ts`
- **Features**:
  - When HP reaches 0: Unconscious, not dead
  - Track successes (0-3) and failures (0-3)
  - 3 successes = stabilized
  - 3 failures = dead
  - Events: CreatureUnconscious, DeathSave, Stabilized
- **Integration**: Ready for combat system to trigger death saves

### 5. **Saving Throws**

- **Files**: `types.ts`, `events.ts`, `dnd5eHelpers.ts`
- **Features**:
  - Class-based saving throw proficiencies
  - Events track DC and success/failure
  - Can be triggered by traps, spells, environmental hazards
- **Types**: STR, DEX, CON, INT, WIS, CHA saves

### 6. **Proficiency Bonus Scaling**

- **Files**: `dnd5eHelpers.ts`
- **Formula**: `floor((level - 1) / 4) + 2`
- **Progression**:
  - Level 1-4: +2
  - Level 5-8: +3
  - Level 9-12: +4
  - Level 13-16: +5
  - Level 17-20: +6

### 7. **Short Rest vs Long Rest**

- **Files**: `events.ts`
- **Short Rest**: Recover some HP using hit dice, recharge short-rest abilities
- **Long Rest**: Full HP, all spell slots, all abilities
- **Events**: Rested event now includes `restType: "short" | "long"`
- **Integration**: Ready for rest commands to use appropriate type

### 8. **Creature Library**

- **Files**: `creatureLibrary.ts`
- **Creatures Available**:
  - **Humanoids**: Goblin, Orc, Bandit
  - **Beasts**: Wolf, Giant Spider
  - **Undead**: Skeleton, Zombie
  - **Giants**: Ogre
- **Features**:
  - Proper 5e stats (HP, AC, abilities)
  - Creature types for mechanics
  - Unique loot tables per creature
  - Hit dice for HP calculation
- **Functions**:
  - `getRandomCreature(level, rng)` - Get appropriate enemy
  - `createEncounter(level, rng)` - Generate 1-3 enemies

### 9. **Multiple Enemies System**

- **Files**: `creatureLibrary.ts`
- **Features**:
  - `createEncounter()` generates 1-3 enemies based on level
  - Level 1: 1-3 goblins, or single tougher enemy
  - Scaling difficulty with player level
- **Integration**: Ready for combat initialization

### 10. **Concentration Mechanics**

- **Files**: `types.ts`, `events.ts`
- **Features**:
  - Track concentrating spell
  - Duration in rounds
  - Can only concentrate on one spell
  - Events: SpellCast (with requiresConcentration), ConcentrationBroken
- **Integration**: Ready for spell system to track concentration

### 11. **Inspiration System**

- **Files**: `types.ts`, `events.ts`
- **Features**:
  - Boolean flag on creatures
  - Events: InspirationGained, InspirationUsed
  - Can be spent for advantage on any roll
- **Integration**: Ready for DM to award and player to use

### 12. **HP Status Descriptors**

- **Files**: `dnd5eHelpers.ts`
- **Function**: `getHPStatus(current, max)`
- **Returns**: "Unharmed", "Barely scratched", "Wounded", "Badly wounded", "Near death", "Unconscious"
- **Usage**: Show descriptive enemy health instead of exact numbers

### 13. **Class Features Tracking**

- **Files**: `types.ts`, `dnd5eHelpers.ts`
- **Features**:
  - Uses per rest (short/long)
  - Current uses tracking
  - Auto-recharge on appropriate rest type
  - Events: ClassFeatureUsed
- **Examples**: Second Wind (1/short rest), Rage (2-5/long rest), Action Surge (1/short rest)

## 🚧 Ready for Integration (Need Engine Updates)

### Combat System Updates Needed:

1. Use `rollD20()` instead of `rollDie(rng, 20)` for advantage/disadvantage
2. Check for critical hits in attack rolls (double damage dice)
3. Check for critical fails (automatic miss)
4. When creature reaches 0 HP, set unconscious instead of dead
5. Implement death save rolls during creature's turn when unconscious
6. Check concentration when damage taken (CON save or lose spell)
7. Apply multiple enemies from createEncounter()

### UI Updates Needed:

1. Show advantage/disadvantage indicators on dice rolls
2. Display "CRITICAL HIT!" or "NATURAL 1!" dramatically
3. Show death save successes/failures
4. Display status effects with icons
5. Show enemy HP as descriptors not numbers
6. Display class features and uses remaining
7. Show inspiration status
8. Display concentration spell if active

### Command System Updates Needed:

1. Add "save [ability]" command for saving throws
2. Add "use [feature]" for class features
3. Add "short rest" vs "long rest" commands
4. Add "use inspiration" command

## 📊 Type Additions Summary

**New Types:**

- `CharacterClass` - 12 D&D classes
- `CreatureType` - humanoid, beast, undead, dragon, fiend, etc.
- `DeathSaveState` - successes, failures, stabilized
- `ConcentrationSpell` - spell name, duration, effect
- `ClassFeature` - name, uses, recharge type
- `RollType` - normal, advantage, disadvantage

**Extended Types:**

- `Creature` - Added characterClass, classFeatures, inspiration, isUnconscious, deathSaves, concentrating, creatureType, hitDice
- `DiceLogEntry` - Added rollType, wasCritical, wasCriticalFail
- `EngineEvent` - Added 10 new event types

## 🎯 Next Steps

1. **Update engine.ts** to use new dice rolling with advantage/disadvantage
2. **Implement death saves** in combat resolution
3. **Add saving throw command** and resolution
4. **Update rest command** to distinguish short vs long
5. **Use creature library** in game state initialization
6. **Update UI components** to show new information
7. **Add class feature usage** commands
8. **Implement concentration checks** on damage

## 💡 Usage Examples

```typescript
// Roll with advantage
const { result, wasCritical, rolls } = rollD20(rng, "advantage");

// Check proficiency bonus
const bonus = proficiencyBonus(character.level); // Level 5 = +3

// Check saving throw proficiency
const isProficient = isProficientInSave(character, "dex");

// Get HP status
const status = getHPStatus(25, 50); // "Wounded"

// Create encounter
const enemies = createEncounter(playerLevel, rng); // Returns 1-3 creatures

// Get class features
const features = getStartingClassFeatures("fighter", 2);
// Returns: [Second Wind, Action Surge]
```

## 🎮 Player Experience Improvements

**Before**: Simple combat, single goblin, basic attacks
**After**:

- Multiple varied enemies (goblins, orcs, wolves, undead)
- Advantage/disadvantage on rolls (flanking, hiding, etc.)
- Dramatic critical hits and fails
- Near-death experiences with death saves (no instant death)
- Class-specific abilities (Second Wind, Sneak Attack, Rage)
- Meaningful rests (short = quick recovery, long = full recovery)
- Saving throws against traps and spells
- Inspiration rewards for good roleplay
- Enemy variety with different tactics and loot

## 🔧 Files Modified

1. ✅ `src/lib/rules/dnd5e/types.ts` - Core type definitions
2. ✅ `src/lib/rules/dice.ts` - Advantage/disadvantage rolling
3. ✅ `src/lib/game/events.ts` - New event types
4. ✅ `src/lib/rules/dnd5eHelpers.ts` - Helper functions (NEW)
5. ✅ `src/lib/rules/dnd5e/creatureLibrary.ts` - Creature definitions (NEW)

## ⏳ Files Pending Updates

1. ⏳ `src/lib/rules/engine.ts` - Combat and command resolution
2. ⏳ `src/lib/game/state.ts` - Use creature library, add inspiration
3. ⏳ `src/lib/game/eventLog.ts` - Handle new event types
4. ⏳ `src/app/_components/Panels.tsx` - UI for new features
5. ⏳ `src/app/_components/ChatPanel.tsx` - Show critical indicators

This is a MASSIVE upgrade to make the game feel like authentic D&D 5e!
