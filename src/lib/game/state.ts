import type { Creature, CreatureId } from "@/lib/rules/dnd5e/types";
import { calculateSpellSlots } from "@/lib/rules/dnd5e/spellSlots";
// Removed: generateCampaignMap now called via API route for server-side execution
// import { generateCampaignMap } from "@/lib/aiDm/mapGeneratorV2";
import type { GridMap } from "@/lib/aiDm/mapSpec";
import { createEncounter } from "@/lib/rules/dnd5e/creatureLibrary";
import { createMulberry32 } from "@/lib/random/rng";

export type MapTile = "wall" | "floor" | "door" | "chest" | "trap" | "stairs" | "water" | "pillar" | "tree" | "grass" | "road" | "building" | "rock";

export type Room = {
  id: string;
  name: string;
  description: string;
  bounds: { x: number; y: number; width: number; height: number };
};

export type GameMap = {
  width: number;
  height: number;
  tiles: MapTile[]; // row-major length = width*height
  rooms: Room[];
};

/**
 * Expand map in a direction by adding new section
 */
export async function expandMapInDirection(
  currentMap: GameMap,
  doorPos: { x: number; y: number },
  direction: "north" | "south" | "east" | "west",
  campaignPrompt?: string
): Promise<{ map: GameMap; newRoomBounds: { x: number; y: number; width: number; height: number }[] }> {
  const prompt = campaignPrompt || "A mysterious dungeon section";
  
  // Generate a smaller extension (10x10 or 15x10)
  const extensionWidth = direction === "north" || direction === "south" ? currentMap.width : 15;
  const extensionHeight = direction === "north" || direction === "south" ? 10 : currentMap.height;
  
  // Generate new section via API
  let newSectionGrid;
  try {
    const response = await fetch('/api/generate-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignPrompt: `${prompt} - new area discovered`,
        width: extensionWidth,
        height: extensionHeight,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      newSectionGrid = data.gridMap;
    } else {
      throw new Error('API failed');
    }
  } catch (error) {
    console.error('[State] Failed to generate map extension:', error);
    // Minimal fallback
    newSectionGrid = {
      width: extensionWidth,
      height: extensionHeight,
      cells: Array(extensionWidth * extensionHeight).fill({ terrain: 'floor', discovered: false, visible: false }),
      rooms: [{
        id: 'extension',
        name: 'New Area',
        description: 'An unexplored area',
        bounds: { x: 2, y: 2, width: extensionWidth - 4, height: extensionHeight - 4 },
        purpose: 'exploration',
        exits: []
      }],
      corridors: [],
      doors: [],
      specialFeatures: []
    };
  }
  
  const newSection = convertGridMapToGameMap(newSectionGrid);
  
  // Calculate new dimensions
  let newWidth = currentMap.width;
  let newHeight = currentMap.height;
  let offsetX = 0;
  let offsetY = 0;
  
  if (direction === "east") {
    newWidth = currentMap.width + newSection.width;
  } else if (direction === "west") {
    newWidth = currentMap.width + newSection.width;
    offsetX = newSection.width;
  } else if (direction === "south") {
    newHeight = currentMap.height + newSection.height;
  } else if (direction === "north") {
    newHeight = currentMap.height + newSection.height;
    offsetY = newSection.height;
  }
  
  // Create new tile array
  const newTiles: MapTile[] = new Array(newWidth * newHeight).fill("wall");
  
  // Copy existing tiles to new position
  for (let y = 0; y < currentMap.height; y++) {
    for (let x = 0; x < currentMap.width; x++) {
      const oldIdx = y * currentMap.width + x;
      const newIdx = (y + offsetY) * newWidth + (x + offsetX);
      newTiles[newIdx] = currentMap.tiles[oldIdx];
    }
  }
  
  // Copy new section tiles
  const newSectionOffsetX = direction === "east" ? currentMap.width : 0;
  const newSectionOffsetY = direction === "south" ? currentMap.height : 0;
  
  for (let y = 0; y < newSection.height; y++) {
    for (let x = 0; x < newSection.width; x++) {
      const srcIdx = y * newSection.width + x;
      const dstIdx = (y + newSectionOffsetY) * newWidth + (x + newSectionOffsetX);
      if (dstIdx >= 0 && dstIdx < newTiles.length) {
        newTiles[dstIdx] = newSection.tiles[srcIdx];
      }
    }
  }
  
  // Create corridor connecting door to new section
  const corridorLength = 3;
  if (direction === "east") {
    for (let i = 1; i <= corridorLength; i++) {
      const idx = doorPos.y * newWidth + (doorPos.x + i + offsetX);
      if (idx >= 0 && idx < newTiles.length) newTiles[idx] = "floor";
    }
  } else if (direction === "west") {
    for (let i = 1; i <= corridorLength; i++) {
      const idx = doorPos.y * newWidth + (doorPos.x - i + offsetX);
      if (idx >= 0 && idx < newTiles.length) newTiles[idx] = "floor";
    }
  } else if (direction === "south") {
    for (let i = 1; i <= corridorLength; i++) {
      const idx = (doorPos.y + i + offsetY) * newWidth + doorPos.x;
      if (idx >= 0 && idx < newTiles.length) newTiles[idx] = "floor";
    }
  } else if (direction === "north") {
    for (let i = 1; i <= corridorLength; i++) {
      const idx = (doorPos.y - i + offsetY) * newWidth + doorPos.x;
      if (idx >= 0 && idx < newTiles.length) newTiles[idx] = "floor";
    }
  }
  
  // Update room positions
  const updatedRooms = currentMap.rooms.map(room => ({
    ...room,
    bounds: {
      ...room.bounds,
      x: room.bounds.x + offsetX,
      y: room.bounds.y + offsetY,
    },
  }));
  
  const newRooms = newSection.rooms.map((room, idx) => ({
    ...room,
    id: `${room.id}-ext-${Date.now()}-${idx}`,
    bounds: {
      ...room.bounds,
      x: room.bounds.x + newSectionOffsetX,
      y: room.bounds.y + newSectionOffsetY,
    },
  }));
  
  return {
    map: {
      width: newWidth,
      height: newHeight,
      tiles: newTiles,
      rooms: [...updatedRooms, ...newRooms],
    },
    newRoomBounds: newRooms.map(r => r.bounds),
  };
}

/**
 * Convert GridMap to GameMap (for backward compatibility)
 */
function convertGridMapToGameMap(gridMap: GridMap): GameMap {
  const tiles: MapTile[] = gridMap.tiles.map(tile => tile.type);
  
  const rooms: Room[] = gridMap.rooms.map(room => ({
    id: room.id,
    name: room.name,
    description: room.description,
    bounds: {
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
    },
  }));
  
  return {
    width: gridMap.width,
    height: gridMap.height,
    tiles,
    rooms,
  };
}

export type Position = { x: number; y: number };

export type CreaturePosition = {
  creatureId: CreatureId;
  position: Position;
};

export type Combatant = {
  creatureId: CreatureId;
  initiative: number;
};

export type CombatState = {
  active: boolean;
  round: number;
  turnIndex: number;
  order: Combatant[];
};

export type GameLogItem = {
  id: string;
  kind: "dm" | "player" | "system" | "dice" | "loot";
  text: string;
  at: number; // epoch ms
  items?: string[]; // For loot entries
};

export type GameState = {
  seed: number;
  time: number;
  playerId: CreatureId;
  creatures: Record<CreatureId, Creature>;
  map: GameMap;
  playerPos: Position;
  creaturePositions: Record<CreatureId, Position>; // Track all creature positions
  combat: CombatState;
  log: GameLogItem[];
  focusedEnemyId?: CreatureId; // Track which enemy is focused for attacks
};

function makeDungeonMap(): GameMap {
  const width = 25;
  const height = 20;
  const tiles: MapTile[] = new Array(width * height).fill("wall");

  // Helper to set tile
  const setTile = (x: number, y: number, tile: MapTile) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      tiles[y * width + x] = tile;
    }
  };

  // Helper to carve room
  const carveRoom = (x: number, y: number, w: number, h: number) => {
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        setTile(rx, ry, "floor");
      }
    }
  };

  // Helper to carve corridor
  const carveCorridor = (x1: number, y1: number, x2: number, y2: number) => {
    // Horizontal then vertical
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      setTile(x, y1, "floor");
    }
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      setTile(x2, y, "floor");
    }
  };

  // Room 1: Entrance Hall (top-left)
  carveRoom(2, 2, 8, 6);
  setTile(5, 2, "door"); // North door
  
  // Room 2: Guard Room (top-right)
  carveRoom(15, 2, 8, 6);
  
  // Room 3: Treasure Chamber (bottom-left)
  carveRoom(2, 12, 7, 6);
  setTile(5, 15, "chest");
  
  // Room 4: Prison Cells (bottom-right)
  carveRoom(15, 12, 8, 6);
  setTile(17, 14, "pillar");
  setTile(20, 14, "pillar");
  
  // Room 5: Central Chamber
  carveRoom(10, 8, 7, 5);
  setTile(13, 10, "pillar");
  
  // Corridors
  carveCorridor(6, 8, 13, 8); // Entrance to Central
  carveCorridor(19, 8, 13, 10); // Guard to Central
  carveCorridor(6, 12, 13, 11); // Entrance to Treasure
  carveCorridor(19, 12, 16, 11); // Prison to Central
  
  // Add some doors
  setTile(10, 10, "door");
  setTile(16, 10, "door");
  
  // Add water feature in central chamber
  setTile(14, 9, "water");
  setTile(14, 10, "water");
  
  const rooms: Room[] = [
    {
      id: "entrance",
      name: "Entrance Hall",
      description: "A dimly lit stone chamber with torches flickering on the walls. Ancient runes are carved into the floor.",
      bounds: { x: 2, y: 2, width: 8, height: 6 },
    },
    {
      id: "guard-room",
      name: "Guard Room",
      description: "A fortified chamber with weapon racks and arrow slits. Signs of recent occupation are evident.",
      bounds: { x: 15, y: 2, width: 8, height: 6 },
    },
    {
      id: "treasure",
      name: "Treasure Chamber",
      description: "A small vault with a locked chest. The air smells of old coins and dust.",
      bounds: { x: 2, y: 12, width: 7, height: 6 },
    },
    {
      id: "prison",
      name: "Prison Cells",
      description: "Barred cells line the walls. Rusted chains hang from iron rings embedded in stone pillars.",
      bounds: { x: 15, y: 12, width: 8, height: 6 },
    },
    {
      id: "central",
      name: "Central Chamber",
      description: "A circular room with a shallow pool of crystal-clear water. A stone pillar rises from the center.",
      bounds: { x: 10, y: 8, width: 7, height: 5 },
    },
  ];

  return { width, height, tiles, rooms };
}

export async function createInitialGameState(
  seed: number,
  playerCharacter?: Creature,
  campaignPrompt?: string
): Promise<GameState> {
  const player: Creature = playerCharacter || {
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
    characterClass: "fighter", // Default class
    inspiration: false,
    isUnconscious: false,
  };

  // Initialize spell slots if the character has spells
  if (player.spells && player.spells.length > 0) {
    player.spellSlots = calculateSpellSlots(player.level);
  }

  // Generate encounter using creature library
  const rng = createMulberry32(seed);
  const enemies = createEncounter(player.level, rng);

  const now = Date.now();
  const bootMessage = campaignPrompt || "Rules engine online. The game engine controls reality; the DM controls meaning.";
  
  // Generate campaign-specific map via API route (server-side only)
  let gridMap;
  try {
    const response = await fetch('/api/generate-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignPrompt: campaignPrompt || "A classic dungeon adventure",
        width: 25,
        height: 20,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      gridMap = data.gridMap;
    } else {
      console.error('[State] Map generation API failed, using fallback');
      // Fallback will be handled by API route itself
      const data = await response.json();
      gridMap = data.gridMap; // API returns fallback on error
    }
  } catch (error) {
    console.error('[State] Failed to fetch generated map:', error);
    // Create minimal fallback map client-side
    gridMap = {
      width: 25,
      height: 20,
      cells: Array(25 * 20).fill({ terrain: 'floor', discovered: false, visible: false }),
      rooms: [{
        id: 'start',
        name: 'Starting Room',
        description: 'A simple room',
        bounds: { x: 10, y: 8, width: 5, height: 4 },
        purpose: 'safe',
        exits: []
      }],
      corridors: [],
      doors: [],
      specialFeatures: []
    };
  }
  
  // Convert to GameMap format
  const map = convertGridMapToGameMap(gridMap);
  
  // Find a floor tile in the first room for player start
  const startRoom = map.rooms[0];
  const startPos = { 
    x: startRoom.bounds.x + Math.floor(startRoom.bounds.width / 2), 
    y: startRoom.bounds.y + Math.floor(startRoom.bounds.height / 2) 
  };
  
  // Place enemies in different rooms
  const enemyPositions: Record<CreatureId, Position> = {};
  const creaturesList: Record<CreatureId, Creature> = { [player.id]: player };
  
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    // Place enemies in rooms 1-3 (avoiding the start room)
    const roomIndex = Math.min(i + 1, map.rooms.length - 1);
    const room = map.rooms[roomIndex] || startRoom;
    const enemyPos = { 
      x: room.bounds.x + Math.floor(room.bounds.width / 2) + (i % 2), // Offset slightly
      y: room.bounds.y + Math.floor(room.bounds.height / 2) + Math.floor(i / 2)
    };
    enemyPositions[enemy.id] = enemyPos;
    creaturesList[enemy.id] = enemy;
  }
  
  return {
    seed,
    time: now,
    playerId: player.id,
    creatures: creaturesList,
    map,
    playerPos: startPos,
    creaturePositions: {
      [player.id]: startPos,
      ...enemyPositions,
    },
    combat: { active: false, round: 0, turnIndex: 0, order: [] },
    log: [
      {
        id: "boot",
        kind: "system",
        text: bootMessage,
        at: now,
      },
    ],
  };
}

export function tileAt(map: GameMap, x: number, y: number): MapTile | undefined {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
  return map.tiles[y * map.width + x];
}
