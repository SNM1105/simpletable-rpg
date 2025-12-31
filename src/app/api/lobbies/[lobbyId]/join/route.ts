import { NextRequest } from "next/server";

export const runtime = "nodejs";

type Lobby = {
  id: string;
  name: string;
  host: string;
  password?: string;
  maxPlayers: number;
  players: Array<{ name: string; id: string }>;
  createdAt: number;
};

// Access the shared lobbies map from global
function getLobbies(): Map<string, Lobby> {
  if (!(global as any).lobbies) {
    (global as any).lobbies = new Map<string, Lobby>();
  }
  return (global as any).lobbies;
}

// POST /api/lobbies/[lobbyId]/join - Join a lobby
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lobbyId: string }> }
) {
  try {
    const { lobbyId } = await params;
    const body = await req.json();
    const { playerName, password } = body;

    if (!playerName) {
      return Response.json({ error: "Player name required" }, { status: 400 });
    }

    const lobbies = getLobbies();
    const lobby = lobbies.get(lobbyId);

    if (!lobby) {
      return Response.json({ error: "Lobby not found" }, { status: 404 });
    }

    // Check password
    if (lobby.password && lobby.password !== password) {
      return Response.json({ error: "Incorrect password" }, { status: 403 });
    }

    // Check if lobby is full
    if (lobby.players.length >= lobby.maxPlayers) {
      return Response.json({ error: "Lobby is full" }, { status: 400 });
    }

    // Check if player name is already taken
    if (lobby.players.some(p => p.name === playerName)) {
      return Response.json({ error: "Name already taken" }, { status: 400 });
    }

    const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    lobby.players.push({ name: playerName, id: playerId });

    return Response.json({ 
      playerId,
      message: "Joined lobby successfully" 
    });
  } catch (err) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
