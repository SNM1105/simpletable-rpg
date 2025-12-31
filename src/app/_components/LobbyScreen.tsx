"use client";

import * as React from "react";

type Lobby = {
  id: string;
  name: string;
  host: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
};

export function LobbyScreen({ onJoinLobby }: { onJoinLobby: (lobbyId: string, playerName: string) => void }) {
  const [view, setView] = React.useState<'browse' | 'create' | 'join'>('browse');
  const [lobbies, setLobbies] = React.useState<Lobby[]>([]);
  const [selectedLobby, setSelectedLobby] = React.useState<Lobby | null>(null);
  const [playerName, setPlayerName] = React.useState("");
  const [lobbyName, setLobbyName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [maxPlayers, setMaxPlayers] = React.useState(4);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    // Fetch lobbies
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLobbies = async () => {
    try {
      const res = await fetch('/api/lobbies');
      if (res.ok) {
        const data = await res.json();
        setLobbies(data.lobbies || []);
      }
    } catch (err) {
      console.error('Failed to fetch lobbies:', err);
    }
  };

  const handleCreateLobby = async () => {
    if (!lobbyName.trim() || !playerName.trim()) {
      setError("Lobby name and player name are required");
      return;
    }

    try {
      const res = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lobbyName,
          password: password || undefined,
          maxPlayers,
          hostName: playerName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onJoinLobby(data.lobbyId, playerName);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create lobby");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  const handleJoinLobby = async () => {
    if (!selectedLobby || !playerName.trim()) {
      setError("Please select a lobby and enter your name");
      return;
    }

    try {
      const res = await fetch(`/api/lobbies/${selectedLobby.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          password: password || undefined,
        }),
      });

      if (res.ok) {
        onJoinLobby(selectedLobby.id, playerName);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to join lobby");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  if (view === 'create') {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-linear-to-br from-stone-900 via-stone-800 to-stone-900 text-foreground p-4">
        <div className="w-full max-w-md space-y-4 sm:space-y-6 rounded-lg border border-foreground/20 bg-background/50 p-4 sm:p-8 backdrop-blur">
          <h2 className="text-2xl font-bold">Create Lobby</h2>
          
          {error && (
            <div className="rounded bg-red-500/20 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full rounded border border-foreground/20 bg-foreground/5 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Lobby Name</label>
              <input
                type="text"
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                className="w-full rounded border border-foreground/20 bg-foreground/5 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Epic Adventure"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Password (Optional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-foreground/20 bg-foreground/5 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Leave empty for public"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Max Players</label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full rounded border border-foreground/20 bg-foreground/5 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
                <option value={5}>5 Players</option>
                <option value={6}>6 Players</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateLobby}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Create Lobby
            </button>
            <button
              onClick={() => setView('browse')}
              className="rounded-lg bg-foreground/10 px-4 py-2 font-medium hover:bg-foreground/20"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'join' && selectedLobby) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-linear-to-br from-stone-900 via-stone-800 to-stone-900 text-foreground p-4">
        <div className="w-full max-w-md space-y-4 sm:space-y-6 rounded-lg border border-foreground/20 bg-background/50 p-4 sm:p-8 backdrop-blur">
          <h2 className="text-2xl font-bold">Join {selectedLobby.name}</h2>
          
          {error && (
            <div className="rounded bg-red-500/20 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full rounded border border-foreground/20 bg-foreground/5 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>

            {selectedLobby.hasPassword && (
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-foreground/20 bg-foreground/5 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter lobby password"
                />
              </div>
            )}

            <div className="rounded border border-foreground/20 bg-foreground/5 px-3 py-2">
              <div className="text-sm text-foreground/70">Host: {selectedLobby.host}</div>
              <div className="text-sm text-foreground/70">Players: {selectedLobby.playerCount}/{selectedLobby.maxPlayers}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleJoinLobby}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Join Lobby
            </button>
            <button
              onClick={() => {
                setView('browse');
                setSelectedLobby(null);
              }}
              className="rounded-lg bg-foreground/10 px-4 py-2 font-medium hover:bg-foreground/20"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-linear-to-br from-stone-900 via-stone-800 to-stone-900 text-foreground p-3 sm:p-6">
      <div className="w-full max-w-4xl space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Game Lobbies</h1>
          <button
            onClick={() => setView('create')}
            className="rounded-lg bg-blue-600 px-4 sm:px-6 py-2 font-medium text-white hover:bg-blue-700 whitespace-nowrap"
          >
            Create Lobby
          </button>
        </div>

        <div className="rounded-lg border border-foreground/20 bg-background/50 backdrop-blur">
          {lobbies.length === 0 ? (
            <div className="p-12 text-center text-foreground/50">
              <div className="text-4xl mb-4">🎲</div>
              <p>No lobbies available</p>
              <p className="text-sm mt-2">Create one to start playing!</p>
            </div>
          ) : (
            <div className="divide-y divide-foreground/10">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="flex items-center justify-between p-4 hover:bg-foreground/5 cursor-pointer"
                  onClick={() => {
                    setSelectedLobby(lobby);
                    setView('join');
                    setError("");
                    setPassword("");
                  }}
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {lobby.name}
                      {lobby.hasPassword && <span className="text-xs">🔒</span>}
                    </div>
                    <div className="text-sm text-foreground/70">
                      Host: {lobby.host}
                    </div>
                  </div>
                  <div className="text-sm text-foreground/70">
                    {lobby.playerCount}/{lobby.maxPlayers} players
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-sm text-foreground/50">
          Lobbies refresh every 5 seconds
        </div>
      </div>
    </div>
  );
}
