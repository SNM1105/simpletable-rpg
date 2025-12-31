import { ollamaChat } from "./ollamaClient";
import type { GameMap, MapTile, Room } from "@/lib/game/state";

type MapGenerationResponse = {
  rooms: Array<{
    name: string;
    description: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  features: Array<{
    type: "door" | "chest" | "trap" | "stairs" | "water" | "pillar" | "tree" | "grass" | "road" | "building" | "rock";
    x: number;
    y: number;
  }>;
};

export async function generateCampaignMap(campaignPrompt: string): Promise<GameMap> {
  const systemPrompt = `You are an expert D&D world architect AI. Create detailed, thematic maps for ANY setting.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, just pure JSON.

TILE TYPES AND THEIR MEANINGS:
OUTDOOR SETTINGS:
- "grass" = open ground, meadows, clearings (BASE for outdoor)
- "tree" = forests, woods, jungle vegetation
- "water" = lakes, rivers, ponds, streams
- "road" = paths, trails, streets, bridges
- "building" = houses, shops, structures, ruins
- "rock" = boulders, cliffs, stone formations

INDOOR/DUNGEON SETTINGS:
- "wall" = solid barriers, mountains (BASE for indoor)
- "floor" = walkable indoor spaces
- "door" = entrances, passages, gates
- "chest" = treasure, loot, storage
- "trap" = dangerous hidden hazards
- "stairs" = up/down passages, ladders
- "pillar" = columns, support structures

MAP RULES:
- 25 wide × 20 tall grid (coordinates 0-24 x, 0-19 y)
- Create 3-5 areas matching the player's exact description
- Each area: 4-8 tiles wide, 4-7 tiles tall
- Areas should connect naturally (roads for outdoor, corridors for indoor)
- Use setting-appropriate base: grass for outdoor, wall for indoor

EXAMPLES OF GOOD MAPS:

Example 1 - Forest with lake:
{
  "rooms": [
    {"name": "Forest Clearing", "description": "Sunlight filters through ancient oaks", "x": 2, "y": 2, "width": 6, "height": 5},
    {"name": "Lakeside", "description": "Crystal clear water laps at the shore", "x": 10, "y": 8, "width": 8, "height": 6},
    {"name": "Dense Woods", "description": "Thick vegetation and towering trees", "x": 18, "y": 3, "width": 5, "height": 6}
  ],
  "features": [
    {"type": "tree", "x": 4, "y": 4}, {"type": "tree", "x": 6, "y": 3},
    {"type": "water", "x": 12, "y": 10}, {"type": "water", "x": 13, "y": 10},
    {"type": "water", "x": 14, "y": 10}, {"type": "water", "x": 15, "y": 10},
    {"type": "road", "x": 8, "y": 6}, {"type": "road", "x": 9, "y": 7}
  ]
}

Example 2 - Village with market:
{
  "rooms": [
    {"name": "Market Square", "description": "Bustling center with merchant stalls", "x": 8, "y": 6, "width": 7, "height": 6},
    {"name": "Residential Area", "description": "Cozy homes line the street", "x": 2, "y": 10, "width": 5, "height": 6},
    {"name": "Road to Village", "description": "A well-traveled path", "x": 16, "y": 2, "width": 6, "height": 4}
  ],
  "features": [
    {"type": "building", "x": 10, "y": 8}, {"type": "building", "x": 12, "y": 8},
    {"type": "building", "x": 4, "y": 12}, {"type": "building", "x": 5, "y": 14},
    {"type": "road", "x": 15, "y": 8}, {"type": "road", "x": 16, "y": 8}
  ]
}

CRITICAL RULES:
1. Match the player's setting EXACTLY - if they say forest, DON'T create a dungeon
2. Use appropriate tile types - outdoor = grass/tree/water/road, indoor = floor/wall/door
3. Room names must match the setting (e.g., "Lakeside" not "Treasure Room" for outdoor)
4. Place features densely - add 10-20 features minimum for visual interest
5. Water features should be multiple adjacent tiles for realistic lakes/rivers
6. Trees should cluster for forests, not single tiles
7. Buildings should represent structures, not random placement`;

  const userPrompt = `PLAYER'S SCENARIO:
"${campaignPrompt}"

TASK: Generate a map that PERFECTLY matches this scenario.

ANALYSIS REQUIRED:
1. Is this outdoor or indoor? (outdoor = grass base, indoor = wall base)
2. What areas did they mention? (lake, village, forest, castle, etc.)
3. What features should exist? (trees, water, buildings, etc.)

REQUIREMENTS:
- Create 3-5 areas with names matching the scenario
- Place 10-20 features appropriate to the setting
- Use realistic clustering (water in groups, trees in clusters)
- Coordinates: x (0-24), y (0-19)

OUTPUT: Pure JSON only, no explanations. Follow the examples exactly.`;

  try {
    const response = await ollamaChat(
      process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
      {
        model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        options: {
          temperature: 0.7, // Lower for more consistent structure
          top_p: 0.9,
          num_predict: 2000, // Allow longer responses for detailed maps
        },
      },
      120_000
    );

    const content = response.message.content.trim();
    
    // More aggressive JSON extraction
    let jsonStr = content;
    
    // Try to find JSON block
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    console.log("AI Map Response:", jsonStr.substring(0, 500) + "...");
    
    const parsed = JSON.parse(jsonStr) as MapGenerationResponse;

    // Validate response has required fields
    if (!parsed.rooms || !Array.isArray(parsed.rooms) || parsed.rooms.length === 0) {
      throw new Error("Invalid response: missing or empty rooms array");
    }

    return buildMapFromAI(parsed, campaignPrompt);
  } catch (error) {
    console.error("Failed to generate AI map:", error);
    console.log("Using fallback dungeon due to AI generation failure");
    return makeFallbackDungeon();
  }
}

function buildMapFromAI(aiResponse: MapGenerationResponse, campaignPrompt: string): GameMap {
  const width = 25;
  const height = 20;
  
  // Determine setting from campaign prompt keywords
  const promptLower = campaignPrompt.toLowerCase();
  const outdoorKeywords = ['forest', 'lake', 'tree', 'river', 'meadow', 'grass', 'outdoor', 'wilderness', 'village', 'town', 'road', 'path', 'mountain', 'hill', 'field', 'desert', 'oasis', 'beach', 'shore', 'plains', 'harbor', 'dock', 'street', 'market'];
  const hasOutdoorSetting = outdoorKeywords.some(keyword => promptLower.includes(keyword)) ||
    aiResponse.features?.some(f => ['tree', 'grass', 'road', 'building', 'rock'].includes(f.type));
  
  // Use grass for outdoor, wall for indoor/dungeon
  const baseTile: MapTile = hasOutdoorSetting ? "grass" : "wall";
  const tiles: MapTile[] = new Array(width * height).fill(baseTile);

  console.log(`Building ${hasOutdoorSetting ? 'OUTDOOR' : 'INDOOR'} map with ${aiResponse.rooms?.length || 0} areas and ${aiResponse.features?.length || 0} features`);

  const setTile = (x: number, y: number, tile: MapTile) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      tiles[y * width + x] = tile;
    }
  };

  const carveRoom = (x: number, y: number, w: number, h: number) => {
    const roomTile: MapTile = hasOutdoorSetting ? "grass" : "floor";
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        setTile(rx, ry, roomTile);
      }
    }
  };

  const carveCorridor = (x1: number, y1: number, x2: number, y2: number) => {
    const pathTile: MapTile = hasOutdoorSetting ? "road" : "floor";
    // L-shaped corridor: horizontal then vertical
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      setTile(x, y1, pathTile);
    }
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      setTile(x2, y, pathTile);
    }
  };

  // Carve rooms
  const rooms: Room[] = [];
  const roomCenters: Array<{ x: number; y: number }> = [];

  if (!aiResponse.rooms || aiResponse.rooms.length === 0) {
    console.warn("No rooms in AI response, using fallback");
    return makeFallbackDungeon();
  }

  for (let i = 0; i < aiResponse.rooms.length; i++) {
    const room = aiResponse.rooms[i];
    // Clamp values to valid ranges
    const x = Math.max(1, Math.min(width - room.width - 1, room.x));
    const y = Math.max(1, Math.min(height - room.height - 1, room.y));
    const w = Math.max(4, Math.min(8, room.width));
    const h = Math.max(4, Math.min(7, room.height));

    carveRoom(x, y, w, h);
    roomCenters.push({ x: x + Math.floor(w / 2), y: y + Math.floor(h / 2) });

    rooms.push({
      id: `room-${i}`,
      name: room.name,
      description: room.description,
      bounds: { x, y, width: w, height: h },
    });
  }

  // Connect rooms with corridors
  for (let i = 1; i < roomCenters.length; i++) {
    const prev = roomCenters[i - 1];
    const curr = roomCenters[i];
    carveCorridor(prev.x, prev.y, curr.x, curr.y);
  }

  // Place features with better validation
  if (aiResponse.features && Array.isArray(aiResponse.features)) {
    for (const feature of aiResponse.features) {
      if (feature.x >= 0 && feature.x < width && feature.y >= 0 && feature.y < height) {
        // Place on appropriate tiles based on feature type
        const currentTile = tiles[feature.y * width + feature.x];
        const canPlace = hasOutdoorSetting 
          ? (currentTile === "grass" || currentTile === "road")
          : (currentTile === "floor");
        
        if (canPlace) {
          setTile(feature.x, feature.y, feature.type);
        }
      }
    }
  }

  return { width, height, tiles, rooms };
}

function makeFallbackDungeon(): GameMap {
  const width = 25;
  const height = 20;
  const tiles: MapTile[] = new Array(width * height).fill("wall");

  const setTile = (x: number, y: number, tile: MapTile) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      tiles[y * width + x] = tile;
    }
  };

  const carveRoom = (x: number, y: number, w: number, h: number) => {
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        setTile(rx, ry, "floor");
      }
    }
  };

  const carveCorridor = (x1: number, y1: number, x2: number, y2: number) => {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      setTile(x, y1, "floor");
    }
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      setTile(x2, y, "floor");
    }
  };

  // Simple 3-room dungeon
  carveRoom(2, 2, 7, 5);
  carveRoom(12, 8, 6, 5);
  carveRoom(2, 13, 7, 5);

  carveCorridor(5, 7, 15, 10);
  carveCorridor(5, 13, 15, 11);

  setTile(5, 5, "chest");
  setTile(14, 10, "door");

  const rooms: Room[] = [
    {
      id: "entrance",
      name: "Entrance",
      description: "A dark stone chamber. Your adventure begins here.",
      bounds: { x: 2, y: 2, width: 7, height: 5 },
    },
    {
      id: "central",
      name: "Central Hall",
      description: "A larger chamber with high ceilings.",
      bounds: { x: 12, y: 8, width: 6, height: 5 },
    },
    {
      id: "vault",
      name: "Vault",
      description: "An ancient storage room.",
      bounds: { x: 2, y: 13, width: 7, height: 5 },
    },
  ];

  return { width, height, tiles, rooms };
}
