"use client";

import * as React from "react";
import type { Creature, Item, Spell } from "@/lib/rules/dnd5e/types";

export type SetupData = {
  campaignPrompt: string;
  playerCharacter: Creature;
};

type SetupScreenProps = {
  onStart: (data: SetupData) => Promise<void>;
};

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [campaignPrompt, setCampaignPrompt] = React.useState(
    "You wake up in a dimly lit dungeon cell. A rusty goblin guard patrols nearby. The air is damp and cold."
  );
  const [characterPhoto, setCharacterPhoto] = React.useState<string>("");
  const [characterDescription, setCharacterDescription] = React.useState<string>("");
  
  const [character, setCharacter] = React.useState<Creature>({
    id: "pc-1",
    name: "Adventurer",
    level: 1,
    maxHp: 12,
    hp: 12,
    ac: 14,
    abilityScores: {
      str: 14,
      dex: 14,
      con: 12,
      int: 10,
      wis: 10,
      cha: 10,
    },
    proficientSkills: ["perception", "stealth"],
    inventory: [
      { name: "Sword", quantity: 1, description: "A simple iron sword" },
      { name: "Health Potion", quantity: 2, effect: { type: "heal", amount: 10 }, description: "Restores 10 HP" },
    ],
    spells: [
      { name: "Fire Bolt", level: 0, effect: { type: "damage", amount: 5, damageType: "fire" }, description: "Cantrip - 5 fire damage" },
      { name: "Magic Missile", level: 1, effect: { type: "damage", amount: 10, damageType: "force" }, description: "Level 1 - 10 force damage" },
    ],
  });

  const handleAbilityChange = (ability: keyof typeof character.abilityScores, value: number) => {
    setCharacter({
      ...character,
      abilityScores: {
        ...character.abilityScores,
        [ability]: value,
      },
    });
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await onStart({
        campaignPrompt,
        playerCharacter: character,
      });
    } catch (error) {
      console.error("Failed to start adventure:", error);
      setIsLoading(false);
    }
  };

  const randomCampaigns = [
    "You wake up in a sun-drenched forest clearing. Ancient trees tower overhead, their branches swaying gently. A crystal-clear stream babbles nearby, and you hear the distant sound of elven music. A weathered map lies at your feet, marking the location of a hidden temple.",
    "The salty sea breeze fills your lungs as you stand on a busy harbor dock. Merchants shout their wares, sailors load cargo onto tall ships, and seagulls circle overhead. A mysterious cloaked figure approaches, pressing a sealed letter into your hand before disappearing into the crowd.",
    "You find yourself in the throne room of a grand castle. Stained glass windows cast colorful light across marble floors. The king sits upon his throne, looking worried. 'Bandits have taken over the mountain pass,' he says. 'Will you help us?'",
    "Cold rain pelts your face as you trudge through muddy streets of a frontier town. The wooden buildings are weathered and worn. A sheriff's star glints from the local lawman's chest as he nails a 'WANTED' poster to a post. The mines in the nearby hills have gone silent.",
    "You emerge from underground tunnels into a massive dwarven city carved from living stone. Forges glow with molten metal, and the sound of hammers on anvils echoes through vast halls. The clan leader greets you: 'Dark things stir in the deep mines. We need brave souls.'",
    "The desert sun beats down mercilessly as you approach an oasis town. Palm trees provide shade around a central well. Market stalls sell exotic spices and silks. An old fortune teller beckons you closer: 'The ancient tomb has been unsealed. Grave danger approaches.'",
    "Snow crunches under your boots as you stand before a mountain monastery. Monks in simple robes train in martial arts in the courtyard. The master approaches: 'A sacred relic has been stolen. Track the thieves through the frozen peaks and retrieve what was taken.'",
    "You stand at the edge of a massive swamp. Twisted trees rise from murky water, and strange lights flicker in the fog. A riverside village huddles on stilts. The elder speaks: 'Children have gone missing in the wetlands. Something ancient hunts in the mist.'",
    "Lightning illuminates a gothic mansion atop a hill. Rain lashes against tall windows. You've been invited to a nobleman's estate for the reading of a will, but as you enter, the doors slam shut behind you. Portraits on the walls seem to watch your every move.",
    "You wake under the stars in endless grasslands. Your horse grazes nearby. In the distance, you see the campfires of a nomadic caravan. Riders approach on swift horses: 'We found you unconscious. Raiders attacked the trade route. Will you ride with us to stop them?'",
    "The jungle is alive with sounds as you hack through dense vegetation. Ancient stone ruins peek through the foliage. Vines cover carved faces and forgotten statues. Your guide points: 'The lost city lies ahead. Treasures beyond measure, but also ancient guardians that never sleep.'",
    "You stand in a bustling marketplace in a city of floating islands connected by bridges. Airships dock at platforms in the sky. A desperate merchant grabs your arm: 'Sky pirates stole my cargo ship! It's headed to their fortress on the Storm Islands. Please help!'",
  ];

  const handleRandomCampaign = () => {
    const randomIndex = Math.floor(Math.random() * randomCampaigns.length);
    setCampaignPrompt(randomCampaigns[randomIndex]);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background p-6">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col gap-4">
        <div className="shrink-0 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Campaign Setup</h1>
          <p className="mt-2 text-foreground/70">
            Describe your adventure and create your character
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto rounded-lg border border-foreground/10 bg-foreground/5 p-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-semibold">Campaign Setting</label>
              <button
                onClick={handleRandomCampaign}
                className="rounded border border-foreground/20 bg-foreground/5 px-3 py-1 text-xs font-medium transition-colors hover:bg-foreground/10"
              >
                🎲 Random Campaign
              </button>
            </div>
            <textarea
              value={campaignPrompt}
              onChange={(e) => setCampaignPrompt(e.target.value)}
              className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              rows={4}
              placeholder="Describe the starting scene, setting, and tone of your adventure..."
            />
          </div>

          <div>
            <h2 className="mb-4 text-lg font-semibold">Character Sheet</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-foreground/70">Name</label>
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-foreground/70">Level</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={character.level}
                    onChange={(e) => setCharacter({ ...character, level: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-foreground/70">Character Photo (URL)</label>
                <input
                  type="text"
                  value={characterPhoto}
                  onChange={(e) => setCharacterPhoto(e.target.value)}
                  className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  placeholder="https://example.com/character-portrait.jpg"
                />
                {characterPhoto && (
                  <div className="mt-3 flex justify-center">
                    <div className="relative h-32 w-32 overflow-hidden rounded-lg border-2 border-foreground/20">
                      <img
                        src={characterPhoto}
                        alt="Character portrait"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-foreground/70">Character Description</label>
                <textarea
                  value={characterDescription}
                  onChange={(e) => setCharacterDescription(e.target.value)}
                  className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  rows={3}
                  placeholder="Describe your character's appearance, personality, backstory, or goals..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-foreground/70">Max HP</label>
                  <input
                    type="number"
                    min="1"
                    value={character.maxHp}
                    onChange={(e) => {
                      const maxHp = parseInt(e.target.value) || 1;
                      setCharacter({ ...character, maxHp, hp: Math.min(character.hp, maxHp) });
                    }}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-foreground/70">Armor Class (AC)</label>
                  <input
                    type="number"
                    min="1"
                    value={character.ac}
                    onChange={(e) => setCharacter({ ...character, ac: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Ability Scores</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(character.abilityScores).map(([ability, value]) => (
                    <div key={ability} className="rounded-md border border-foreground/10 bg-background p-3">
                      <label className="mb-1 block text-xs uppercase text-foreground/70">{ability}</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={value}
                        onChange={(e) =>
                          handleAbilityChange(ability as keyof typeof character.abilityScores, parseInt(e.target.value) || 1)
                        }
                        className="w-full border-0 bg-transparent text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Inventory</label>
                <div className="space-y-2">
                  {(character.inventory || []).map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const newInventory = [...(character.inventory || [])];
                          newInventory[idx] = { ...item, name: e.target.value };
                          setCharacter({ ...character, inventory: newInventory });
                        }}
                        className="flex-1 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newInventory = [...(character.inventory || [])];
                          newInventory[idx] = { ...item, quantity: parseInt(e.target.value) || 1 };
                          setCharacter({ ...character, inventory: newInventory });
                        }}
                        className="w-20 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        placeholder="Qty"
                      />
                      <button
                        onClick={() => {
                          const newInventory = (character.inventory || []).filter((_, i) => i !== idx);
                          setCharacter({ ...character, inventory: newInventory });
                        }}
                        className="rounded-md border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setCharacter({
                        ...character,
                        inventory: [...(character.inventory || []), { name: "", quantity: 1 }],
                      });
                    }}
                    className="w-full rounded-md border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
                  >
                    + Add Item
                  </button>
                  <div className="mt-2 text-xs text-foreground/70">
                    Quick add: 
                    <button 
                      onClick={() => setCharacter({ ...character, inventory: [...(character.inventory || []), { name: "Health Potion", quantity: 1, effect: { type: "heal", amount: 10 }, description: "Restores 10 HP" }] })}
                      className="ml-2 rounded border border-foreground/10 px-2 py-0.5 hover:bg-foreground/5"
                    >
                      Potion
                    </button>
                    <button 
                      onClick={() => setCharacter({ ...character, inventory: [...(character.inventory || []), { name: "Mana Potion", quantity: 1, effect: { type: "mana", amount: 2 }, description: "Restores 2 spell slot levels" }] })}
                      className="ml-1 rounded border border-foreground/10 px-2 py-0.5 hover:bg-foreground/5"
                    >
                      Mana
                    </button>
                    <button 
                      onClick={() => setCharacter({ ...character, inventory: [...(character.inventory || []), { name: "Torch", quantity: 3, description: "Provides light" }] })}
                      className="ml-1 rounded border border-foreground/10 px-2 py-0.5 hover:bg-foreground/5"
                    >
                      Torch
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Spells</label>
                <div className="space-y-2">
                  {(character.spells || []).map((spell, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={spell.name}
                        onChange={(e) => {
                          const newSpells = [...(character.spells || [])];
                          newSpells[idx] = { ...spell, name: e.target.value };
                          setCharacter({ ...character, spells: newSpells });
                        }}
                        className="flex-1 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        placeholder="Spell name"
                      />
                      <input
                        type="number"
                        min="0"
                        max="9"
                        value={spell.level}
                        onChange={(e) => {
                          const newSpells = [...(character.spells || [])];
                          newSpells[idx] = { ...spell, level: parseInt(e.target.value) || 0 };
                          setCharacter({ ...character, spells: newSpells });
                        }}
                        className="w-20 rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                        placeholder="Lvl"
                      />
                      <button
                        onClick={() => {
                          const newSpells = (character.spells || []).filter((_, i) => i !== idx);
                          setCharacter({ ...character, spells: newSpells });
                        }}
                        className="rounded-md border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setCharacter({
                        ...character,
                        spells: [...(character.spells || []), { name: "", level: 0 }],
                      });
                    }}
                    className="w-full rounded-md border border-foreground/10 px-3 py-2 text-sm hover:bg-foreground/5"
                  >
                    + Add Spell
                  </button>
                  <div className="mt-2 text-xs text-foreground/70">
                    Quick add:
                    <button 
                      onClick={() => setCharacter({ ...character, spells: [...(character.spells || []), { name: "Cure Wounds", level: 1, effect: { type: "heal", amount: 8 }, description: "Level 1 - Heals 8 HP" }] })}
                      className="ml-2 rounded border border-foreground/10 px-2 py-0.5 hover:bg-foreground/5"
                    >
                      Heal
                    </button>
                    <button 
                      onClick={() => setCharacter({ ...character, spells: [...(character.spells || []), { name: "Burning Hands", level: 1, effect: { type: "damage", amount: 12, damageType: "fire" }, description: "Level 1 - 12 fire damage" }] })}
                      className="ml-1 rounded border border-foreground/10 px-2 py-0.5 hover:bg-foreground/5"
                    >
                      Fire
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={isLoading}
          className="shrink-0 rounded-md bg-foreground px-6 py-3 font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Generating Map..." : "Start Adventure"}
        </button>
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-foreground/10 bg-background p-8 shadow-2xl">
            <div className="flex gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-foreground" style={{ animationDelay: "0ms" }}></div>
              <div className="h-3 w-3 animate-pulse rounded-full bg-foreground" style={{ animationDelay: "150ms" }}></div>
              <div className="h-3 w-3 animate-pulse rounded-full bg-foreground" style={{ animationDelay: "300ms" }}></div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">Generating Your World...</div>
              <div className="mt-2 text-sm text-foreground/70">
                Creating themed rooms and features based on your campaign
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
