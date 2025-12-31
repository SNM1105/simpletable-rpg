"use client";

import * as React from "react";
import { createMulberry32, createTimeSeed } from "@/lib/rules/random/rng";
import { createInitialGameState, type GameState } from "@/lib/game/state";
import { stepPlayerInputWithDm } from "@/lib/game/loopWithDm";
import { ChatPanel } from "@/app/_components/ChatPanel";
import { CombatPanel, MapPanel, PanelShell, SheetPanel } from "@/app/_components/Panels";
import { CommandBar } from "@/app/_components/CommandBar";
import { SetupScreen, type SetupData } from "@/app/_components/SetupScreen";
import { TitleScreen } from "@/app/_components/TitleScreen";
import { LobbyScreen } from "@/app/_components/LobbyScreen";
import { MultiDiceAnimation } from "@/app/_components/DiceAnimation";

export function GameClient() {
  // IMPORTANT: avoid non-deterministic values during the initial render to prevent hydration mismatches.
  // We seed on mount instead.
  const [seed, setSeed] = React.useState(0);
  const rngRef = React.useRef(createMulberry32(0));
  const [state, setState] = React.useState<GameState | null>(null);
  const stateRef = React.useRef(state);
  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [showTitle, setShowTitle] = React.useState(true);
  const [showLobby, setShowLobby] = React.useState(false);
  const [lobbyId, setLobbyId] = React.useState<string | null>(null);
  const [playerName, setPlayerName] = React.useState<string>("");
  const [gameStarted, setGameStarted] = React.useState(false);
  const [streamingText, setStreamingText] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [userInput, setUserInput] = React.useState<string>("");
  const [diceRolls, setDiceRolls] = React.useState<{ sides: number; result: number }[] | null>(null);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => {
    const s = createTimeSeed();
    setSeed(s);
    rngRef.current = createMulberry32(s);
    setReady(true);
  }, []);
  
  // Handle map click movement
  React.useEffect(() => {
    console.log('[GameClient] Setting up map-click-action event listener');
    const handleMapClickAction = async (e: Event) => {
      console.log('[GameClient] map-click-action event received');
      const event = e as CustomEvent<{ x: number; y: number; command: string; actionType: string; targetId?: string }>;
      
      // Use a callback to check current busy state
      setBusy(currentBusy => {
        if (currentBusy) {
          console.log('[GameClient] Ignoring event - busy');
          return currentBusy;
        }
        
        // Process the command
        (async () => {
          if (!stateRef.current) {
            console.log('[GameClient] Ignoring event - no state');
            return;
          }
          
          const { command, actionType, targetId } = event.detail;
          console.log('[GameClient] Processing command:', command, 'actionType:', actionType);
          
          // Update focused enemy if focusing
          let updatedState = stateRef.current;
          if (actionType === 'focus' && targetId) {
            updatedState = {
              ...stateRef.current,
              focusedEnemyId: targetId,
            };
            setState(updatedState);
            stateRef.current = updatedState;
          }
          
          setBusy(true);
          setUserInput(command);
          setIsLoading(true);
          setStreamingText("");
          
          try {
            const result = await stepPlayerInputWithDm(
              updatedState,
              rngRef.current,
              command,
              (chunk) => setStreamingText(chunk)
            );
            
            // Process phases sequentially
            let previousLogLength = updatedState?.log.length || 0;
            
            for (const phase of result.phases) {
              const newDiceLogs = phase.state.log
                .slice(previousLogLength)
                .filter(log => log.kind === "dice");
              
              previousLogLength = phase.state.log.length;
              
              for (const diceLog of newDiceLogs) {
                const diceMatches = diceLog.text.match(/d(\d+)=(\d+)/g);
                
                if (diceMatches) {
                  const rolls = diceMatches.map(match => {
                    const [sides, result] = match.replace('d', '').split('=').map(Number);
                    return { sides, result };
                  });
                  
                  setDiceRolls(rolls);
                  await new Promise(resolve => setTimeout(resolve, 2500 * rolls.length));
                  setDiceRolls(null);
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              }
              
              setState(phase.state);
              stateRef.current = phase.state;
              
              if (phase.dmResponse) {
                setStreamingText(phase.dmResponse);
                setIsLoading(false);
                await new Promise(resolve => setTimeout(resolve, Math.max(1500, phase.dmResponse.length * 10)));
                
                const withDmResponse = {
                  ...phase.state,
                  log: [...phase.state.log, {
                    id: `${Date.now()}-dm-${Math.random()}`,
                    at: Date.now(),
                    kind: 'dm' as const,
                    text: phase.dmResponse
                  }]
                };
                setState(withDmResponse);
                stateRef.current = withDmResponse;
                setStreamingText("");
              }
              
              if (result.phases.indexOf(phase) < result.phases.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
            
            setUserInput("");
          } finally {
            setBusy(false);
          }
        })();
        
        return currentBusy;
      });
    };
    
    document.addEventListener('map-click-action', handleMapClickAction);
    return () => document.removeEventListener('map-click-action', handleMapClickAction);
  }, []);

  const handleSetupComplete = async (setupData: SetupData) => {
    const initial = await createInitialGameState(seed, setupData.playerCharacter, setupData.campaignPrompt);
    setState(initial);
    stateRef.current = initial;
    setGameStarted(true);
  };

  if (showTitle) {
    return <TitleScreen onStart={() => {
      setShowTitle(false);
      setShowLobby(true);
    }} />;
  }

  if (showLobby) {
    return <LobbyScreen onJoinLobby={(lid, pname) => {
      setLobbyId(lid);
      setPlayerName(pname);
      setShowLobby(false);
    }} />;
  }

  if (!ready || !gameStarted || !state) {
    return <SetupScreen onStart={handleSetupComplete} />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-foreground/10 px-3 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between gap-2 sm:gap-4">
          <h1 className="text-sm sm:text-base font-semibold tracking-tight">SimpleTable RPG</h1>
          <div className="text-xs text-foreground/70" suppressHydrationWarning>
            Seed: {ready ? seed : "—"}
          </div>
        </div>
      </header>

      <main className="mx-auto flex h-0 w-full max-w-7xl flex-1 flex-col lg:flex-row gap-2 sm:gap-4 overflow-hidden px-2 sm:px-6 py-2 sm:py-4">
        {/* Left: Narrative */}
        <div className="flex w-full lg:w-80 lg:min-w-80 flex-col min-h-0">
          <PanelShell title="Narrative">
            <ChatPanel state={state} streamingText={streamingText} isLoading={isLoading} userInput={userInput} />
          </PanelShell>
        </div>

        {/* Center: Map (largest) */}
        <div className="flex flex-1 flex-col min-h-0">
          <PanelShell title="Dungeon Map">
            <MapPanel 
              state={state} 
              onMapClick={(x, y, command, actionType, targetId) => {
                console.log('[GameClient] onMapClick called - x:', x, 'y:', y, 'command:', command, 'actionType:', actionType, 'busy:', busy, 'ready:', ready);
                
                // Handle focus action without triggering full game loop
                if (actionType === 'focus' && targetId) {
                  const creature = state.creatures[targetId];
                  if (creature && stateRef.current) {
                    const updatedState = { ...stateRef.current, focusedEnemyId: targetId };
                    setState(updatedState);
                    stateRef.current = updatedState;
                    console.log('[GameClient] Focused on:', creature.name);
                  }
                  return;
                }
                
                // Handle attack action - focus on enemy and dispatch command
                if (actionType === 'attack' && targetId) {
                  const creature = state.creatures[targetId];
                  if (creature && stateRef.current) {
                    const updatedState = { ...stateRef.current, focusedEnemyId: targetId };
                    setState(updatedState);
                    stateRef.current = updatedState;
                    console.log('[GameClient] Focused on target for attack:', creature.name);
                    
                    // Dispatch the attack command
                    if (!busy && ready) {
                      console.log('[GameClient] Dispatching attack command:', command);
                      document.dispatchEvent(new CustomEvent('map-click-action', { 
                        detail: { x, y, command, actionType: 'attack', targetId } 
                      }));
                    }
                  }
                  return;
                }
                
                if (!busy && ready) {
                  console.log('[GameClient] Dispatching map-click-action event');
                  document.dispatchEvent(new CustomEvent('map-click-action', { 
                    detail: { x, y, command, actionType, targetId } 
                  }));
                } else {
                  console.log('[GameClient] Ignoring click - busy:', busy, 'ready:', ready);
                }
              }}
              onCommandSubmit={async (text) => {
                if (busy || !ready || !stateRef.current) return;
                setBusy(true);
                setUserInput(text);
                setIsLoading(true);
                setStreamingText("");
                try {
                  const result = await stepPlayerInputWithDm(
                    stateRef.current, 
                    rngRef.current, 
                    text,
                    (chunk) => setStreamingText(chunk)
                  );
                  
                  // Process each phase sequentially (player, then each NPC)
                  let previousLogLength = stateRef.current?.log.length || 0;
                  
                  for (const phase of result.phases) {
                    // Find new dice log entries added in this phase
                    const newDiceLogs = phase.state.log
                      .slice(previousLogLength)
                      .filter(log => log.kind === "dice");
                    
                    previousLogLength = phase.state.log.length;
                    
                    // Animate each dice roll sequentially
                    for (const diceLog of newDiceLogs) {
                      const diceMatches = diceLog.text.match(/d(\d+)=(\d+)/g);
                      
                      if (diceMatches) {
                        const rolls = diceMatches.map(match => {
                          const [sides, result] = match.replace('d', '').split('=').map(Number);
                          return { sides, result };
                        });
                        
                        setDiceRolls(rolls);
                        await new Promise(resolve => setTimeout(resolve, 2500 * rolls.length));
                        setDiceRolls(null);
                        await new Promise(resolve => setTimeout(resolve, 300));
                      }
                    }
                    
                    setState(phase.state);
                    stateRef.current = phase.state;
                    
                    if (phase.dmResponse) {
                      setStreamingText(phase.dmResponse);
                      setIsLoading(false);
                      await new Promise(resolve => setTimeout(resolve, Math.max(1500, phase.dmResponse.length * 10)));
                      
                      const withDmResponse = {
                        ...phase.state,
                        log: [...phase.state.log, {
                          id: `${Date.now()}-dm-${Math.random()}`,
                          at: Date.now(),
                          kind: 'dm' as const,
                          text: phase.dmResponse
                        }]
                      };
                      setState(withDmResponse);
                      stateRef.current = withDmResponse;
                      setStreamingText("");
                    }
                    
                    if (result.phases.indexOf(phase) < result.phases.length - 1) {
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  }
                  
                  setUserInput("");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </PanelShell>
        </div>

        {/* Right: Character + Combat */}
        <div className="hidden lg:flex w-80 min-w-80 flex-col gap-4">
          <div className="flex h-0 flex-1 flex-col overflow-hidden">
            <PanelShell title="Character Sheet">
              <SheetPanel state={state} />
            </PanelShell>
          </div>
          <div className="flex h-0 flex-1 flex-col overflow-hidden">
            <PanelShell title="Combat / Log">
              <CombatPanel state={state} />
            </PanelShell>
          </div>
        </div>
      </main>

      <div className="mx-auto w-full max-w-7xl shrink-0 px-2 sm:px-6 pb-2 sm:pb-4">
        <CommandBar
          disabled={busy || !ready}
          onSubmit={async (text) => {
            if (busy || !ready || !stateRef.current) return;
            setBusy(true);
            setUserInput(text);
            setIsLoading(true);
            setStreamingText("");
            try {
              const result = await stepPlayerInputWithDm(
                stateRef.current, 
                rngRef.current, 
                text,
                (chunk) => setStreamingText(chunk)
              );
              
              // Process each phase sequentially (player, then each NPC)
              let previousLogLength = stateRef.current?.log.length || 0;
              
              for (const phase of result.phases) {
                // Find new dice log entries added in this phase
                const newDiceLogs = phase.state.log
                  .slice(previousLogLength)
                  .filter(log => log.kind === "dice");
                
                previousLogLength = phase.state.log.length;
                
                // Animate each dice roll sequentially
                for (const diceLog of newDiceLogs) {
                  const diceMatches = diceLog.text.match(/d(\d+)=(\d+)/g);
                  
                  if (diceMatches) {
                    const rolls = diceMatches.map(match => {
                      const [sides, result] = match.replace('d', '').split('=').map(Number);
                      return { sides, result };
                    });
                    
                    // Show dice animation
                    setDiceRolls(rolls);
                    
                    // Wait for animation to complete
                    await new Promise(resolve => setTimeout(resolve, 2500 * rolls.length));
                    setDiceRolls(null);
                    
                    // Small pause between animations
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }
                }
                
                // Update state to this phase
                setState(phase.state);
                stateRef.current = phase.state;
                
                // Show DM narration for this phase
                setStreamingText(phase.dmResponse);
                setIsLoading(false);
                
                // Wait for narration to complete
                await new Promise(resolve => setTimeout(resolve, Math.max(1500, phase.dmResponse.length * 10)));
                
                // Add DM response to log
                const withDmResponse = {
                  ...phase.state,
                  log: [...phase.state.log, {
                    id: `${Date.now()}-dm-${Math.random()}`,
                    at: Date.now(),
                    kind: 'dm' as const,
                    text: phase.dmResponse
                  }]
                };
                setState(withDmResponse);
                stateRef.current = withDmResponse;
                setStreamingText("");
                
                // Pause between phases
                if (result.phases.indexOf(phase) < result.phases.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
              
              setUserInput("");
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
      
      {/* Dice animation overlay */}
      {diceRolls && (
        <MultiDiceAnimation 
          rolls={diceRolls} 
          onComplete={() => setDiceRolls(null)} 
        />
      )}
    </div>
  );
}
