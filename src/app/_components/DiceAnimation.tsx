"use client";

import * as React from "react";

type DiceAnimationProps = {
  sides: number;
  result: number;
  onComplete?: () => void;
};

export function DiceAnimation({ sides, result, onComplete }: DiceAnimationProps) {
  const [currentNumber, setCurrentNumber] = React.useState(1);
  const [isRolling, setIsRolling] = React.useState(true);
  
  React.useEffect(() => {
    // Roll animation - rapidly cycle through numbers
    let frame = 0;
    const rollDuration = 1500; // 1.5 seconds
    const frameInterval = 50; // Update every 50ms
    const totalFrames = rollDuration / frameInterval;
    
    const interval = setInterval(() => {
      frame++;
      
      if (frame < totalFrames) {
        // Random number during roll
        setCurrentNumber(Math.floor(Math.random() * sides) + 1);
      } else {
        // Show final result
        setCurrentNumber(result);
        setIsRolling(false);
        clearInterval(interval);
        
        // Call onComplete after showing result
        setTimeout(() => {
          onComplete?.();
        }, 800);
      }
    }, frameInterval);
    
    return () => clearInterval(interval);
  }, [sides, result, onComplete]);
  
  // Determine dice color based on result
  const getDiceColor = () => {
    if (!isRolling) {
      if (result === sides) return "bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-2xl shadow-yellow-500/50"; // Natural max (crit)
      if (result === 1) return "bg-gradient-to-br from-red-500 to-red-700 shadow-2xl shadow-red-500/50"; // Natural 1 (crit fail)
    }
    return "bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl shadow-blue-500/50";
  };
  
  // Get dice face based on sides
  const getDiceLabel = () => {
    if (sides === 20) return "D20";
    if (sides === 12) return "D12";
    if (sides === 10) return "D10";
    if (sides === 8) return "D8";
    if (sides === 6) return "D6";
    if (sides === 4) return "D4";
    return `D${sides}`;
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        {/* Dice container with 3D effect */}
        <div
          className={`relative h-48 w-48 rounded-3xl text-white transition-all duration-300 ${getDiceColor()} ${
            isRolling ? "animate-spin-3d" : "animate-bounce-land"
          }`}
          style={{
            transformStyle: "preserve-3d",
            transform: isRolling 
              ? `rotateX(${currentNumber * 72}deg) rotateY(${currentNumber * 98}deg) rotateZ(${currentNumber * 45}deg)`
              : "rotateX(0deg) rotateY(0deg) rotateZ(0deg)",
          }}
        >
          {/* Dice face with number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-8xl font-bold drop-shadow-2xl">{currentNumber}</div>
            <div className="mt-2 text-sm font-medium uppercase tracking-wider opacity-70">{getDiceLabel()}</div>
          </div>
          
          {/* Decorative edges to simulate 3D dice */}
          <div className="absolute inset-0 rounded-3xl border-4 border-white/20"></div>
          <div className="absolute inset-2 rounded-2xl border-2 border-white/10"></div>
          
          {/* Glowing effect */}
          {!isRolling && (
            <div className="absolute inset-0 animate-pulse rounded-3xl bg-white/10"></div>
          )}
        </div>
        
        {/* Result text */}
        {!isRolling && (
          <div className="animate-fade-in text-center">
            <div className="text-2xl font-bold text-white">
              {result === sides && "🎉 NATURAL " + sides + "! 🎉"}
              {result === 1 && "💀 NATURAL 1! 💀"}
              {result !== sides && result !== 1 && `Result: ${result}`}
            </div>
          </div>
        )}
        
        {/* Rolling text */}
        {isRolling && (
          <div className="text-xl font-medium text-white/80">
            Rolling...
          </div>
        )}
      </div>
      
      {/* Add custom animations */}
      <style jsx>{`
        @keyframes spin-3d {
          0% {
            transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(720deg) rotateY(720deg) rotateZ(720deg);
          }
        }
        
        @keyframes bounce-land {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-spin-3d {
          animation: spin-3d 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-bounce-land {
          animation: bounce-land 0.6s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

// Multiple dice animation for when rolling multiple dice
export function MultiDiceAnimation({ 
  rolls, 
  onComplete 
}: { 
  rolls: { sides: number; result: number }[];
  onComplete?: () => void;
}) {
  const [currentDieIndex, setCurrentDieIndex] = React.useState(0);
  
  if (currentDieIndex >= rolls.length) {
    return null;
  }
  
  return (
    <DiceAnimation
      sides={rolls[currentDieIndex].sides}
      result={rolls[currentDieIndex].result}
      onComplete={() => {
        if (currentDieIndex < rolls.length - 1) {
          setCurrentDieIndex(currentDieIndex + 1);
        } else {
          onComplete?.();
        }
      }}
    />
  );
}
