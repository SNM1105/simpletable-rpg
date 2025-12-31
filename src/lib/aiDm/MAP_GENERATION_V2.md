# Map Generation System V2

## Overview

This is a complete grid-based map generation system that uses structured JSON specifications and procedural building algorithms to create D&D maps.

## Architecture

```
Campaign Prompt → AI generates MapSpec → Procedural Builder → GridMap → GameMap
```

### 1. Map Specification (mapSpec.ts)

Defines the structured JSON schema that the AI generates:

- **MapSpec**: Complete map specification

  - `map_type`: dungeon, town, wilderness, mixed
  - `grid_size`: width × height (default 25×20)
  - `rooms`: Array of room specifications
  - `corridors`: Connections between rooms
  - `doors`: Door placements with properties
  - `special_features`: Traps, hazards, points of interest

- **RoomSpec**: Individual room definition

  - Position, size, purpose
  - Dominant terrain type
  - Name and description

- **GridTile**: Individual grid cell
  - x, y coordinates
  - Terrain type
  - walkable, blocksVision flags
  - Room assignment
  - Special feature description

### 2. Map Builder (mapBuilder.ts)

Procedural system that converts MapSpec to GridMap:

**Functions:**

- `initializeGrid()` - Create base grid with default terrain
- `carveRoom()` - Place room and add walls for dungeons
- `carveCorridor()` - Connect rooms with L-shaped paths
- `placeDoors()` - Add doors with properties
- `placeSpecialFeatures()` - Add traps, hazards, POIs
- `validateMapSpec()` - Check for overlaps and bounds
- `buildMapFromSpec()` - Main builder function

**Features:**

- No overlapping rooms (for dungeons)
- Automatic wall generation around indoor rooms
- Proper walkable/vision blocking flags
- Validation before building

### 3. AI Generator (mapGeneratorV2.ts)

AI-powered map spec generation:

**Functions:**

- `determineMapType()` - Analyze prompt for map type
- `generateMapSpec()` - Use AI to create JSON spec
- `generateCampaignMap()` - Complete generation pipeline

**AI Prompts:**

- System prompt with detailed schema and examples
- User prompt with campaign description
- Few-shot learning with 2 complete examples
- JSON extraction and validation

### 4. Game State Integration (state.ts)

Converts GridMap to legacy GameMap format:

- `convertGridMapToGameMap()` - Backward compatibility
- `createInitialGameState()` - Uses new generation system

## Map Types

### Dungeon

- Base terrain: **wall**
- Walkable: floor, door
- Features: traps, chests, stairs, pillars
- Auto-generates walls around rooms
- Corridors connect all rooms

### Town

- Base terrain: **grass**
- Walkable: grass, road
- Features: buildings, roads, fountains
- Open layout, natural connections

### Wilderness

- Base terrain: **grass**
- Walkable: grass, road
- Features: trees, water, rocks
- Natural terrain formations

### Mixed

- Combination of above
- Default to grass base

## Terrain Types

| Type     | Walkable | Blocks Vision | Usage                           |
| -------- | -------- | ------------- | ------------------------------- |
| wall     | ❌       | ✅            | Dungeon barriers                |
| floor    | ✅       | ❌            | Indoor spaces                   |
| door     | ✅       | ❌\*          | Entrances (\*secret=yes blocks) |
| grass    | ✅       | ❌            | Outdoor ground                  |
| tree     | ❌       | ✅            | Forests                         |
| water    | ❌       | ❌            | Lakes, rivers                   |
| road     | ✅       | ❌            | Paths                           |
| building | ❌       | ✅            | Structures                      |
| rock     | ❌       | ✅            | Boulders                        |
| chest    | ✅       | ❌            | Treasure                        |
| trap     | ✅       | ❌            | Hazards                         |
| stairs   | ✅       | ❌            | Level changes                   |
| pillar   | ❌       | ✅            | Columns                         |

## Example MapSpec

```json
{
  "map_type": "dungeon",
  "grid_size": { "width": 25, "height": 20 },
  "rooms": [
    {
      "id": "entrance",
      "name": "Entry Hall",
      "description": "Torch-lit stone chamber",
      "x": 2,
      "y": 2,
      "width": 6,
      "height": 5,
      "purpose": "entrance",
      "terrain": "floor"
    },
    {
      "id": "treasure",
      "name": "Vault",
      "description": "Gold piles glitter",
      "x": 18,
      "y": 3,
      "width": 5,
      "height": 4,
      "purpose": "treasure",
      "terrain": "floor"
    }
  ],
  "corridors": [{ "from": "entrance", "to": "treasure", "width": 1 }],
  "doors": [
    { "x": 8, "y": 4, "locked": false },
    { "x": 17, "y": 5, "locked": true }
  ],
  "special_features": [
    {
      "type": "trap",
      "x": 12,
      "y": 10,
      "description": "Pressure plate",
      "dangerous": true
    }
  ]
}
```

## Usage

```typescript
// Generate a map from campaign prompt
const gridMap = await generateCampaignMap(
  "A haunted forest with ancient ruins"
);

// Access tiles
const tile = gridMap.tiles[y * gridMap.width + x];
console.log(tile.walkable, tile.blocksVision);

// Access rooms
for (const room of gridMap.rooms) {
  console.log(room.name, room.description);
}

// Fallback if AI fails
const fallback = createFallbackDungeon();
```

## Validation Rules

1. Grid size must be positive
2. All rooms must fit within bounds
3. Rooms cannot overlap (dungeons only)
4. Corridors must reference valid room IDs
5. All coordinates must be within grid

## Future Enhancements

- Multi-floor dungeons with stairs
- Dynamic room expansion based on player exploration
- Fog of war integration
- Save/load map states
- Custom tile properties (slippery, magical, etc.)
- Room events and triggers
- Enemy spawn points
- Line of sight calculations
