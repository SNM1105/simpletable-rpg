import type { Rng } from "@/lib/rules/random/rng";
import { rollDie, rollDice, rollD20, type RollType } from "@/lib/rules/dice";
import { abilityMod, skillCheckBonus } from "@/lib/rules/dnd5e/srd";
import type { Ability, Skill } from "@/lib/rules/dnd5e/types";
import type { EngineEvent } from "@/lib/game/events";
import { proficiencyBonus, getHPStatus } from "@/lib/rules/dnd5eHelpers";
import {
  tileAt,
  type GameState,
  type GameLogItem,
  type Combatant,
} from "@/lib/game/state";

export type PlayerCommand =
  | { kind: "look" }
  | { kind: "move"; dir: "n" | "s" | "e" | "w" }
  | { kind: "moveTo"; x: number; y: number }
  | { kind: "attack"; target: "nearest" }
  | { kind: "focus"; targetName: string }
  | { kind: "check"; ability: Ability }
  | { kind: "skill"; skill: Skill }
  | { kind: "roll"; count: number; sides: number; modifier: number }
  | { kind: "combatStart" }
  | { kind: "combatEnd" }
  | { kind: "useItem"; itemName: string }
  | { kind: "castSpell"; spellName: string }
  | { kind: "loot" }
  | { kind: "rest" }
  | { kind: "breakWall"; dir: "n" | "s" | "e" | "w" }
  | { kind: "openDoor" }
  | { kind: "openChest" }
  | { kind: "searchSecret" }
  | { kind: "unknown"; raw: string };

export type EngineResult = {
  nextState: GameState;
  events: EngineEvent[];
};

function appendLog(state: GameState, item: Omit<GameLogItem, "id" | "at">): GameState {
  const at = Date.now();
  const id = `${at}-${state.log.length}`;
  return { ...state, time: at, log: [...state.log, { ...item, id, at }] };
}

function startCombat(state: GameState, rng: Rng): { nextState: GameState; events: EngineEvent[] } {
  if (state.combat.active) {
    return { nextState: state, events: [{ type: "Bumped", reason: "Combat is already active." }] };
  }

  const pc = state.creatures[state.playerId];
  
  // Find all living enemies
  const enemies = Object.values(state.creatures).filter(
    c => c.id !== state.playerId && c.hp > 0
  );
  
  if (enemies.length === 0) {
    return { nextState: state, events: [{ type: "Bumped", reason: "No enemies to fight." }] };
  }

  // Roll initiative for everyone
  const events: EngineEvent[] = [];
  
  const pcInitRoll = rollD20(rng, "normal");
  const pcInit = pcInitRoll.result + abilityMod(pc.abilityScores.dex);
  
  events.push({
    type: "Dice",
    entry: {
      label: `${pc.name} initiative`,
      rolls: [{ sides: 20, result: pcInitRoll.result }],
      total: pcInit,
      rollType: "normal",
      wasCritical: pcInitRoll.wasCritical,
      wasCriticalFail: pcInitRoll.wasCriticalFail,
    },
  });
  
  const combatants: Combatant[] = [{ creatureId: pc.id, initiative: pcInit }];
  
  for (const enemy of enemies) {
    const enemyInitRoll = rollD20(rng, "normal");
    const enemyInit = enemyInitRoll.result + abilityMod(enemy.abilityScores.dex);
    
    events.push({
      type: "Dice",
      entry: {
        label: `${enemy.name} initiative`,
        rolls: [{ sides: 20, result: enemyInitRoll.result }],
        total: enemyInit,
        rollType: "normal",
        wasCritical: enemyInitRoll.wasCritical,
        wasCriticalFail: enemyInitRoll.wasCriticalFail,
      },
    });
    
    combatants.push({ creatureId: enemy.id, initiative: enemyInit });
  }

  // Sort by initiative (highest first)
  const order = combatants.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    // Tie-breaker: player first
    if (a.creatureId === pc.id) return -1;
    if (b.creatureId === pc.id) return 1;
    return 0;
  });

  const nextState: GameState = {
    ...state,
    combat: {
      active: true,
      round: 1,
      turnIndex: 0,
      order,
    },
  };

  events.push({ type: "CombatStarted" });

  return { nextState, events };
}

function endCombat(state: GameState): { nextState: GameState; events: EngineEvent[] } {
  if (!state.combat.active) {
    return { nextState: state, events: [{ type: "Bumped", reason: "Combat is not active." }] };
  }
  return {
    nextState: { ...state, combat: { active: false, round: 0, turnIndex: 0, order: [] } },
    events: [{ type: "CombatEnded" }],
  };
}

function currentTurnCreatureId(state: GameState): string | undefined {
  if (!state.combat.active) return undefined;
  return state.combat.order[state.combat.turnIndex]?.creatureId;
}

function advanceTurn(state: GameState): GameState {
  if (!state.combat.active || state.combat.order.length === 0) return state;
  const nextIndex = state.combat.turnIndex + 1;
  if (nextIndex < state.combat.order.length) {
    return { ...state, combat: { ...state.combat, turnIndex: nextIndex } };
  }
  return { ...state, combat: { ...state.combat, round: state.combat.round + 1, turnIndex: 0 } };
}

function inferSkillFromText(raw: string): Skill | null {
  const r = ` ${raw} `;
  // Keep this intentionally simple and deterministic. No LLM mechanics.
  if (/(^|\W)(hide|sneak|stealth)(\W|$)/.test(r)) return "stealth";
  if (/(^|\W)(pickpocket|palm|sleight)(\W|$)/.test(r)) return "sleightOfHand";
  if (/(^|\W)(pick\s+lock|lockpick)(\W|$)/.test(r)) return "sleightOfHand";
  if (/(^|\W)(climb|swim|jump|grapple|shove|lift|push|kick|bash|break|force|ram|smash)(\W|$)/.test(r)) return "athletics";
  if (/(^|\W)(balance|tumble|flip|dodge|vault)(\W|$)/.test(r)) return "acrobatics";
  if (/(^|\W)(search|investigate|inspect|examine)(\W|$)/.test(r)) return "investigation";
  if (/(^|\W)(listen|spot|look\s+around|perceive|watch)(\W|$)/.test(r)) return "perception";
  if (/(^|\W)(track|forage|navigate|survive)(\W|$)/.test(r)) return "survival";
  if (/(^|\W)(treat|heal|stitch|bandage)(\W|$)/.test(r)) return "medicine";
  if (/(^|\W)(convince|persuade|negotiate|charm|plead)(\W|$)/.test(r)) return "persuasion";
  if (/(^|\W)(lie|deceive|bluff)(\W|$)/.test(r)) return "deception";
  if (/(^|\W)(threaten|intimidate|coerce)(\W|$)/.test(r)) return "intimidation";
  if (/(^|\W)(insight|read\s+them|sense\s+motive)(\W|$)/.test(r)) return "insight";
  if (/(^|\W)(perform|sing|dance|act)(\W|$)/.test(r)) return "performance";
  if (/(^|\W)(recall|remember|history)(\W|$)/.test(r)) return "history";
  if (/(^|\W)(arcana|magic|spellcraft)(\W|$)/.test(r)) return "arcana";
  if (/(^|\W)(nature|plants|beasts)(\W|$)/.test(r)) return "nature";
  if (/(^|\W)(religion|pray|divine)(\W|$)/.test(r)) return "religion";
  if (/(^|\W)(handle\s+animal|calm\s+animal)(\W|$)/.test(r)) return "animalHandling";
  return null;
}

function isProbablyLook(raw: string): boolean {
  return /(^|\W)(look|observe|scan|survey)(\W|$)/.test(` ${raw} `);
}

export function parsePlayerCommand(input: string): PlayerCommand {
  const raw = input.trim().toLowerCase();
  if (!raw) return { kind: "look" };

  // Parse coordinate references with priority to "to" over "from" for phrases like "moved from X to Y"
  // Match patterns: "at 13,9", "to square 5,10", "position (7,8)", "move to 15,6", etc.
  // For "from X to Y" patterns, we want the Y coordinates (after "to")
  const coordMatch = raw.match(/(?:^|\s)(?:to|at|position|square|tile|coordinates?|coord|move\s+to)\s*[:\(]?\s*(\d+)\s*[,\s]\s*(\d+)\s*\)?/);
  if (coordMatch) {
    const x = parseInt(coordMatch[1]);
    const y = parseInt(coordMatch[2]);
    if (!isNaN(x) && !isNaN(y) && x >= 0 && x < 25 && y >= 0 && y < 20) {
      console.log(`[parsePlayerCommand] Detected moveTo: (${x}, ${y}) from input: "${input}"`);
      return { kind: "moveTo", x, y };
    }
  }

  if (raw === "look" || raw === "l") return { kind: "look" };

  if (raw.startsWith("move ") || raw.startsWith("go ")) {
    const dirToken = raw.split(/\s+/)[1];
    const dir = dirToken?.[0];
    if (dir === "n") return { kind: "move", dir: "n" };
    if (dir === "s") return { kind: "move", dir: "s" };
    if (dir === "e") return { kind: "move", dir: "e" };
    if (dir === "w") return { kind: "move", dir: "w" };
  }

  if (raw === "n" || raw === "north") return { kind: "move", dir: "n" };
  if (raw === "s" || raw === "south") return { kind: "move", dir: "s" };
  if (raw === "e" || raw === "east") return { kind: "move", dir: "e" };
  if (raw === "w" || raw === "west") return { kind: "move", dir: "w" };

  // Attack recognition - matches natural language attack phrases
  // Includes weapon references and action verbs
  if (
    raw.startsWith("attack") ||
    /(\battack\b|\bstrike\b|\bhit\b|\bslash\b|\bstab\b|\bswing\b|\blunge\b|\bcharge\b|\bpunch\b|\bkick\b|\bshoot\b)/.test(raw) ||
    /(with my (sword|blade|weapon|axe|bow|dagger|staff|fist))/.test(raw) ||
    /(before (he|she|it|they) could)/.test(raw)
  ) {
    return { kind: "attack", target: "nearest" };
  }
  
  // Focus on enemy: "focus on goblin", "target the orc"
  if (/^(focus|target).*(on|the)\s+(.+)$/i.test(raw)) {
    const match = raw.match(/^(focus|target).*(on|the)\s+(.+)$/i);
    if (match) {
      const targetName = match[3].trim();
      return { kind: "focus", targetName };
    }
  }

  // Use item: "use [item]", "drink potion", "eat bread"
  if (raw.startsWith("use ") || raw.startsWith("drink ") || raw.startsWith("eat ") || raw.startsWith("consume ")) {
    const words = raw.split(/\s+/);
    const itemName = words.slice(1).join(" ");
    if (itemName) {
      return { kind: "useItem", itemName };
    }
  }

  // Cast spell: "cast [spell]"
  if (raw.startsWith("cast ")) {
    const spellName = raw.slice(5).trim();
    if (spellName) {
      return { kind: "castSpell", spellName };
    }
  }

  // Loot: "loot", "search body", "take loot"
  if (/(\bloot\b|\bsearch\s+body\b|\btake\s+loot\b)/.test(raw)) {
    return { kind: "loot" };
  }

  // Rest: "rest", "long rest", "short rest"
  if (/(\brest\b|\blong\s+rest\b|\bshort\s+rest\b)/.test(raw)) {
    return { kind: "rest" };
  }

  // Break wall: "break wall north", "smash the wall", "destroy stone"
  if (/(break|destroy|smash).*(wall|stone)/i.test(raw)) {
    if (/(north|up)/i.test(raw)) return { kind: "breakWall", dir: "n" };
    if (/(south|down)/i.test(raw)) return { kind: "breakWall", dir: "s" };
    if (/(east|right)/i.test(raw)) return { kind: "breakWall", dir: "e" };
    if (/(west|left)/i.test(raw)) return { kind: "breakWall", dir: "w" };
    return { kind: "breakWall", dir: "n" }; // default north
  }

  // Open door: "open door", "unlock door"
  if (/(open|unlock).*(door)/i.test(raw)) {
    return { kind: "openDoor" };
  }

  // Open chest: "open chest", "unlock chest", "search chest"
  if (/(open|unlock|search).*(chest|box)/i.test(raw)) {
    return { kind: "openChest" };
  }

  // Search for secrets: "search for secrets", "look for hidden passage"
  if (/(search|look\s+for|find).*(secret|hidden|passage)/i.test(raw)) {
    return { kind: "searchSecret" };
  }

  if (raw === "start combat" || raw === "combat start" || raw === "combat") {
    return { kind: "combatStart" };
  }

  if (raw === "end combat" || raw === "combat end") {
    return { kind: "combatEnd" };
  }

  const rollMatch = raw.match(/^roll\s+(\d+)d(\d+)([+-]\d+)?$/);
  if (rollMatch) {
    const count = Number(rollMatch[1]);
    const sides = Number(rollMatch[2]);
    const modifier = rollMatch[3] ? Number(rollMatch[3]) : 0;
    if (Number.isFinite(count) && Number.isFinite(sides) && Number.isFinite(modifier)) {
      return { kind: "roll", count, sides, modifier };
    }
  }

  if (raw.startsWith("check ")) {
    const tok = raw.split(/\s+/)[1];
    if (
      tok === "str" ||
      tok === "dex" ||
      tok === "con" ||
      tok === "int" ||
      tok === "wis" ||
      tok === "cha"
    ) {
      return { kind: "check", ability: tok };
    }
  }

  // Natural language inference: map common intents to a skill check.
  // Example: "I try to sneak past the guards" => Stealth check.
  const inferredSkill = inferSkillFromText(raw);
  if (inferredSkill) return { kind: "skill", skill: inferredSkill };

  // If it's basically a "look" intent, don't force a roll.
  if (isProbablyLook(raw)) return { kind: "look" };

  return { kind: "unknown", raw };
}

export function resolveCommand(state: GameState, rng: Rng, command: PlayerCommand): EngineResult {
  let nextState = state;
  const events: EngineEvent[] = [];

  if (command.kind === "look") {
    events.push({ type: "Look" });
    return { nextState, events };
  }

  if (command.kind === "combatStart") {
    return startCombat(state, rng);
  }

  if (command.kind === "combatEnd") {
    return endCombat(state);
  }

  if (command.kind === "roll") {
    const entry = rollDice(rng, `Roll ${command.count}d${command.sides}${command.modifier ? (command.modifier > 0 ? `+${command.modifier}` : `${command.modifier}`) : ""}`, command.sides, command.count);
    const total = entry.total + command.modifier;
    events.push({ type: "Dice", entry: { ...entry, total } });
    return { nextState, events };
  }

  if (command.kind === "move") {
    if (state.combat.active && currentTurnCreatureId(state) !== state.playerId) {
      events.push({ type: "Bumped", reason: "Not your turn." });
      return { nextState, events };
    }
    const delta =
      command.dir === "n"
        ? { dx: 0, dy: -1 }
        : command.dir === "s"
          ? { dx: 0, dy: 1 }
          : command.dir === "e"
            ? { dx: 1, dy: 0 }
            : { dx: -1, dy: 0 };

    const nx = state.playerPos.x + delta.dx;
    const ny = state.playerPos.y + delta.dy;
    const tile = tileAt(state.map, nx, ny);
    if (!tile || tile === "wall" || tile === "pillar") {
      events.push({ type: "Bumped", reason: "Blocked." });
      return { nextState, events };
    }

    const newPos = { x: nx, y: ny };
    nextState = { 
      ...state, 
      playerPos: newPos,
      creaturePositions: {
        ...state.creaturePositions,
        [state.playerId]: newPos,
      },
    };
    events.push({ type: "Moved", dx: delta.dx, dy: delta.dy });
    if (nextState.combat.active) nextState = advanceTurn(nextState);
    return { nextState, events };
  }

  if (command.kind === "moveTo") {
    if (state.combat.active && currentTurnCreatureId(state) !== state.playerId) {
      events.push({ type: "Bumped", reason: "Not your turn." });
      return { nextState, events };
    }

    const { x, y } = command;
    console.log(`[resolveCommand] moveTo command: (${x}, ${y}), current pos: (${state.playerPos.x}, ${state.playerPos.y})`);
    
    const tile = tileAt(state.map, x, y);
    console.log(`[resolveCommand] tile at (${x}, ${y}): ${tile}`);
    
    if (!tile || tile === "wall" || tile === "pillar" || tile === "water" || tile === "rock") {
      console.log(`[resolveCommand] Movement blocked - tile is ${tile}`);
      events.push({ type: "Bumped", reason: `Can't move to (${x}, ${y}) - blocked or impassable.` });
      return { nextState, events };
    }

    const dx = x - state.playerPos.x;
    const dy = y - state.playerPos.y;
    const newPos = { x, y };
    nextState = { 
      ...state, 
      playerPos: newPos,
      creaturePositions: {
        ...state.creaturePositions,
        [state.playerId]: newPos,
      },
    };
    console.log(`[resolveCommand] Player moved to (${x}, ${y}), creaturePositions updated:`, nextState.creaturePositions);
    events.push({ type: "Moved", dx, dy });
    
    // Check if player is at map edge and trigger expansion
    const edgeThreshold = 2; // Tiles from edge
    let expandDirection: "north" | "south" | "east" | "west" | null = null;
    
    if (x < edgeThreshold) {
      expandDirection = "west";
    } else if (x >= state.map.width - edgeThreshold) {
      expandDirection = "east";
    } else if (y < edgeThreshold) {
      expandDirection = "north";
    } else if (y >= state.map.height - edgeThreshold) {
      expandDirection = "south";
    }
    
    if (expandDirection) {
      console.log(`[resolveCommand] Player near ${expandDirection} edge, triggering expansion`);
      events.push({
        type: "MapEdgeReached",
        direction: expandDirection,
        playerPos: newPos,
      });
    }
    
    if (nextState.combat.active) nextState = advanceTurn(nextState);
    return { nextState, events };
  }

  if (command.kind === "check") {
    if (state.combat.active && currentTurnCreatureId(state) !== state.playerId) {
      events.push({ type: "Bumped", reason: "Not your turn." });
      return { nextState, events };
    }
    const pc = state.creatures[state.playerId];
    const rollType: RollType = "normal"; // TODO: check conditions for advantage/disadvantage
    const { result: d20, wasCritical, wasCriticalFail, rolls } = rollD20(rng, rollType);
    const mod = abilityMod(pc.abilityScores[command.ability]);
    const total = d20 + mod;
    events.push({
      type: "Dice",
      entry: { 
        label: `${command.ability.toUpperCase()} check`, 
        rolls: rolls.map(r => ({ sides: 20, result: r })),
        total,
        rollType,
        wasCritical,
        wasCriticalFail,
      },
    });
    if (nextState.combat.active) nextState = advanceTurn(nextState);
    return { nextState, events };
  }

  if (command.kind === "skill") {
    if (state.combat.active && currentTurnCreatureId(state) !== state.playerId) {
      events.push({ type: "Bumped", reason: "Not your turn." });
      return { nextState, events };
    }

    const pc = state.creatures[state.playerId];
    const rollType: RollType = "normal"; // TODO: check conditions for advantage/disadvantage
    const { result: d20, wasCritical, wasCriticalFail, rolls } = rollD20(rng, rollType);
    const bonus = skillCheckBonus({
      abilityScores: pc.abilityScores,
      skill: command.skill,
      level: pc.level,
      proficient: pc.proficientSkills.includes(command.skill),
    });
    const total = d20 + bonus;
    events.push({
      type: "Dice",
      entry: {
        label: `${command.skill} check`,
        rolls: rolls.map(r => ({ sides: 20, result: r })),
        total,
        rollType,
        wasCritical,
        wasCriticalFail,
      },
    });

    if (nextState.combat.active) nextState = advanceTurn(nextState);
    return { nextState, events };
  }

  if (command.kind === "attack") {
    if (!state.combat.active) {
      const started = startCombat(state, rng);
      nextState = started.nextState;
      events.push(...started.events);
    }

    if (nextState.combat.active && currentTurnCreatureId(nextState) !== nextState.playerId) {
      events.push({ type: "Bumped", reason: "Not your turn." });
      return { nextState, events };
    }

    // Find target - use focused enemy if set, otherwise nearest living enemy
    const pc = nextState.creatures[nextState.playerId];
    const enemies = Object.values(nextState.creatures).filter(
      c => c.id !== nextState.playerId && c.hp > 0
    );
    
    if (enemies.length === 0) {
      events.push({ type: "Bumped", reason: "No enemies to attack." });
      return { nextState, events };
    }
    
    let target = enemies[0];
    
    // If we have a focused enemy, use that instead
    if (nextState.focusedEnemyId) {
      const focusedEnemy = nextState.creatures[nextState.focusedEnemyId];
      if (focusedEnemy && focusedEnemy.hp > 0) {
        target = focusedEnemy;
      } else {
        // Clear focused enemy if it's dead
        nextState = { ...nextState, focusedEnemyId: undefined };
      }
    }

    // Use rollD20 for advantage/disadvantage support and critical detection
    const rollType: RollType = "normal"; // TODO: check conditions for advantage/disadvantage
    const { result: attackRoll, wasCritical, wasCriticalFail, rolls } = rollD20(rng, rollType);
    const attackBonus = proficiencyBonus(pc.level) + abilityMod(pc.abilityScores.str); // melee with proficiency
    const toHit = attackRoll + attackBonus;

    events.push({
      type: "Dice",
      entry: {
        label: `Attack ${target.name} vs AC ${target.ac}`,
        rolls: rolls.map(r => ({ sides: 20, result: r })),
        total: toHit,
        rollType,
        wasCritical,
        wasCriticalFail,
      },
    });

    const hit = wasCritical || (!wasCriticalFail && toHit >= target.ac);
    console.log('[Engine] Attack result - hit:', hit, 'toHit:', toHit, 'target AC:', target.ac, 'crit:', wasCritical, 'critFail:', wasCriticalFail);
    if (!hit) {
      events.push({ type: "AttackResolved", targetName: target.name, hit: false, wasCritical: false });
      nextState = advanceTurn(nextState);
      return { nextState, events };
    }

    // Critical hit doubles damage dice
    const damageRollCount = wasCritical ? 2 : 1;
    const dmgEntry = rollDice(rng, `Damage (${damageRollCount}d8)${wasCritical ? " CRITICAL!" : ""}`, 8, damageRollCount);
    events.push({ type: "Dice", entry: dmgEntry });
    console.log('[Engine] Damage dealt:', dmgEntry.total, 'to', target.name, 'current HP:', target.hp);

    const nextHp = Math.max(0, target.hp - dmgEntry.total);
    console.log('[Engine] Next HP:', nextHp);
    nextState = {
      ...nextState,
      creatures: {
        ...nextState.creatures,
        [target.id]: { ...target, hp: nextHp },
      },
    };

    events.push({
      type: "AttackResolved",
      targetName: target.name,
      hit: true,
      damage: dmgEntry.total,
      wasCritical,
    });

    // Check if target is reduced to 0 HP
    if (nextHp <= 0) {
      // Check if target is a player character (should go unconscious instead of dying)
      const isPC = target.id === nextState.playerId;
      
      if (isPC) {
        // Player goes unconscious and starts death saves
        nextState = {
          ...nextState,
          creatures: {
            ...nextState.creatures,
            [target.id]: {
              ...target,
              hp: 0,
              isUnconscious: true,
              deathSaves: {
                successes: 0,
                failures: 0,
                isStabilized: false,
              },
            },
          },
        };
        events.push({
          type: "CreatureUnconscious",
          creatureName: target.name,
          creatureId: target.id,
        });
      } else {
        // NPCs die immediately at 0 HP
        events.push({
          type: "CreatureDied",
          creatureName: target.name,
          creatureId: target.id,
        });
      }
      
      // End combat if all enemies are dead
      const allEnemiesDead = Object.values(nextState.creatures).every(c => 
        c.id === nextState.playerId || c.hp <= 0
      );
      
      if (nextState.combat.active && allEnemiesDead) {
        const ended = endCombat(nextState);
        nextState = ended.nextState;
        events.push(...ended.events);
        return { nextState, events };
      }
    }

    if (nextState.combat.active) nextState = advanceTurn(nextState);

    return { nextState, events };
  }

  if (command.kind === "useItem") {
    if (state.combat.active && currentTurnCreatureId(state) !== state.playerId) {
      events.push({ type: "Bumped", reason: "Not your turn." });
      return { nextState, events };
    }

    const pc = state.creatures[state.playerId];
    const itemName = command.itemName.toLowerCase();
    const item = pc.inventory?.find(i => i.name.toLowerCase().includes(itemName));

    if (!item || item.quantity <= 0) {
      events.push({ type: "Bumped", reason: `You don't have any ${command.itemName}.` });
      return { nextState, events };
    }

    // Apply item effect
    let effectApplied = false;
    let updatedPc = { ...pc };

    if (item.effect) {
      effectApplied = true;
      if (item.effect.type === "heal") {
        const newHp = Math.min(pc.maxHp, pc.hp + item.effect.amount);
        const healed = newHp - pc.hp;
        updatedPc.hp = newHp;
        events.push({ type: "ItemUsed", itemName: item.name, effect: `Healed ${healed} HP` });
      } else if (item.effect.type === "mana") {
        // Restore spell slots (simplified - restores lowest level slots first)
        if (updatedPc.spellSlots) {
          let remaining = item.effect.amount;
          for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
            if (remaining <= 0) break;
            const slots = updatedPc.spellSlots[level];
            const canRestore = Math.min(remaining, slots.max - slots.current);
            if (canRestore > 0) {
              updatedPc.spellSlots[level] = { ...slots, current: slots.current + canRestore };
              remaining -= canRestore;
            }
          }
          events.push({ type: "ItemUsed", itemName: item.name, effect: `Restored spell slots` });
        }
      } else if (item.effect.type === "condition") {
        // Add condition to character
        const newCondition = { name: item.effect.name, description: item.description || "", duration: item.effect.duration };
        updatedPc.conditions = [...(updatedPc.conditions || []), newCondition];
        events.push({ type: "ItemUsed", itemName: item.name, effect: `Gained condition: ${item.effect.name}` });
      }
    } else {
      events.push({ type: "ItemUsed", itemName: item.name, effect: item.description || "Used" });
    }

    // Consume one of the item
    const updatedInventory = updatedPc.inventory?.map(i =>
      i.name === item.name ? { ...i, quantity: i.quantity - 1 } : i
    ).filter(i => i.quantity > 0);

    updatedPc.inventory = updatedInventory;

    nextState = {
      ...nextState,
      creatures: { ...nextState.creatures, [pc.id]: updatedPc },
    };

    if (nextState.combat.active) nextState = advanceTurn(nextState);
    return { nextState, events };
  }

  if (command.kind === "castSpell") {
    if (state.combat.active && currentTurnCreatureId(state) !== state.playerId) {
      events.push({ type: "Bumped", reason: "Not your turn." });
      return { nextState, events };
    }

    const pc = state.creatures[state.playerId];
    const spellName = command.spellName.toLowerCase();
    const spell = pc.spells?.find(s => s.name.toLowerCase().includes(spellName));

    if (!spell) {
      events.push({ type: "Bumped", reason: `You don't know the spell ${command.spellName}.` });
      return { nextState, events };
    }

    if (!pc.spellSlots) {
      events.push({ type: "Bumped", reason: "You have no spell slots." });
      return { nextState, events };
    }

    const level = spell.level as keyof typeof pc.spellSlots;
    const slots = pc.spellSlots[level];

    if (!slots || slots.current <= 0) {
      events.push({ type: "Bumped", reason: `No level ${spell.level} spell slots remaining.` });
      return { nextState, events };
    }

    // Consume spell slot
    let updatedPc = { ...pc };
    if (updatedPc.spellSlots) {
      updatedPc.spellSlots = {
        ...updatedPc.spellSlots,
        [level]: { ...slots, current: slots.current - 1 },
      };
    }

    // Apply spell effect
    if (spell.effect) {
      if (spell.effect.type === "damage") {
        // Use focused enemy or find nearest
        let target = state.focusedEnemyId ? state.creatures[state.focusedEnemyId] : null;
        
        if (!target || target.hp <= 0) {
          // Find nearest alive enemy
          const enemies = Object.values(state.creatures).filter(
            c => c.id !== state.playerId && c.hp > 0
          );
          
          if (enemies.length > 0) {
            const pcPos = state.playerPos;
            target = enemies.reduce((nearest, enemy) => {
              const enemyPos = state.creaturePositions[enemy.id];
              const nearestPos = state.creaturePositions[nearest.id];
              if (!enemyPos) return nearest;
              if (!nearestPos) return enemy;
              
              const enemyDist = Math.abs(enemyPos.x - pcPos.x) + Math.abs(enemyPos.y - pcPos.y);
              const nearestDist = Math.abs(nearestPos.x - pcPos.x) + Math.abs(nearestPos.y - pcPos.y);
              return enemyDist < nearestDist ? enemy : nearest;
            });
          }
        }
        
        if (target && target.hp > 0) {
          const damage = spell.effect.amount;
          console.log('[Engine] Spell damage:', damage, 'to', target.name, 'current HP:', target.hp);
          const newHp = Math.max(0, target.hp - damage);
          console.log('[Engine] New HP:', newHp);
          nextState = {
            ...nextState,
            creatures: {
              ...nextState.creatures,
              [target.id]: { ...target, hp: newHp },
            },
          };
          events.push({ type: "SpellCast", spellName: spell.name, effect: `Dealt ${damage} ${spell.effect.damageType} damage to ${target.name}` });
          
          if (newHp <= 0 && nextState.combat.active) {
            const ended = endCombat(nextState);
            nextState = ended.nextState;
            events.push(...ended.events);
          }
        } else {
          events.push({ type: "Bumped", reason: "No valid target for the spell." });
        }
      } else if (spell.effect.type === "heal") {
        const newHp = Math.min(pc.maxHp, updatedPc.hp + spell.effect.amount);
        const healed = newHp - updatedPc.hp;
        updatedPc.hp = newHp;
        events.push({ type: "SpellCast", spellName: spell.name, effect: `Healed ${healed} HP` });
      } else if (spell.effect.type === "utility") {
        events.push({ type: "SpellCast", spellName: spell.name, effect: spell.effect.description });
      }
    } else {
      events.push({ type: "SpellCast", spellName: spell.name, effect: spell.description || "Cast successfully" });
    }

    nextState = {
      ...nextState,
      creatures: { ...nextState.creatures, [pc.id]: updatedPc },
    };

    if (nextState.combat.active) nextState = advanceTurn(nextState);
    return { nextState, events };
  }

  if (command.kind === "focus") {
    // Find enemy by name (case-insensitive)
    const targetEnemy = Object.values(state.creatures).find(
      c => c.id !== state.playerId && 
           c.hp > 0 && 
           c.name.toLowerCase().includes(command.targetName.toLowerCase())
    );
    
    if (!targetEnemy) {
      events.push({ type: "Bumped", reason: `Can't find ${command.targetName}.` });
      return { nextState, events };
    }
    
    nextState = { ...nextState, focusedEnemyId: targetEnemy.id };
    // Don't add any event - this is a silent UI-only action
    return { nextState, events };
  }

  if (command.kind === "loot") {
    const pc = state.creatures[state.playerId];
    const goblin = state.creatures["npc-1"];

    if (!goblin || goblin.hp > 0) {
      events.push({ type: "Bumped", reason: "There's nothing to loot here." });
      return { nextState, events };
    }

    if (!goblin.lootTable || goblin.lootTable.length === 0) {
      events.push({ type: "Looted", items: [], message: "The body has nothing of value." });
      return { nextState, events };
    }

    // Transfer loot to player
    let updatedPc = { ...pc };
    const currentInventory = updatedPc.inventory || [];
    const lootedItems: string[] = [];

    for (const lootItem of goblin.lootTable) {
      const existingItem = currentInventory.find(i => i.name === lootItem.name);
      if (existingItem) {
        existingItem.quantity += lootItem.quantity;
      } else {
        currentInventory.push({ ...lootItem });
      }
      lootedItems.push(`${lootItem.name} x${lootItem.quantity}`);
    }

    updatedPc.inventory = currentInventory;

    // Clear loot table
    const updatedGoblin = { ...goblin, lootTable: [] };

    nextState = {
      ...nextState,
      creatures: {
        ...nextState.creatures,
        [pc.id]: updatedPc,
        [goblin.id]: updatedGoblin,
      },
    };

    events.push({ type: "Looted", items: lootedItems, message: `You looted: ${lootedItems.join(", ")}` });
    return { nextState, events };
  }

  if (command.kind === "openChest") {
    const { x, y } = state.playerPos;
    const adjacent = [
      { x: x, y: y - 1 },
      { x: x, y: y + 1 },
      { x: x - 1, y: y },
      { x: x + 1, y: y },
    ];

    for (const pos of adjacent) {
      const tile = tileAt(state.map, pos.x, pos.y);
      if (tile === "chest") {
        const goldRoll = rollDice(rng, "Chest Gold", 20, 3);
        const gold = goldRoll.total;
        events.push({ type: "Dice", entry: goldRoll });

        const pc = state.creatures[state.playerId];
        const newInventory = [...(pc.inventory || [])];
        const lootedItems: string[] = [];
        
        lootedItems.push(`Gold Coins x${gold}`);
        newInventory.push({
          name: "Gold Coins",
          quantity: gold,
          description: `${gold} gold coins from the chest`,
        });

        const itemRoll = rollDie(rng, 20);
        events.push({ type: "Dice", entry: { label: "Item Check", rolls: [{ sides: 20, result: itemRoll }], total: itemRoll } });
        if (itemRoll >= 15) {
          lootedItems.push("Health Potion x1");
          newInventory.push({
            name: "Health Potion",
            quantity: 1,
            effect: { type: "heal", amount: 10 },
            description: "Restores 10 HP",
          });
        }

        const newTiles = [...state.map.tiles];
        newTiles[pos.y * state.map.width + pos.x] = "floor";

        nextState = {
          ...nextState,
          map: { ...nextState.map, tiles: newTiles },
          creatures: {
            ...nextState.creatures,
            [state.playerId]: { ...pc, inventory: newInventory },
          },
        };

        events.push({
          type: "Looted",
          items: lootedItems,
          message: `Opened chest and found: ${lootedItems.join(", ")}`,
        });

        return { nextState, events };
      }
    }

    events.push({ type: "Bumped", reason: "There's no chest nearby to open." });
    return { nextState, events };
  }

  if (command.kind === "openDoor") {
    const { x, y } = state.playerPos;
    const adjacent = [
      { pos: { x: x, y: y - 1 }, dir: "north" as const },
      { pos: { x: x, y: y + 1 }, dir: "south" as const },
      { pos: { x: x - 1, y: y }, dir: "west" as const },
      { pos: { x: x + 1, y: y }, dir: "east" as const },
    ];

    for (const { pos, dir } of adjacent) {
      const tile = tileAt(state.map, pos.x, pos.y);
      if (tile === "door") {
        // Check what's beyond the door
        const beyondX = dir === "east" ? pos.x + 1 : dir === "west" ? pos.x - 1 : pos.x;
        const beyondY = dir === "south" ? pos.y + 1 : dir === "north" ? pos.y - 1 : pos.y;
        const beyondTile = tileAt(state.map, beyondX, beyondY);
        
        // If there's a wall or nothing beyond the door, trigger map expansion
        if (!beyondTile || beyondTile === "wall") {
          // Return a special event that will be handled asynchronously
          events.push({
            type: "DoorNeedsExpansion",
            doorPos: pos,
            direction: dir,
          });
          
          // Still open the door
          const newTiles = [...state.map.tiles];
          newTiles[pos.y * state.map.width + pos.x] = "floor";

          nextState = {
            ...nextState,
            map: { ...nextState.map, tiles: newTiles },
          };

          events.push({
            type: "MapModified",
            action: "opened door",
            x: pos.x,
            y: pos.y,
            oldTile: "door",
            newTile: "floor",
          });

          return { nextState, events };
        }
        
        // Normal door opening (leads to existing area)
        const newTiles = [...state.map.tiles];
        newTiles[pos.y * state.map.width + pos.x] = "floor";

        nextState = {
          ...nextState,
          map: { ...nextState.map, tiles: newTiles },
        };

        events.push({
          type: "MapModified",
          action: "opened door",
          x: pos.x,
          y: pos.y,
          oldTile: "door",
          newTile: "floor",
        });

        return { nextState, events };
      }
    }

    events.push({ type: "Bumped", reason: "There's no door nearby to open." });
    return { nextState, events };
  }

  if (command.kind === "breakWall") {
    const { x, y } = state.playerPos;
    const targetX = command.dir === "e" ? x + 1 : command.dir === "w" ? x - 1 : x;
    const targetY = command.dir === "n" ? y - 1 : command.dir === "s" ? y + 1 : y;

    const targetTile = tileAt(state.map, targetX, targetY);

    if (!targetTile || targetTile !== "wall") {
      events.push({ type: "Bumped", reason: "There's no wall there to break." });
      return { nextState, events };
    }

    const pc = state.creatures[state.playerId];
    const strMod = abilityMod(pc.abilityScores.str);
    const roll = rollDie(rng, 20);
    const total = roll + strMod;
    const dc = 15;

    events.push({
      type: "Dice",
      entry: {
        label: `Break Wall (STR DC ${dc})`,
        rolls: [{ sides: 20, result: roll }],
        total,
      },
    });

    if (total >= dc) {
      const newTiles = [...state.map.tiles];
      newTiles[targetY * state.map.width + targetX] = "floor";

      nextState = {
        ...nextState,
        map: { ...nextState.map, tiles: newTiles },
      };

      events.push({
        type: "MapModified",
        action: "broke through the wall",
        x: targetX,
        y: targetY,
        oldTile: "wall",
        newTile: "floor",
      });
    }

    return { nextState, events };
  }

  if (command.kind === "searchSecret") {
    const pc = state.creatures[state.playerId];
    const wisMod = abilityMod(pc.abilityScores.wis);
    const roll = rollDie(rng, 20);
    const total = roll + wisMod;
    const dc = 18;

    events.push({
      type: "Dice",
      entry: {
        label: `Search for Secrets (WIS DC ${dc})`,
        rolls: [{ sides: 20, result: roll }],
        total,
      },
    });

    if (total >= dc) {
      const { x, y } = state.playerPos;
      const adjacent = [
        { x: x, y: y - 1 },
        { x: x, y: y + 1 },
        { x: x - 1, y: y },
        { x: x + 1, y: y },
      ];

      for (const pos of adjacent) {
        const tile = tileAt(state.map, pos.x, pos.y);
        if (tile === "wall") {
          const newTiles = [...state.map.tiles];
          newTiles[pos.y * state.map.width + pos.x] = "stairs";

          nextState = {
            ...nextState,
            map: { ...nextState.map, tiles: newTiles },
          };

          events.push({
            type: "MapModified",
            action: "discovered a secret passage",
            x: pos.x,
            y: pos.y,
            oldTile: "wall",
            newTile: "stairs",
          });

          return { nextState, events };
        }
      }
    }

    return { nextState, events };
  }

  if (command.kind === "rest") {
    if (state.combat.active) {
      events.push({ type: "Bumped", reason: "You can't rest during combat!" });
      return { nextState, events };
    }

    const pc = state.creatures[state.playerId];
    let updatedPc = { ...pc };

    // Restore HP
    const hpRestored = updatedPc.maxHp - updatedPc.hp;
    updatedPc.hp = updatedPc.maxHp;

    // Restore spell slots
    if (updatedPc.spellSlots) {
      for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
        updatedPc.spellSlots[level] = {
          ...updatedPc.spellSlots[level],
          current: updatedPc.spellSlots[level].max,
        };
      }
    }

    // Clear conditions
    updatedPc.conditions = [];

    nextState = {
      ...nextState,
      creatures: { ...nextState.creatures, [pc.id]: updatedPc },
    };

    events.push({
      type: "Rested",
      restType: "long",
      hpRestored,
      message: `You take a long rest. HP fully restored, spell slots recharged, conditions cleared.`,
    });

    return { nextState, events };
  }

  if (command.kind === "unknown") {
    // Don't auto-fail mechanics here; just ask for clarification.
    // If a roll was required, the inference rules above should have produced a skill/ability/attack command.
    events.push({
      type: "Bumped",
      reason: `I can't map that to a rules action yet. Try phrasing it like "sneak", "search", "persuade", "attack", or "check str".`,
    });
    return { nextState, events };
  }

  return { nextState, events };
}

export function resolveNpcTurn(state: GameState, rng: Rng): EngineResult {
  if (!state.combat.active) return { nextState: state, events: [] };
  const turnId = currentTurnCreatureId(state);
  if (!turnId || turnId === state.playerId) return { nextState: state, events: [] };

  const npc = state.creatures[turnId];
  const pc = state.creatures[state.playerId];
  if (!npc || npc.hp <= 0) {
    const ended = endCombat(state);
    return { nextState: ended.nextState, events: ended.events };
  }

  let nextState = state;
  const events: EngineEvent[] = [];
  
  // Get positions
  const npcPos = state.creaturePositions[turnId];
  const pcPos = state.playerPos;
  
  if (!npcPos) {
    console.error('[Engine] NPC has no position:', turnId);
    nextState = advanceTurn(state);
    return { nextState, events };
  }
  
  // Calculate distance to player
  const distance = Math.abs(npcPos.x - pcPos.x) + Math.abs(npcPos.y - pcPos.y);
  
  // If not adjacent, move closer
  if (distance > 1) {
    const dx = Math.sign(pcPos.x - npcPos.x);
    const dy = Math.sign(pcPos.y - npcPos.y);
    
    // Move one step closer (prioritize the larger distance)
    let newX = npcPos.x;
    let newY = npcPos.y;
    
    if (Math.abs(pcPos.x - npcPos.x) >= Math.abs(pcPos.y - npcPos.y)) {
      newX += dx;
    } else {
      newY += dy;
    }
    
    // Check if destination is walkable
    const destTile = state.map.tiles[newY * state.map.width + newX];
    const isWalkable = destTile === "floor" || destTile === "grass" || destTile === "road";
    
    if (isWalkable) {
      nextState = {
        ...nextState,
        creaturePositions: {
          ...nextState.creaturePositions,
          [turnId]: { x: newX, y: newY },
        },
      };
      events.push({
        type: "Moved",
        dx: newX - npcPos.x,
        dy: newY - npcPos.y,
      });
    }
    
    // After moving, check if we're now adjacent
    const newDistance = Math.abs(newX - pcPos.x) + Math.abs(newY - pcPos.y);
    if (newDistance > 1) {
      // Still too far, end turn
      nextState = advanceTurn(nextState);
      return { nextState, events };
    }
  }
  
  // Now attack
  const attackRoll = rollDie(rng, 20);
  const attackBonus = 2 + abilityMod(npc.abilityScores.dex);
  const toHit = attackRoll + attackBonus;

  events.push({
    type: "Dice",
    entry: {
      label: `${npc.name} attack vs AC ${pc.ac}`,
      rolls: [{ sides: 20, result: attackRoll }],
      total: toHit,
    },
  });

  const hit = attackRoll === 20 || (attackRoll !== 1 && toHit >= pc.ac);
  if (!hit) {
    events.push({ type: "AttackResolved", targetName: pc.name, hit: false });
    nextState = advanceTurn(nextState);
    return { nextState, events };
  }

  const dmgEntry = rollDice(rng, "Damage (1d6)", 6, 1);
  events.push({ type: "Dice", entry: dmgEntry });

  const nextHp = Math.max(0, pc.hp - dmgEntry.total);
  nextState = {
    ...nextState,
    creatures: {
      ...nextState.creatures,
      [pc.id]: { ...pc, hp: nextHp },
    },
  };

  events.push({ type: "AttackResolved", targetName: pc.name, hit: true, damage: dmgEntry.total });

  if (nextHp <= 0) {
    // Demo: end combat if the PC drops.
    const ended = endCombat(nextState);
    nextState = ended.nextState;
    events.push(...ended.events);
    return { nextState, events };
  }

  nextState = advanceTurn(nextState);
  return { nextState, events };
}

export function applyPlayerText(state: GameState, rng: Rng, text: string): EngineResult {
  const withPlayerLine = appendLog(state, { kind: "player", text });
  const command = parsePlayerCommand(text);
  return resolveCommand(withPlayerLine, rng, command);
}
