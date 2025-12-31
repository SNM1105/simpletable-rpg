import { groqChat } from "./groqClient";
import type { MapSpec, MapType, RoomSpec, TerrainType } from "./mapSpec";
import { buildMapFromSpec, createFallbackDungeon } from "./mapBuilder";
import type { GridMap } from "./mapSpec";

/**
 * AI-Powered Map Specification Generator
 * Uses Ollama to generate structured JSON map specifications
 */

function determineMapType(prompt: string): MapType {
  const lower = prompt.toLowerCase();
  
  if (/(dungeon|cave|crypt|tomb|underground|castle|fortress)/.test(lower)) {
    return "dungeon";
  }
  if (/(town|village|city|market|settlement)/.test(lower)) {
    return "town";
  }
  if (/(forest|wilderness|jungle|desert|mountain|plain|swamp)/.test(lower)) {
    return "wilderness";
  }
  
  return "mixed";
}

function getSystemPrompt(): string {
  return `You are an expert D&D map architect. Generate ONLY valid JSON map specifications.

OUTPUT FORMAT (strict JSON only):
{
  "map_type": "dungeon" | "town" | "wilderness" | "mixed",
  "grid_size": {"width": 25, "height": 20},
  "rooms": [
    {
      "id": "room1",
      "name": "Room Name",
      "description": "Detailed description",
      "x": 2,
      "y": 2,
      "width": 6,
      "height": 5,
      "purpose": "entrance|combat|treasure|safe|merchant|boss",
      "terrain": "floor|grass|water|..."
    }
  ],
  "corridors": [
    {"from": "room1", "to": "room2", "width": 1}
  ],
  "doors": [
    {"x": 5, "y": 3, "locked": false, "trapped": false, "secret": false}
  ],
  "special_features": [
    {"type": "trap", "x": 10, "y": 10, "description": "Poison dart trap", "dangerous": true}
  ]
}

TERRAIN TYPES:
- Dungeons: "floor" (walkable), "wall" (blocks), "door", "trap", "chest", "stairs", "pillar"
- Outdoor: "grass" (walkable), "tree" (blocks), "water" (blocks), "road" (walkable), "building" (blocks), "rock" (blocks)

MAP RULES:
- Grid: 25 wide × 20 tall
- Rooms: 3-5 rooms, each 4-8 wide × 4-6 tall
- No overlapping rooms (dungeons)
- All rooms must be connected via corridors or adjacency
- Stay within bounds: x + width ≤ 25, y + height ≤ 20
- Place features IN rooms, not in walls

EXAMPLE - Fantasy Dungeon:
{
  "map_type": "dungeon",
  "grid_size": {"width": 25, "height": 20},
  "rooms": [
    {"id": "entrance", "name": "Entry Hall", "description": "Torch-lit stone chamber", "x": 2, "y": 2, "width": 6, "height": 5, "purpose": "entrance", "terrain": "floor"},
    {"id": "main", "name": "Great Hall", "description": "Vaulted ceiling chamber", "x": 10, "y": 8, "width": 8, "height": 7, "purpose": "combat", "terrain": "floor"},
    {"id": "treasure", "name": "Vault", "description": "Gold piles glitter", "x": 18, "y": 3, "width": 5, "height": 4, "purpose": "treasure", "terrain": "floor"}
  ],
  "corridors": [
    {"from": "entrance", "to": "main", "width": 1},
    {"from": "main", "to": "treasure", "width": 1}
  ],
  "doors": [
    {"x": 8, "y": 4, "locked": false},
    {"x": 17, "y": 5, "locked": true}
  ],
  "special_features": [
    {"type": "trap", "x": 12, "y": 10, "description": "Pressure plate", "dangerous": true}
  ]
}

EXAMPLE - Forest Village:
{
  "map_type": "town",
  "grid_size": {"width": 25, "height": 20},
  "rooms": [
    {"id": "square", "name": "Town Square", "description": "Bustling market center", "x": 8, "y": 6, "width": 7, "height": 6, "purpose": "merchant", "terrain": "grass"},
    {"id": "homes", "name": "Residential", "description": "Cozy cottages", "x": 2, "y": 10, "width": 5, "height": 6, "purpose": "safe", "terrain": "grass"},
    {"id": "forest", "name": "Woods", "description": "Dense trees", "x": 16, "y": 2, "width": 7, "height": 8, "purpose": "exploration", "terrain": "grass"}
  ],
  "special_features": [
    {"type": "poi", "x": 10, "y": 8, "description": "Fountain", "dangerous": false},
    {"type": "poi", "x": 4, "y": 12, "description": "Inn", "dangerous": false}
  ]
}

CRITICAL: Return ONLY the JSON object. No markdown, no explanation, no extra text.`;
}

function getUserPrompt(campaignPrompt: string, mapType: MapType): string {
  return `Generate a ${mapType} map for this scenario:

"${campaignPrompt}"

Requirements:
- Create 3-5 interconnected areas
- Match the theme EXACTLY (if they say forest, use trees/grass, not dungeons)
- All rooms must fit in 25×20 grid
- ${mapType === "dungeon" ? "Include corridors between rooms, add doors and traps" : "Use natural terrain, add points of interest"}
- Place special features that enhance the narrative

Return ONLY valid JSON matching the schema.`;
}

function extractJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  
  // Try to find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  return cleaned.trim();
}

export async function generateMapSpec(campaignPrompt: string): Promise<MapSpec> {
  const mapType = determineMapType(campaignPrompt);
  
  console.log(`[MapGen] Generating ${mapType} map for: "${campaignPrompt}"`);
  
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY not configured");
    }

    const fullContent = await groqChat(
      apiKey,
      process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: getUserPrompt(campaignPrompt, mapType) },
      ],
      0.7,
      2000
    );
    
    console.log("[MapGen] Raw AI response:", fullContent);
    
    const jsonText = extractJSON(fullContent);
    console.log("[MapGen] Extracted JSON:", jsonText);
    
    const spec = JSON.parse(jsonText) as MapSpec;
    
    // Validate basic structure
    if (!spec.rooms || spec.rooms.length === 0) {
      throw new Error("No rooms in generated spec");
    }
    
    // Ensure grid_size is set
    if (!spec.grid_size) {
      spec.grid_size = { width: 25, height: 20 };
    }
    
    // Ensure map_type is set
    if (!spec.map_type) {
      spec.map_type = mapType;
    }
    
    console.log(`[MapGen] Successfully generated spec with ${spec.rooms.length} rooms`);
    
    return spec;
    
  } catch (error) {
    console.error("[MapGen] Failed to generate map spec:", error);
    throw error;
  }
}

/**
 * Main entry point: Generate complete GridMap from campaign prompt
 */
export async function generateCampaignMap(
  campaignPrompt: string, 
  width: number = 25, 
  height: number = 20
): Promise<GridMap> {
  try {
    // Generate spec from AI
    const spec = await generateMapSpec(campaignPrompt);
    
    // Override grid size if specified
    if (width !== 25 || height !== 20) {
      spec.grid_size = { width, height };
    }
    
    // Build grid from spec
    const gridMap = buildMapFromSpec(spec);
    
    console.log(`[MapGen] Built grid map: ${gridMap.width}×${gridMap.height}, ${gridMap.rooms.length} rooms`);
    
    return gridMap;
    
  } catch (error) {
    console.error("[MapGen] Failed to generate campaign map, using fallback:", error);
    return createFallbackDungeon();
  }
}
