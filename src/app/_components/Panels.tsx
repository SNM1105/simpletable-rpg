"use client";

import * as React from "react";
import type { GameState } from "@/lib/game/state";
import { getHPStatus } from "@/lib/rules/dnd5eHelpers";

// Visual dice roller component
function DiceRoller({ rolls, rollType, wasCritical, wasCriticalFail }: { 
  rolls: { sides: number; result: number }[]; 
  rollType?: "normal" | "advantage" | "disadvantage";
  wasCritical?: boolean;
  wasCriticalFail?: boolean;
}) {
  const [rolling, setRolling] = React.useState(true);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setRolling(false), 600);
    return () => clearTimeout(timer);
  }, [rolls]);
  
  return (
    <div className="flex items-center gap-2">
      {rolls.map((roll, idx) => (
        <div
          key={idx}
          className={`relative flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all duration-300 ${
            rolling ? "animate-bounce" : ""
          } ${
            wasCritical
              ? "border-yellow-400 bg-yellow-400/20 text-yellow-400 shadow-lg shadow-yellow-400/50"
              : wasCriticalFail
              ? "border-red-500 bg-red-500/20 text-red-500 shadow-lg shadow-red-500/50"
              : "border-foreground/30 bg-foreground/5"
          }`}
        >
          {roll.result}
          {wasCritical && idx === 0 && <span className="absolute -right-1 -top-1 text-xs">⚡</span>}
          {wasCriticalFail && idx === 0 && <span className="absolute -right-1 -top-1 text-xs">💀</span>}
        </div>
      ))}
      {rollType === "advantage" && (
        <span className="text-xs font-medium text-green-500">ADV</span>
      )}
      {rollType === "disadvantage" && (
        <span className="text-xs font-medium text-red-500">DIS</span>
      )}
    </div>
  );
}

// HP Bar component
function HPBar({ current, max, showNumbers = true }: { current: number; max: number; showNumbers?: boolean }) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const status = getHPStatus(current, max);
  
  const getColor = () => {
    if (percentage > 75) return "bg-green-500";
    if (percentage > 50) return "bg-yellow-500";
    if (percentage > 25) return "bg-orange-500";
    return "bg-red-500";
  };
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        {showNumbers && <span className="text-foreground/70">{current}/{max} HP</span>}
        <span className="text-foreground/50">{status}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Death save indicator
function DeathSaves({ successes, failures }: { successes: number; failures: number }) {
  return (
    <div className="space-y-1 rounded-md border border-red-500/50 bg-red-500/10 px-2 py-1">
      <div className="text-xs font-medium text-red-500">Death Saves</div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-foreground/70">Success:</span>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full border ${
                i <= successes ? "border-green-500 bg-green-500" : "border-foreground/30"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-foreground/70">Failure:</span>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full border ${
                i <= failures ? "border-red-500 bg-red-500" : "border-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-foreground/10 bg-background">
      <header className="flex items-center justify-between border-b border-foreground/10 px-3 py-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2">{children}</div>
    </section>
  );
}

type ContextMenuAction = {
  label: string;
  command: string;
  actionType: 'move' | 'interact' | 'focus' | 'attack';
  targetId?: string;
};

export function MapPanel({ state, onMapClick, onCommandSubmit }: { 
  state: GameState; 
  onMapClick?: (x: number, y: number, command: string, actionType: 'move' | 'interact' | 'focus', targetId?: string) => void;
  onCommandSubmit?: (text: string) => void;
}) {
  const { map, playerPos, creatures, creaturePositions } = state;
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [mapMode, setMapMode] = React.useState<'interact' | 'pan'>('interact');
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    tileX: number;
    tileY: number;
    actions: ContextMenuAction[];
  } | null>(null);
  const [attackInput, setAttackInput] = React.useState<{
    x: number;
    y: number;
    targetName: string;
    targetId: string;
  } | null>(null);
  const [attackText, setAttackText] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Find current room
  const currentRoom = map.rooms.find(room => 
    playerPos.x >= room.bounds.x && 
    playerPos.x < room.bounds.x + room.bounds.width &&
    playerPos.y >= room.bounds.y && 
    playerPos.y < room.bounds.y + room.bounds.height
  );

  // Handle zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mapMode === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Handle drag move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && mapMode === 'pan') {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle click on grid container in interact mode
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mapMode !== 'interact' || !onMapClick) return;
    
    // Don't handle if clicking on a specific tile (they have their own handlers)
    if ((e.target as HTMLElement).classList.contains('map-tile')) {
      return;
    }
  };
  
  // Handle tile click for movement
  const handleTileClick = (e: React.MouseEvent, x: number, y: number) => {
    e.stopPropagation();
    
    console.log('[MapPanel] handleTileClick called - x:', x, 'y:', y, 'mode:', mapMode, 'onMapClick exists:', !!onMapClick);
    
    // Only trigger click in interact mode
    if (mapMode !== 'interact') {
      console.log('[MapPanel] Click ignored - not in interact mode');
      return;
    }
    
    if (!onMapClick) {
      console.log('[MapPanel] Click ignored - onMapClick is undefined');
      return;
    }
    
    console.log('[MapPanel] Processing tile click at', x, y);
    
    const tile = state.map.tiles[y * state.map.width + x];
    console.log('[MapPanel] Tile type:', tile);
    
    // Check if there's a creature at this position
    const creatureAtPos = Object.entries(creaturePositions).find(
      ([id, pos]) => pos.x === x && pos.y === y && id !== state.playerId
    );
    console.log('[MapPanel] Creature at position:', creatureAtPos ? creatureAtPos[0] : 'none');
    
    // Calculate distance from player
    const distance = Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y);
    const isAdjacent = distance <= 1;
    const isPlayerTile = x === playerPos.x && y === playerPos.y;
    console.log('[MapPanel] Distance from player:', distance, 'isPlayerTile:', isPlayerTile, 'playerPos:', playerPos);
    
    if (isPlayerTile) {
      // Clicked on self, just show info (don't return, let it fall through)
      console.log('[MapPanel] Clicked on player tile (ignoring - click elsewhere to move)');
      return;
    }
    
    // Build context menu actions
    const actions: ContextMenuAction[] = [];
    
    console.log('[MapPanel] Checking for creature...');
    // If creature, add creature actions
    if (creatureAtPos) {
      const creatureId = creatureAtPos[0];
      const creature = creatures[creatureId];
      const creaturePos = creaturePositions[creatureId];
      
      if (creature.hp > 0 && creaturePos) {
        actions.push({
          label: `⚔️ Focus on ${creature.name}`,
          command: `focus on ${creature.name}`,
          actionType: 'focus',
          targetId: creatureId,
        });
        actions.push({
          label: `🗡️ Attack ${creature.name}`,
          command: `attack ${creature.name}`,
          actionType: 'focus',
          targetId: creatureId,
        });
        
        // Calculate position 1 square away from creature
        // Choose the closest adjacent position to player's current position
        const adjacentPositions = [
          { x: creaturePos.x - 1, y: creaturePos.y },     // left
          { x: creaturePos.x + 1, y: creaturePos.y },     // right
          { x: creaturePos.x, y: creaturePos.y - 1 },     // up
          { x: creaturePos.x, y: creaturePos.y + 1 },     // down
        ].filter(pos => {
          // Filter out positions that are off-map or walls
          if (pos.x < 0 || pos.x >= map.width || pos.y < 0 || pos.y >= map.height) return false;
          const tile = map.tiles[pos.y * map.width + pos.x];
          return tile === 'floor' || tile === 'grass' || tile === 'road' || tile === 'door';
        });
        
        // Find closest valid position to player
        let sneakTarget = adjacentPositions[0];
        if (adjacentPositions.length > 1) {
          let minDist = Math.abs(playerPos.x - adjacentPositions[0].x) + Math.abs(playerPos.y - adjacentPositions[0].y);
          for (const pos of adjacentPositions.slice(1)) {
            const dist = Math.abs(playerPos.x - pos.x) + Math.abs(playerPos.y - pos.y);
            if (dist < minDist) {
              minDist = dist;
              sneakTarget = pos;
            }
          }
        }
        
        if (sneakTarget) {
          actions.push({
            label: `🤫 Sneak up to ${creature.name}`,
            command: `sneak to ${sneakTarget.x},${sneakTarget.y}`,
            actionType: 'interact',
          });
        }
      }
    }
    
    // If chest, add chest actions
    if (tile === "chest") {
      if (isAdjacent) {
        actions.push({
          label: '📦 Open chest',
          command: 'open chest',
          actionType: 'interact',
        });
        actions.push({
          label: '🔓 Pick the lock',
          command: 'pick the lock on the chest',
          actionType: 'interact',
        });
      }
      actions.push({
        label: '🔍 Examine chest',
        command: `examine the chest at ${x},${y}`,
        actionType: 'interact',
      });
    }
    
    // If door, add door actions
    if (tile === "door") {
      if (isAdjacent) {
        actions.push({
          label: '🚪 Open door',
          command: 'open door',
          actionType: 'interact',
        });
        actions.push({
          label: '🔓 Pick the lock',
          command: 'pick the lock on the door',
          actionType: 'interact',
        });
      }
      actions.push({
        label: '🔍 Examine door',
        command: `examine the door at ${x},${y}`,
        actionType: 'interact',
      });
    }
    
    // Always add movement options for non-player tiles
    if (!isPlayerTile) {
      actions.push({
        label: `🚶 Move to ${x},${y}`,
        command: `move to ${x},${y}`,
        actionType: 'move',
      });
      actions.push({
        label: `🤫 Sneak to ${x},${y}`,
        command: `sneak to ${x},${y}`,
        actionType: 'move',
      });
    }
    
    // Show context menu at click position
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tileX: x,
      tileY: y,
      actions,
    });
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setAttackInput(null);
    };
    if (contextMenu || attackInput) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, attackInput]);
  
  // Handle context menu action selection
  const handleContextMenuAction = (action: ContextMenuAction) => {
    if (!onMapClick || !contextMenu) return;
    
    console.log('[MapPanel] Context menu action:', action.label, 'command:', action.command);
    
    // If it's an attack action, show the attack input bubble instead
    if (action.label.includes('Attack') && action.targetId) {
      const creature = creatures[action.targetId];
      setAttackInput({
        x: contextMenu.x,
        y: contextMenu.y,
        targetName: creature.name,
        targetId: action.targetId,
      });
      setContextMenu(null);
      return;
    }
    
    onMapClick(contextMenu.tileX, contextMenu.tileY, action.command, action.actionType, action.targetId);
    setContextMenu(null);
  };
  
  // Handle attack text submission
  const handleAttackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[MapPanel] handleAttackSubmit called');
    console.log('[MapPanel] attackText:', attackText);
    console.log('[MapPanel] attackInput:', attackInput);
    console.log('[MapPanel] onMapClick exists:', !!onMapClick);
    
    if (!attackText.trim() || !attackInput || !onMapClick) {
      console.log('[MapPanel] Early return - missing data');
      return;
    }
    
    console.log('[MapPanel] Attack submission:', attackText, 'target:', attackInput.targetName, 'targetId:', attackInput.targetId);
    
    // Send attack command with 'focus' actionType to ensure enemy is targeted
    onMapClick(0, 0, attackText, 'attack', attackInput.targetId);
    
    setAttackInput(null);
    setAttackText("");
  };

  // Get tile visual properties with enhanced styling
  const getTileStyle = (tile: string, x: number, y: number) => {
    const isPlayer = x === playerPos.x && y === playerPos.y;
    
    // Check if any creature is at this position
    const creatureAtPos = Object.entries(creaturePositions).find(
      ([id, pos]) => pos.x === x && pos.y === y && id !== state.playerId
    );
    const creature = creatureAtPos ? creatures[creatureAtPos[0]] : null;
    const isFocusedEnemy = creature && state.focusedEnemyId === creature.id;
    
    if (isPlayer) {
      return {
        bg: "bg-gradient-to-br from-blue-400 to-blue-600",
        icon: "⚔️",
        border: "ring-2 ring-blue-300 shadow-lg shadow-blue-500/50",
        extra: "relative after:absolute after:inset-0 after:bg-white/10 after:rounded",
      };
    }
    
    if (creature && creature.hp > 0) {
      const creatureStyle = creature.name.toLowerCase().includes("goblin") 
        ? { bg: "bg-gradient-to-br from-green-600 to-green-800", icon: "👺" }
        : creature.name.toLowerCase().includes("orc")
        ? { bg: "bg-gradient-to-br from-gray-600 to-gray-800", icon: "🗡️" }
        : creature.name.toLowerCase().includes("skeleton")
        ? { bg: "bg-gradient-to-br from-stone-300 to-stone-500", icon: "💀" }
        : creature.name.toLowerCase().includes("zombie")
        ? { bg: "bg-gradient-to-br from-green-700 to-gray-700", icon: "🧟" }
        : creature.name.toLowerCase().includes("dragon")
        ? { bg: "bg-gradient-to-br from-red-600 to-red-900", icon: "🐉" }
        : { bg: "bg-gradient-to-br from-red-600 to-red-800", icon: "👹" };
        
      return {
        ...creatureStyle,
        border: isFocusedEnemy 
          ? "ring-4 ring-yellow-400 ring-offset-1 animate-pulse shadow-lg shadow-yellow-500/50" 
          : "ring-2 ring-red-400 shadow-md shadow-red-500/30",
        extra: "relative after:absolute after:inset-0 after:bg-black/20 after:rounded",
      };
    }
    
    switch (tile) {
      case "wall":
        return { 
          bg: "bg-gradient-to-br from-stone-700 via-stone-800 to-stone-900", 
          icon: "", 
          border: "border border-stone-950/50",
          extra: "shadow-inner",
        };
      case "floor":
        return { 
          bg: "bg-gradient-to-br from-stone-300 via-stone-200 to-stone-300 dark:from-stone-800 dark:via-stone-900 dark:to-stone-800", 
          icon: "", 
          border: "",
          extra: "relative after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.05)_1px,transparent_1px)] after:bg-[length:4px_4px]",
        };
      case "door":
        return { 
          bg: "bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900", 
          icon: "🚪", 
          border: "border-2 border-amber-950",
          extra: "shadow-md relative after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-amber-950",
        };
      case "chest":
        return { 
          bg: "bg-gradient-to-br from-yellow-600 via-amber-700 to-yellow-800", 
          icon: "💎", 
          border: "border-2 border-yellow-900 ring-2 ring-yellow-400/50",
          extra: "shadow-lg shadow-yellow-600/40 animate-pulse",
        };
      case "water":
        return { 
          bg: "bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600", 
          icon: "〰️", 
          border: "",
          extra: "relative overflow-hidden after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3)_2px,transparent_2px)] after:animate-pulse",
        };
      case "pillar":
        return { 
          bg: "bg-gradient-to-br from-stone-500 via-stone-600 to-stone-700", 
          icon: "⬛", 
          border: "border-2 border-stone-800",
          extra: "shadow-lg shadow-stone-900/50",
        };
      case "stairs":
        return { 
          bg: "bg-gradient-to-t from-stone-500 via-stone-400 to-stone-300", 
          icon: "🪜", 
          border: "border border-stone-600",
          extra: "relative after:absolute after:inset-0 after:bg-[linear-gradient(0deg,rgba(0,0,0,0.1)_10%,transparent_10%,transparent_20%,rgba(0,0,0,0.1)_20%)] after:bg-[length:100%_5px]",
        };
      case "trap":
        return { 
          bg: "bg-gradient-to-br from-red-800 via-red-900 to-stone-800", 
          icon: "⚠️", 
          border: "border-2 border-red-950",
          extra: "shadow-inner animate-pulse",
        };
      case "tree":
        return { 
          bg: "bg-gradient-to-br from-green-800 via-green-700 to-green-900", 
          icon: "🌲", 
          border: "border border-green-950",
          extra: "shadow-lg shadow-green-900/50 relative after:absolute after:bottom-0 after:left-1/4 after:right-1/4 after:h-1 after:bg-amber-900 after:rounded-full",
        };
      case "grass":
        return { 
          bg: "bg-gradient-to-br from-green-500 via-green-600 to-green-700", 
          icon: ((x + y) % 3 === 0 ? "🌿" : (x + y) % 2 === 0 ? "🍃" : ""), 
          border: "",
          extra: "relative after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_30%_50%,rgba(34,197,94,0.3)_1px,transparent_1px)] after:bg-[length:6px_6px]",
        };
      case "road":
        return { 
          bg: "bg-gradient-to-br from-stone-500 via-stone-600 to-stone-500", 
          icon: "", 
          border: "border-t border-b border-stone-700/30",
          extra: "relative after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent_45%,rgba(0,0,0,0.1)_50%,transparent_55%)]",
        };
      case "building":
        return { 
          bg: "bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900", 
          icon: "🏠", 
          border: "border-2 border-amber-950",
          extra: "shadow-lg shadow-amber-900/50 relative after:absolute after:inset-x-0 after:top-0 after:h-1 after:bg-red-800",
        };
      case "rock":
        return { 
          bg: "bg-gradient-to-br from-stone-400 via-stone-500 to-stone-600", 
          icon: "🪨", 
          border: "border border-stone-700",
          extra: "shadow-md shadow-stone-800/40 rounded-sm",
        };
      default:
        return { 
          bg: "bg-stone-600", 
          icon: "", 
          border: "",
          extra: "",
        };
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Mode Toggle Buttons */}
      <div className="shrink-0 flex gap-2">
        <button
          onClick={() => setMapMode('interact')}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
            mapMode === 'interact'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-foreground/10 text-foreground/70 hover:bg-foreground/20'
          }`}
        >
          👆 Interact Mode
        </button>
        <button
          onClick={() => setMapMode('pan')}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
            mapMode === 'pan'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-foreground/10 text-foreground/70 hover:bg-foreground/20'
          }`}
        >
          🤚 Pan Mode
        </button>
      </div>
      
      {currentRoom && (
        <div className="shrink-0 rounded-md border border-foreground/10 bg-foreground/5 px-3 py-2">
          <div className="text-xs font-semibold text-foreground/90">{currentRoom.name}</div>
          <div className="mt-1 text-xs text-foreground/70">{currentRoom.description}</div>
        </div>
      )}
      <div 
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md border border-foreground/10 bg-stone-900"
      >
        <div 
          className="grid gap-0.5 rounded bg-stone-800 p-2" 
          style={{ 
            gridTemplateColumns: `repeat(${map.width}, 20px)`,
            gridTemplateRows: `repeat(${map.height}, 20px)`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            cursor: mapMode === 'pan' 
              ? (isDragging ? 'grabbing' : 'grab')
              : 'pointer',
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {map.tiles.map((t, idx) => {
            const x = idx % map.width;
            const y = Math.floor(idx / map.width);
            const style = getTileStyle(t, x, y);
            
            // Check what's actually at this position for the title
            const isPlayer = x === playerPos.x && y === playerPos.y;
            const creatureAtPos = Object.entries(creaturePositions).find(
              ([id, pos]) => pos.x === x && pos.y === y && id !== state.playerId
            );
            const creature = creatureAtPos ? creatures[creatureAtPos[0]] : null;
            
            const titleText = isPlayer 
              ? `${x},${y} - You (Player)` 
              : creature && creature.hp > 0
              ? `${x},${y} - ${creature.name} (HP: ${creature.hp}/${creature.maxHp})`
              : `${x},${y} - ${t}`;
            
            return (
              <div
                key={idx}
                className={`map-tile ${style.bg} ${style.border} ${style.extra} flex items-center justify-center text-xs transition-all overflow-hidden ${
                  mapMode === 'interact' ? 'hover:ring-2 hover:ring-blue-400/50 cursor-pointer' : ''
                }`}
                style={{ 
                  width: '20px', 
                  height: '20px',
                }}
                title={titleText}
                onClick={(e) => {
                  handleTileClick(e, x, y);
                }}
              >
                {style.icon && <span className="pointer-events-none select-none relative z-10 text-shadow">{style.icon}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 flex items-center justify-between text-xs text-foreground/70">
        <span>Position: ({playerPos.x}, {playerPos.y})</span>
        <span>
          {mapMode === 'interact' ? '👆 Click tiles to interact' : '🤚 Drag to move map'} • Zoom: {(zoom * 100).toFixed(0)}%
        </span>
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-44 rounded-lg border border-foreground/20 bg-background shadow-2xl"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1">
            {contextMenu.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleContextMenuAction(action)}
                className="w-full rounded px-3 py-2 text-left text-sm hover:bg-foreground/10 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Attack Input Bubble */}
      {attackInput && (
        <div
          className="fixed z-50 w-80 rounded-lg border border-blue-500/50 bg-background shadow-2xl"
          style={{
            left: `${attackInput.x}px`,
            top: `${attackInput.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3">
            <div className="mb-2 text-sm font-semibold text-blue-500">
              ⚔️ Attack {attackInput.targetName}
            </div>
            <form onSubmit={handleAttackSubmit}>
              <input
                type="text"
                value={attackText}
                onChange={(e) => setAttackText(e.target.value)}
                placeholder="Describe your attack..."
                className="w-full rounded border border-foreground/20 bg-foreground/5 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Attack
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttackInput(null);
                    setAttackText("");
                  }}
                  className="rounded bg-foreground/10 px-3 py-1.5 text-xs font-medium hover:bg-foreground/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function SheetPanel({ state }: { state: GameState }) {
  const pc = state.creatures[state.playerId];
  return (
    <div className="h-full space-y-3 overflow-y-auto text-sm">
      <div className="flex items-baseline justify-between">
        <div className="font-semibold">{pc.name}</div>
        <div className="text-foreground/70">
          Level {pc.level} {pc.characterClass && `• ${pc.characterClass.charAt(0).toUpperCase() + pc.characterClass.slice(1)}`}
        </div>
      </div>
      
      {/* HP Bar */}
      <div className="rounded-md border border-foreground/10 px-2 py-1">
        <HPBar current={pc.hp} max={pc.maxHp} />
      </div>
      
      {/* Death Saves if unconscious */}
      {pc.isUnconscious && pc.deathSaves && (
        <DeathSaves successes={pc.deathSaves.successes} failures={pc.deathSaves.failures} />
      )}
      
      {/* Inspiration */}
      {pc.inspiration && (
        <div className="rounded-md border border-purple-500/50 bg-purple-500/10 px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="text-xs font-medium text-purple-500">Inspiration Active</span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-foreground/10 px-2 py-1">
          <div className="text-xs text-foreground/70">AC</div>
          <div className="font-medium">{pc.ac}</div>
        </div>
        <div className="rounded-md border border-foreground/10 px-2 py-1">
          <div className="text-xs text-foreground/70">Initiative</div>
          <div className="font-medium">+{Math.floor((pc.abilityScores.dex - 10) / 2)}</div>
        </div>
      </div>
      <div className="rounded-md border border-foreground/10 px-2 py-1">
        <div className="text-xs text-foreground/70">Ability Scores</div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {Object.entries(pc.abilityScores).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded border border-foreground/10 px-2 py-1">
              <span className="text-xs uppercase text-foreground/70">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>
      {pc.inventory && pc.inventory.length > 0 && (
        <div className="rounded-md border border-foreground/10 px-2 py-1">
          <div className="text-xs text-foreground/70">Inventory</div>
          <div className="mt-1 space-y-1">
            {pc.inventory.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span>{item.name}</span>
                <span className="text-foreground/70">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {pc.spells && pc.spells.length > 0 && (
        <div className="rounded-md border border-foreground/10 px-2 py-1">
          <div className="text-xs text-foreground/70">Spells</div>
          <div className="mt-1 space-y-1">
            {pc.spells.map((spell, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span>{spell.name}</span>
                <span className="text-foreground/70">Lvl {spell.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {pc.spellSlots && (
        <div className="rounded-md border border-foreground/10 px-2 py-1">
          <div className="text-xs text-foreground/70">Spell Slots</div>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => {
              const slots = pc.spellSlots![level];
              if (slots.max === 0) return null;
              return (
                <div key={level} className="flex items-center justify-between rounded border border-foreground/10 px-2 py-1">
                  <span className="text-xs text-foreground/70">L{level}</span>
                  <span className={`text-xs font-medium ${slots.current === 0 ? "text-foreground/40" : ""}`}>
                    {slots.current}/{slots.max}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {pc.conditions && pc.conditions.length > 0 && (
        <div className="rounded-md border border-foreground/10 px-2 py-1">
          <div className="text-xs text-foreground/70">Conditions</div>
          <div className="mt-1 space-y-1">
            {pc.conditions.map((condition, idx) => (
              <div key={idx} className="rounded border border-foreground/10 bg-foreground/5 px-2 py-1 text-xs">
                <div className="font-medium">{condition.name}</div>
                {condition.description && <div className="text-foreground/70">{condition.description}</div>}
                <div className="text-foreground/70">{condition.duration} rounds remaining</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CombatPanel({ state }: { state: GameState }) {
  const currentId = state.combat.active ? state.combat.order[state.combat.turnIndex]?.creatureId : undefined;
  
  // Get all enemies (non-player creatures)
  const enemies = Object.values(state.creatures).filter(c => c.id !== state.playerId);
  const aliveEnemies = enemies.filter(e => e.hp > 0);
  
  // Parse last dice roll for visual display
  const lastDiceLog = state.log.slice().reverse().find((x) => x.kind === "dice");
  const parseDiceRoll = (text: string) => {
    const rolls: { sides: number; result: number }[] = [];
    const diceMatch = text.match(/d(\d+)=(\d+)/g);
    if (diceMatch) {
      diceMatch.forEach(match => {
        const [sides, result] = match.replace('d', '').split('=').map(Number);
        rolls.push({ sides, result });
      });
    }
    const rollType = text.includes('(advantage)') ? 'advantage' : text.includes('(disadvantage)') ? 'disadvantage' : 'normal';
    const wasCritical = text.includes('CRITICAL!');
    const wasCriticalFail = text.includes('CRITICAL FAIL!');
    return { rolls, rollType, wasCritical, wasCriticalFail };
  };
  
  const lastRoll = lastDiceLog ? parseDiceRoll(lastDiceLog.text) : null;
  
  return (
    <div className="h-full space-y-2 overflow-y-auto text-sm">
      {/* Visual Dice Roller */}
      {lastRoll && lastRoll.rolls.length > 0 ? (
        <div className="rounded-md border border-foreground/10 bg-foreground/5 px-3 py-2">
          <div className="text-xs font-medium text-foreground/70">Last Roll</div>
          <div className="mt-2">
            <DiceRoller 
              rolls={lastRoll.rolls} 
              rollType={lastRoll.rollType as "normal" | "advantage" | "disadvantage"}
              wasCritical={lastRoll.wasCritical}
              wasCriticalFail={lastRoll.wasCriticalFail}
            />
          </div>
          <div className="mt-2 text-xs text-foreground/70">{lastDiceLog?.text}</div>
        </div>
      ) : (
        <div className="rounded-md border border-foreground/10 bg-background px-3 py-2">
          <div className="text-xs text-foreground/70">No rolls yet.</div>
          <div className="mt-1 text-xs text-foreground/70">Try `roll 1d20` or `start combat`.</div>
        </div>
      )}
      
      {/* Combat Status */}
      <div className="rounded-md border border-foreground/10 px-2 py-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground/70">Combat Status</span>
          <span className="text-xs font-medium">
            {state.combat.active ? `Round ${state.combat.round}` : "Not Active"}
          </span>
        </div>
      </div>
      
      {/* Multiple Enemies Display */}
      {enemies.length > 0 && (
        <div className="rounded-md border border-foreground/10 px-2 py-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground/70">Enemies</span>
            <span className="text-xs text-foreground/50">{aliveEnemies.length} alive</span>
          </div>
          <div className="mt-2 space-y-2">
            {enemies.map((enemy) => (
              <div
                key={enemy.id}
                className={`rounded-md border px-2 py-2 ${
                  enemy.hp <= 0
                    ? "border-foreground/10 bg-foreground/5 opacity-50"
                    : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {enemy.hp <= 0 ? "💀 " : "👹 "}
                    {enemy.name}
                  </span>
                  <span className="text-xs text-foreground/70">AC {enemy.ac}</span>
                </div>
                {enemy.hp > 0 ? (
                  <div className="mt-2">
                    <HPBar current={enemy.hp} max={enemy.maxHp} showNumbers={false} />
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-foreground/50">Defeated</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Turn Order */}
      {state.combat.active && state.combat.order.length > 0 ? (
        <div className="rounded-md border border-foreground/10 px-2 py-1">
          <div className="text-xs text-foreground/70">Turn Order</div>
          <div className="mt-1 space-y-1">
            {state.combat.order.map((c) => {
              const creature = state.creatures[c.creatureId];
              const isActive = c.creatureId === currentId;
              const isDead = creature && creature.hp <= 0;
              return (
                <div
                  key={c.creatureId}
                  className={`flex items-center justify-between rounded border px-2 py-1 ${
                    isActive ? "border-blue-500/50 bg-blue-500/10" : "border-foreground/10 bg-background"
                  } ${isDead ? "opacity-50" : ""}`}
                >
                  <span className="font-medium">
                    {isActive && "▶ "}
                    {creature?.name ?? c.creatureId}
                    {isDead && " (Dead)"}
                  </span>
                  <span className="text-xs text-foreground/70">Init {c.initiative}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      
      <div className="text-xs text-foreground/70">
        Commands: `attack`, `use [item]`, `cast [spell]`, `loot`, `rest`
      </div>
    </div>
  );
}
