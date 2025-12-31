/**
 * Map Specification Schema
 * This defines the structured JSON format that the AI generates
 */

export type MapType = "dungeon" | "town" | "wilderness" | "mixed";

export type TerrainType = 
  | "wall" 
  | "floor" 
  | "door" 
  | "grass" 
  | "tree" 
  | "water" 
  | "road" 
  | "building" 
  | "rock"
  | "chest"
  | "trap"
  | "stairs"
  | "pillar";

export type DoorType = {
  x: number;
  y: number;
  locked?: boolean;
  trapped?: boolean;
  secret?: boolean;
  description?: string;
};

export type SpecialFeature = {
  type: "trap" | "hazard" | "boss_room" | "poi" | "shrine" | "fountain" | "statue";
  x: number;
  y: number;
  description: string;
  dangerous?: boolean;
};

export type RoomSpec = {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  purpose: string; // "entrance", "treasure", "combat", "safe", "merchant", etc.
  terrain: TerrainType; // dominant terrain in this room
};

export type CorridorSpec = {
  from: string; // room id
  to: string; // room id
  width?: number; // 1-3 tiles wide
};

export type MapSpec = {
  map_type: MapType;
  grid_size: {
    width: number;
    height: number;
  };
  rooms: RoomSpec[];
  corridors?: CorridorSpec[];
  doors?: DoorType[];
  special_features?: SpecialFeature[];
  theme?: string;
};

/**
 * Grid Tile - The actual playable grid cell
 */
export type GridTile = {
  x: number;
  y: number;
  type: TerrainType;
  walkable: boolean;
  blocksVision: boolean;
  roomId?: string; // which room this tile belongs to
  special?: string; // special feature description
};

/**
 * Complete Grid Map - The actual game map
 */
export type GridMap = {
  width: number;
  height: number;
  tiles: GridTile[]; // row-major, length = width * height
  rooms: RoomSpec[];
  mapType: MapType;
};
