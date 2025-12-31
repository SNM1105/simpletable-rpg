"use client";

import * as React from "react";

export function TitleScreen({ onStart }: { onStart: () => void }) {
  const [isStarting, setIsStarting] = React.useState(false);

  const handleStart = () => {
    setIsStarting(true);
    // Wait for animation to complete before transitioning
    setTimeout(() => {
      onStart();
    }, 800);
  };

  return (
    <div className={`flex h-screen flex-col items-center justify-center bg-linear-to-br from-stone-900 via-stone-800 to-stone-900 text-foreground transition-all duration-700 p-4 ${
      isStarting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
    }`}>
      <div className={`flex flex-col items-center gap-6 sm:gap-8 px-4 sm:px-6 text-center transition-all duration-500 ${
        isStarting ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'
      }`}>
        {/* Title */}
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white drop-shadow-2xl">
            SimpleTable RPG
          </h1>
          <p className="text-lg sm:text-xl text-stone-300">
            AI-Driven Tabletop Adventures
          </p>
        </div>

        {/* Decorative element */}
        <div className="text-5xl sm:text-6xl opacity-50">
          ⚔️
        </div>

        {/* Description */}
        <p className="max-w-md text-sm sm:text-base text-stone-400 px-4">
          Experience epic adventures powered by AI narration and 5e SRD rules.
          Create your hero, explore dungeons, battle monsters, and forge your legend.
        </p>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isStarting}
          className={`group relative overflow-hidden rounded-lg bg-blue-600 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-2xl shadow-blue-900/50 transition-all hover:bg-blue-700 hover:scale-105 hover:shadow-blue-900/70 disabled:cursor-not-allowed ${
            isStarting ? 'animate-pulse scale-110' : ''
          }`}
        >
          <span className="relative z-10">{isStarting ? 'Embarking...' : 'Start Your Adventure'}</span>
          <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        </button>

        {/* Footer hint */}
        <div className="mt-4 sm:mt-8 text-xs text-stone-500">
          Powered by Groq AI • Based on 5e SRD
        </div>
      </div>
    </div>
  );
}
