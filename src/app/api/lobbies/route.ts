import { NextRequest } from "next/server";

// In-memory storage (in production, use a database)
type Lobby = {
  id: string;
  name: string;
  host: string;
  password?: string;
  maxPlayers: number;
  players: Array<{ name: string; id: string }>;
  createdAt: number;
};

// Use global storage to share between routes
if (!(global as any).lobbies) {
  (global as any).lobbies = new Map<string, Lobby>();
}

const getLobbies = () => (global as any).lobbies as Map<string, Lobby>;

// Clean up old lobbies (older than 1 hour) and empty lobbies
if (!(global as any).lobbyCleanupStarted) {
  (global as any).lobbyCleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    const lobbies = getLobbies();
    for (const [id, lobby] of lobbies.entries()) {
      // Delete if older than 1 hour OR if no players
      if (now - lobby.createdAt > 3600000 || lobby.players.length === 0) {
        lobbies.delete(id);
      }
    }
  }, 60000);
}

export const runtime = "nodejs";

// GET /api/lobbies - List all lobbies
export async function GET() {
  const lobbies = getLobbies();
  
  // Filter out empty lobbies and clean them up immediately
  const publicLobbies = Array.from(lobbies.values())
    .filter(lobby => {
      if (lobby.players.length === 0) {
        lobbies.delete(lobby.id);
        return false;
      }
      return true;
    })
    .map(lobby => ({
      id: lobby.id,
      name: lobby.name,
      host: lobby.host,
      playerCount: lobby.players.length,
      maxPlayers: lobby.maxPlayers,
      hasPassword: !!lobby.password,
    }));

  return Response.json({ lobbies: publicLobbies });
}

// POST /api/lobbies - Create a new lobby
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, password, maxPlayers, hostName } = body;

    if (!name || !hostName) {
      return Response.json({ error: "Name and host name required" }, { status: 400 });
    }

    const lobbyId = `lobby-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const lobby: Lobby = {
      id: lobbyId,
      name,
      host: hostName,
      password,
      maxPlayers: maxPlayers || 4,
      players: [{ name: hostName, id: playerId }],
      createdAt: Date.now(),
    };

    const lobbies = getLobbies();
    lobbies.set(lobbyId, lobby);

    return Response.json({ 
      lobbyId, 
      playerId,
      message: "Lobby created successfully" 
    });
  } catch (err) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
