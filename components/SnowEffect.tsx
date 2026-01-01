import React, { useEffect, useState } from 'react';

interface SnowEffectProps {
  enabled: boolean;
}

export const SnowEffect: React.FC<SnowEffectProps> = ({ enabled }) => {
  const [flakes, setFlakes] = useState<any[]>([]);

  useEffect(() => {
    if (enabled) {
      // Create minimal fixed flakes to avoid heavy rendering
      const newFlakes = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + 'vw',
        animationDuration: Math.random() * 3 + 5 + 's', // 5-8 seconds
        animationDelay: Math.random() * 5 + 's',
        opacity: Math.random() * 0.5 + 0.3,
        size: Math.random() * 4 + 2 + 'px'
      }));
      setFlakes(newFlakes);
    } else {
      setFlakes([]);
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      <style>
        {`
          @keyframes snowfall {
            0% { transform: translateY(-10px) translateX(0); }
            100% { transform: translateY(110vh) translateX(20px); }
          }
        `}
      </style>
      {flakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute bg-white rounded-full drop-shadow-sm"
          style={{
            left: flake.left,
            top: '-10px',
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration} linear infinite`,
            animationDelay: flake.animationDelay,
          }}
        />
      ))}
    </div>
  );
};