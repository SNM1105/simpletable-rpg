import type { MapSpec, GridMap, GridTile, TerrainType, RoomSpec, CorridorSpec } from "./mapSpec";

/**
 * Procedural Map Builder
 * Converts a JSON MapSpec into a playable 2D grid
 */

/**
 * Initialize an empty grid filled with walls (for dungeons) or grass (for outdoor)
 */
function initializeGrid(width: number, height: number, defaultType: TerrainType): GridTile[] {
  const tiles: GridTile[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push({
        x,
        y,
        type: defaultType,
        walkable: defaultType === "grass" || defaultType === "floor",
        blocksVision: defaultType === "wall",
      });
    }
  }
  
  return tiles;
}

/**
 * Get tile at position (helper)
 */
function getTile(tiles: GridTile[], width: number, x: number, y: number): GridTile | null {
  if (x < 0 || x >= width || y < 0 || y >= Math.floor(tiles.length / width)) {
    return null;
  }
  return tiles[y * width + x];
}

/**
 * Set tile at position (helper)
 */
function setTile(tiles: GridTile[], width: number, x: number, y: number, updates: Partial<GridTile>): void {
  const tile = getTile(tiles, width, x, y);
  if (tile) {
    Object.assign(tile, updates);
  }
}

/**
 * Check if terrain type is walkable
 */
function isWalkable(type: TerrainType): boolean {
  return !["wall", "water", "rock", "pillar"].includes(type);
}

/**
 * Check if terrain type blocks vision
 */
function blocksVision(type: TerrainType): boolean {
  return ["wall", "rock", "pillar", "tree", "building"].includes(type);
}

/**
 * Carve a room into the grid
 */
function carveRoom(tiles: GridTile[], width: number, room: RoomSpec): void {
  const { x, y, width: w, height: h, terrain, id } = room;
  
  // Fill room with floor or appropriate terrain
  for (let ry = y; ry < y + h; ry++) {
    for (let rx = x; rx < x + w; rx++) {
      setTile(tiles, width, rx, ry, {
        type: terrain,
        walkable: isWalkable(terrain),
        blocksVision: blocksVision(terrain),
        roomId: id,
      });
    }
  }
  
  // Add walls around the perimeter if it's an indoor room
  if (terrain === "floor") {
    // Top and bottom walls
    for (let rx = x; rx < x + w; rx++) {
      if (y > 0) {
        const topTile = getTile(tiles, width, rx, y - 1);
        if (topTile && topTile.type !== "floor") {
          setTile(tiles, width, rx, y - 1, {
            type: "wall",
            walkable: false,
            blocksVision: true,
          });
        }
      }
      if (y + h < Math.floor(tiles.length / width)) {
        const bottomTile = getTile(tiles, width, rx, y + h);
        if (bottomTile && bottomTile.type !== "floor") {
          setTile(tiles, width, rx, y + h, {
            type: "wall",
            walkable: false,
            blocksVision: true,
          });
        }
      }
    }
    
    // Left and right walls
    for (let ry = y; ry < y + h; ry++) {
      if (x > 0) {
        const leftTile = getTile(tiles, width, x - 1, ry);
        if (leftTile && leftTile.type !== "floor") {
          setTile(tiles, width, x - 1, ry, {
            type: "wall",
            walkable: false,
            blocksVision: true,
          });
        }
      }
      if (x + w < width) {
        const rightTile = getTile(tiles, width, x + w, ry);
        if (rightTile && rightTile.type !== "floor") {
          setTile(tiles, width, x + w, ry, {
            type: "wall",
            walkable: false,
            blocksVision: true,
          });
        }
      }
    }
  }
}

/**
 * Carve a corridor between two rooms
 */
function carveCorridor(
  tiles: GridTile[], 
  width: number, 
  from: RoomSpec, 
  to: RoomSpec, 
  corridorWidth: number = 1
): void {
  // Find center points of each room
  const startX = Math.floor(from.x + from.width / 2);
  const startY = Math.floor(from.y + from.height / 2);
  const endX = Math.floor(to.x + to.width / 2);
  const endY = Math.floor(to.y + to.height / 2);
  
  // Create L-shaped corridor (horizontal then vertical)
  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  
  // Horizontal section
  for (let x = minX; x <= maxX; x++) {
    for (let w = 0; w < corridorWidth; w++) {
      setTile(tiles, width, x, startY + w, {
        type: "floor",
        walkable: true,
        blocksVision: false,
      });
    }
  }
  
  // Vertical section
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);
  
  for (let y = minY; y <= maxY; y++) {
    for (let w = 0; w < corridorWidth; w++) {
      setTile(tiles, width, endX + w, y, {
        type: "floor",
        walkable: true,
        blocksVision: false,
      });
    }
  }
}

/**
 * Place doors in the grid
 */
function placeDoors(tiles: GridTile[], width: number, spec: MapSpec): void {
  if (!spec.doors) return;
  
  for (const door of spec.doors) {
    const description = door.secret ? "Secret Door" : 
                       door.locked ? "Locked Door" : 
                       door.trapped ? "Trapped Door" : undefined;
    
    setTile(tiles, width, door.x, door.y, {
      type: "door",
      walkable: true,
      blocksVision: !door.secret, // secret doors block vision until found
      special: description,
    });
  }
}

/**
 * Place special features
 */
function placeSpecialFeatures(tiles: GridTile[], width: number, spec: MapSpec): void {
  if (!spec.special_features) return;
  
  for (const feature of spec.special_features) {
    const type: TerrainType = feature.type === "trap" ? "trap" : 
                              feature.type === "poi" ? "pillar" : "floor";
    
    setTile(tiles, width, feature.x, feature.y, {
      type,
      walkable: feature.type !== "hazard",
      blocksVision: feature.type === "hazard",
      special: feature.description,
    });
  }
}

/**
 * Validate map spec (ensure no overlapping rooms, valid bounds)
 */
function validateMapSpec(spec: MapSpec): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check grid size
  if (spec.grid_size.width <= 0 || spec.grid_size.height <= 0) {
    errors.push("Invalid grid size");
  }
  
  // Check room bounds
  for (const room of spec.rooms) {
    if (room.x < 0 || room.y < 0) {
      errors.push(`Room ${room.id} has negative coordinates`);
    }
    if (room.x + room.width > spec.grid_size.width) {
      errors.push(`Room ${room.id} exceeds map width`);
    }
    if (room.y + room.height > spec.grid_size.height) {
      errors.push(`Room ${room.id} exceeds map height`);
    }
  }
  
  // Check for overlapping rooms (dungeons only)
  if (spec.map_type === "dungeon") {
    for (let i = 0; i < spec.rooms.length; i++) {
      for (let j = i + 1; j < spec.rooms.length; j++) {
        const r1 = spec.rooms[i];
        const r2 = spec.rooms[j];
        
        const overlap = !(
          r1.x + r1.width <= r2.x ||
          r2.x + r2.width <= r1.x ||
          r1.y + r1.height <= r2.y ||
          r2.y + r2.height <= r1.y
        );
        
        if (overlap) {
          errors.push(`Rooms ${r1.id} and ${r2.id} overlap`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Main builder: Convert MapSpec to GridMap
 */
export function buildMapFromSpec(spec: MapSpec): GridMap {
  const { width, height } = spec.grid_size;
  
  // Auto-fix rooms that exceed bounds
  spec.rooms = spec.rooms.map(room => {
    let { x, y, width: rWidth, height: rHeight } = room;
    
    // Clamp position and size to fit within map
    x = Math.max(0, Math.min(x, width - 1));
    y = Math.max(0, Math.min(y, height - 1));
    rWidth = Math.max(2, Math.min(rWidth, width - x));
    rHeight = Math.max(2, Math.min(rHeight, height - y));
    
    return {
      ...room,
      x,
      y,
      width: rWidth,
      height: rHeight,
    };
  });
  
  // Validate spec after fixes
  const validation = validateMapSpec(spec);
  if (!validation.valid) {
    console.warn("Map validation errors:", validation.errors);
    console.warn("Attempting to build anyway with adjustments...");
  }
  
  // Determine base terrain type
  const baseTerrain: TerrainType = 
    spec.map_type === "dungeon" ? "wall" :
    spec.map_type === "town" ? "grass" :
    spec.map_type === "wilderness" ? "grass" :
    "grass"; // mixed defaults to grass
  
  // Initialize grid
  const tiles = initializeGrid(width, height, baseTerrain);
  
  // Carve rooms
  for (const room of spec.rooms) {
    carveRoom(tiles, width, room);
  }
  
  // Carve corridors
  if (spec.corridors) {
    for (const corridor of spec.corridors) {
      const fromRoom = spec.rooms.find(r => r.id === corridor.from);
      const toRoom = spec.rooms.find(r => r.id === corridor.to);
      
      if (fromRoom && toRoom) {
        carveCorridor(tiles, width, fromRoom, toRoom, corridor.width || 1);
      }
    }
  }
  
  // Place doors
  placeDoors(tiles, width, spec);
  
  // Place special features
  placeSpecialFeatures(tiles, width, spec);
  
  return {
    width,
    height,
    tiles,
    rooms: spec.rooms,
    mapType: spec.map_type,
  };
}

/**
 * Helper: Create a simple fallback dungeon
 */
export function createFallbackDungeon(width: number = 25, height: number = 20): GridMap {
  const spec: MapSpec = {
    map_type: "dungeon",
    grid_size: { width, height },
    rooms: [
      {
        id: "entrance",
        name: "Entrance Hall",
        description: "A dimly lit stone chamber",
        x: 2,
        y: 2,
        width: 6,
        height: 5,
        purpose: "entrance",
        terrain: "floor",
      },
      {
        id: "main",
        name: "Main Chamber",
        description: "A large open room",
        x: 10,
        y: 8,
        width: 8,
        height: 7,
        purpose: "combat",
        terrain: "floor",
      },
      {
        id: "treasure",
        name: "Treasure Room",
        description: "Glittering gold and jewels",
        x: 18,
        y: 3,
        width: 5,
        height: 4,
        purpose: "treasure",
        terrain: "floor",
      },
    ],
    corridors: [
      { from: "entrance", to: "main" },
      { from: "main", to: "treasure" },
    ],
    doors: [
      { x: 8, y: 4, locked: false },
      { x: 17, y: 5, locked: true },
    ],
    special_features: [
      { type: "trap", x: 12, y: 10, description: "Pressure plate", dangerous: true },
      { type: "poi", x: 20, y: 5, description: "Ancient statue", dangerous: false },
    ],
  };
  
  return buildMapFromSpec(spec);
}
