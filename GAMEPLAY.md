# Dynamic Gameplay Features

This game now includes full D&D-style resource management, item systems, and immersive storytelling!

## 📖 Immersive Storytelling

### Live DM Narration

- **Real-time Streaming**: Watch the DM's responses appear word-by-word as they're generated
- **Rich Descriptions**: The DM provides vivid, detailed narration with sensory details
- **Atmospheric Writing**: Every action is brought to life with cinematic descriptions
- **Character Depth**: NPCs speak with distinct voices and personalities
- **Typing Indicator**: See when the DM is composing their response with animated dots

### Enhanced AI DM

- More creative and detailed responses than before
- 3-5 lines of rich narration per event
- Vivid sensory descriptions (sights, sounds, smells, textures)
- Dynamic character emotions and reactions
- Dramatic pacing and tension building

## 🎒 Inventory System

### Using Items

- **Command**: `use [item name]` or `drink [item]` or `eat [item]`
- Items are consumed when used (quantity decreases)
- Items can have effects:
  - **Healing**: Restores HP (e.g., Health Potion)
  - **Mana**: Restores spell slots (e.g., Mana Potion)
  - **Buffs**: Temporary stat increases
  - **Conditions**: Apply status effects

### Looting

- **Command**: `loot` or `search body`
- Defeated enemies drop items from their loot table
- Items are automatically added to your inventory
- Stackable items combine quantities

## ✨ Spell System

### Casting Spells

- **Command**: `cast [spell name]`
- Spells consume spell slots based on their level
- Spell slots recharge on rest
- Spell effects:
  - **Damage**: Deal damage to enemies
  - **Healing**: Restore HP
  - **Utility**: Various magical effects

### Spell Slots

- Based on character level (full caster progression)
- Displayed in character sheet with current/max
- Track individual slot levels (1-9)
- Automatically calculated on character creation

## 😴 Resting

- **Command**: `rest` or `long rest`
- Cannot rest during combat
- Effects:
  - Restore all HP to maximum
  - Recharge all spell slots
  - Clear all conditions/status effects

## 🎲 Conditions

- Status effects that last for a number of rounds
- Can be applied by items, spells, or enemies
- Display duration and description
- Examples: Poisoned, Blessed, Fatigued

## 🎮 Commands Reference

### Combat

- `attack` or `I attack with my sword`
- `start combat` (manual combat initiation)
- `end combat` (manual combat end)

### Items & Spells

- `use health potion` - Consume an item
- `drink mana potion` - Restore spell slots
- `cast fire bolt` - Cast a spell
- `loot` - Collect items from defeated enemies

### Exploration

- `n`, `s`, `e`, `w` - Move in direction
- `look` - Examine surroundings
- `rest` - Take a long rest

### Skills & Checks

- `stealth`, `perception`, `persuasion`, etc. - Skill checks
- `check str`, `check dex`, etc. - Ability checks
- `roll 1d20+5` - Manual dice rolls

## 🛠️ Character Creation

In the setup screen, you can:

- Define starting items with effects
- Assign spells with their effects
- Set ability scores
- Configure HP, AC, and level

**Quick-add buttons** provide common items and spells:

- Health Potions (heal 10 HP)
- Mana Potions (restore 2 spell slot levels)
- Healing spells (Cure Wounds)
- Damage spells (Fire Bolt, Burning Hands)

## 📊 Character Sheet Display

The character sheet now shows:

- **HP**: Current/Max hit points
- **AC**: Armor class
- **Ability Scores**: All six abilities
- **Inventory**: Items with quantities
- **Spells**: Known spells with levels
- **Spell Slots**: Current/Max for each level
- **Conditions**: Active status effects with durations

## 🎯 Examples

```
> drink health potion
Used Health Potion: Healed 10 HP

> cast magic missile
Cast Magic Missile: Dealt 10 force damage to Goblin

> loot
You looted: Gold Coins x5, Rusty Dagger x1

> rest
You take a long rest. HP fully restored, spell slots recharged, conditions cleared.
```

## 💡 Tips

- Keep potions handy for emergencies
- Manage spell slots carefully - they don't recharge until you rest
- Loot defeated enemies to gather resources
- Rest when safe to restore all resources
- Items stack in inventory (same name = combined quantity)
