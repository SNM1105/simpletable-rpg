"use client";

import * as React from "react";
import type { GameState } from "@/lib/game/state";

export function ChatPanel({ state, streamingText, isLoading, userInput }: { state: GameState; streamingText?: string; isLoading?: boolean; userInput?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [animatedText, setAnimatedText] = React.useState("");
  const animationRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [narrationEnabled, setNarrationEnabled] = React.useState(false);
  const lastNarratedTextRef = React.useRef<string>("");

  // Text-to-speech for DM responses
  React.useEffect(() => {
    if (!narrationEnabled || !streamingText || streamingText === lastNarratedTextRef.current) {
      return;
    }

    // Only narrate when streaming is complete (text hasn't changed for a bit)
    const timer = setTimeout(() => {
      if (streamingText && streamingText !== lastNarratedTextRef.current) {
        // Cancel any existing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(streamingText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
        lastNarratedTextRef.current = streamingText;
      }
    }, 500); // Wait 500ms after text stops changing

    return () => clearTimeout(timer);
  }, [streamingText, narrationEnabled]);

  // Stop speech when component unmounts or narration disabled
  React.useEffect(() => {
    if (!narrationEnabled && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [narrationEnabled, isSpeaking]);

  // Animate letter-by-letter when streaming text arrives
  React.useEffect(() => {
    if (!streamingText) {
      setAnimatedText("");
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    setAnimatedText("");
    let index = 0;
    
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    animationRef.current = setInterval(() => {
      if (index < streamingText.length) {
        setAnimatedText(streamingText.slice(0, index + 1));
        index++;
      } else {
        if (animationRef.current) {
          clearInterval(animationRef.current);
          animationRef.current = null;
        }
      }
    }, 10); // 10ms per character for quick typing
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [streamingText]);

  React.useEffect(() => {
    // Auto-scroll to bottom of the container when new messages arrive or streaming updates
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [state.log.length, animatedText, userInput, isLoading]);

  return (
    <div className="flex h-full flex-col">
      {/* Narration Toggle */}
      <div className="shrink-0 mb-2 flex items-center justify-between border-b border-foreground/10 pb-2">
        <div className="text-xs text-foreground/70">Narrative</div>
        <button
          onClick={() => {
            setNarrationEnabled(!narrationEnabled);
            if (narrationEnabled) {
              window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }
          }}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
            narrationEnabled 
              ? 'bg-blue-600 text-white' 
              : 'bg-foreground/10 text-foreground/70 hover:bg-foreground/20'
          }`}
        >
          <span>{narrationEnabled ? '🔊' : '🔇'}</span>
          <span>{narrationEnabled ? 'Narrator On' : 'Narrator Off'}</span>
          {isSpeaking && <span className="animate-pulse">●</span>}
        </button>
      </div>
      
      <div ref={containerRef} className="flex-1 space-y-2 overflow-y-auto">
      {state.log.map((m) => {
        // Special styling for loot boxes
        if (m.kind === "loot") {
          return (
            <div key={m.id} className="rounded-md border-2 border-yellow-500/50 bg-yellow-500/10 px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600">
                <span>💰</span>
                <span>Loot Acquired</span>
              </div>
              {m.items && m.items.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {m.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="text-yellow-600">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-sm italic text-foreground/60">Nothing of value.</div>
              )}
            </div>
          );
        }
        
        const tone =
          m.kind === "player"
            ? "bg-foreground/5"
            : m.kind === "dice"
              ? "bg-foreground/10"
              : m.kind === "system"
                ? "bg-foreground/5"
                : "bg-background";
        const label = m.kind === "player" ? "You" : m.kind === "dm" ? "DM" : m.kind === "dice" ? "Dice" : "System";
        return (
          <div key={m.id} className={`rounded-md border border-foreground/10 px-3 py-2 ${tone}`}>
            <div className="text-xs font-medium text-foreground/70">{label}</div>
            <div className="mt-1 whitespace-pre-wrap text-sm leading-6">{m.text}</div>
          </div>
        );
      })}
      {userInput && (
        <div className="rounded-md border border-foreground/10 bg-foreground/5 px-3 py-2">
          <div className="text-xs font-medium text-foreground/70">You</div>
          <div className="mt-1 whitespace-pre-wrap text-sm leading-6">{userInput}</div>
        </div>
      )}
      {isLoading && !streamingText && (
        <div className="rounded-md border border-foreground/10 bg-background px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground/70">
            <span>DM</span>
            <span className="inline-flex gap-1">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse delay-75">●</span>
              <span className="animate-pulse delay-150">●</span>
            </span>
          </div>
        </div>
      )}
      {streamingText && (
        <div className="rounded-md border border-foreground/10 bg-background px-3 py-2">
          <div className="text-xs font-medium text-foreground/70">DM</div>
          <div className="mt-1 whitespace-pre-wrap text-sm leading-6">{animatedText}</div>
        </div>
      )}
    </div>
    </div>
  );
}
