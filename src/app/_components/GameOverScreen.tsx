"use client";

import * as React from "react";

export function GameOverScreen({ onNewGame }: { onNewGame: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="relative mx-4 max-w-2xl rounded-lg border-2 border-red-500/50 bg-linear-to-b from-red-950/90 to-black p-8 text-center shadow-2xl">
        {/* Dramatic glow effect */}
        <div className="absolute inset-0 z-0 animate-pulse rounded-lg bg-red-500/20 blur-xl"></div>
        
        {/* Skull icon */}
        <div className="mb-6 text-8xl">💀</div>
        
        {/* Title */}
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-red-500">
          Game Over
        </h1>
        
        {/* Message */}
        <p className="mb-8 text-xl text-foreground/80">
          Your adventure has come to an end.
        </p>
        
        {/* Stats/flavor text */}
        <div className="mb-8 rounded-md border border-foreground/10 bg-black/40 p-4">
          <p className="text-sm italic text-foreground/60">
            "Death is only the beginning of a new adventure..."
          </p>
        </div>
        
        {/* New Game button */}
        <button
          onClick={onNewGame}
          className="group relative overflow-hidden rounded-lg border-2 border-red-500 bg-red-950 px-8 py-4 text-lg font-semibold text-red-100 transition-all hover:bg-red-900 hover:shadow-lg hover:shadow-red-500/50"
        >
          <span className="relative z-10">Start New Adventure</span>
          <div className="absolute inset-0 z-0 bg-linear-to-r from-transparent via-red-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
        </button>
      </div>
    </div>
  );
}
