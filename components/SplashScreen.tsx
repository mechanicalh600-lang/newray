
import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    // Reveal text after the logo animation sequence is mostly done
    setTimeout(() => setShowText(true), 3800);

    // Total splash duration is approx 6000ms controlled in App.tsx
    // We animate the progress bar over 6 seconds
    const duration = 6000; 
    const interval = 30;
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(oldProgress + increment, 100);
      });
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-[#800020]/5 blur-3xl animate-pulse"></div>
          <div className="absolute top-[40%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="flex flex-col items-center z-10 relative">
        
        {/* Animated Logo Container */}
        <div className="w-48 h-48 mb-6 relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" className="w-full h-full drop-shadow-xl">
              <defs>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="flashEffect" x="-50%" y="-50%" width="200%" height="200%">
                   <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                   <feMerge>
                       <feMergeNode in="coloredBlur"/>
                       <feMergeNode in="SourceGraphic"/>
                   </feMerge>
                </filter>
              </defs>

              {/* 1. Triangle Container Group (Handles Rotation) */}
              <g className="triangle-rotator" style={{ transformOrigin: '100px 115px' }}>
                  {/* The Path itself (Handles Morphing from Line to Triangle) */}
                  <path 
                    className="logo-triangle-morph"
                    stroke="#7f1d1d" 
                    strokeWidth="16" 
                    strokeLinecap="round"
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.15"
                  />
              </g>

              {/* Core Structure (Rhombus Stack - Rising Up) */}
              {/* These appear AFTER the rotation is complete */}
              <g strokeLinejoin="round" strokeLinecap="round">
                  {/* 2. Bottom Rhombus (Darkest) */}
                  <path 
                    d="M100 180 L150 155 L100 130 L50 155 Z" 
                    fill="#7f1d1d" 
                    stroke="#7f1d1d" 
                    strokeWidth="4" 
                    className="logo-part-rhombus-bottom"
                  />
                  
                  {/* 3. Middle Rhombus (Medium) */}
                  <path 
                    d="M100 145 L140 120 L100 95 L60 120 Z" 
                    fill="#991b1b" 
                    stroke="#991b1b" 
                    strokeWidth="4" 
                    className="logo-part-rhombus-middle"
                  />
                  
                  {/* 4. Top Rhombus (Lightest/Active) */}
                  <path 
                    d="M100 110 L130 90 L100 70 L70 90 Z" 
                    fill="#b91c1c" 
                    stroke="#b91c1c" 
                    strokeWidth="4" 
                    className="logo-part-rhombus-top"
                  />
              </g>
              
              {/* 5. Top Accent Dot (Appears & Flashes) */}
              <circle cx="100" cy="40" r="8" fill="#7f1d1d" className="logo-part-dot" />
            </svg>
        </div>

        {/* Text Container */}
        <div className={`text-center transition-all duration-1000 transform ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-4xl font-black text-[#800020] dark:text-red-400 mb-3 tracking-wide">
                رای‌نو
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-10 tracking-widest">
                اندیشه نو به سوی راهی تازه
            </p>
        </div>

        {/* Progress Bar */}
        <div className="w-48 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden relative">
            <div 
                className="h-full bg-gradient-to-r from-[#800020] to-red-500 rounded-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(128,0,32,0.5)]"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
      </div>

      <style>{`
        /* 1. Morph: Flat Line -> Triangle (0s to 1.2s) */
        .logo-triangle-morph {
            animation: morphTriangle 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes morphTriangle {
            0% { 
                /* Flat horizontal line at bottom */
                d: path("M 25 165 L 175 165 L 175 165 Z"); 
                opacity: 0;
            }
            20% {
                d: path("M 25 165 L 175 165 L 175 165 Z"); 
                opacity: 0.15;
            }
            100% { 
                /* Equilateral Triangle */
                d: path("M 100 35 L 175 165 L 25 165 Z");
                opacity: 0.15;
            }
        }

        /* 2. Rotate: 360 Degrees in 2 stages (1.2s to 2.8s) */
        .triangle-rotator {
            animation: rotateTriangle 1.6s ease-in-out forwards;
            animation-delay: 1.2s; /* Wait for morph to finish */
            transform-origin: 100px 115px;
        }
        @keyframes rotateTriangle {
            0% { transform: rotate(0deg); }
            45% { transform: rotate(180deg); } /* First 180 Flip */
            55% { transform: rotate(180deg); } /* Short Pause */
            100% { transform: rotate(360deg); } /* Second 180 Flip (Total 360) */
        }

        /* 3. Rhombus Rising Animations (Start after rotation ~2.9s) */
        .logo-part-rhombus-bottom {
            opacity: 0;
            transform: translateY(50px);
            animation: riseUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            animation-delay: 2.9s;
        }
        .logo-part-rhombus-middle {
            opacity: 0;
            transform: translateY(50px);
            animation: riseUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            animation-delay: 3.1s;
        }
        .logo-part-rhombus-top {
            opacity: 0;
            transform: translateY(50px);
            animation: riseUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            animation-delay: 3.3s;
        }

        @keyframes riseUp {
            0% { opacity: 0; transform: translateY(50px) scale(0.8); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* 4. Dot Appearance & Flash (Starts ~3.6s) */
        .logo-part-dot {
            opacity: 0;
            transform-origin: center;
            animation: popInAndFlash 2.0s ease-out forwards;
            animation-delay: 3.6s;
        }
        @keyframes popInAndFlash {
            0% { opacity: 0; transform: scale(0); fill: #7f1d1d; }
            20% { opacity: 1; transform: scale(1); fill: #7f1d1d; }
            40% { fill: #ff9999; filter: url(#flashEffect); r: 10; } /* Flash */
            100% { fill: #7f1d1d; filter: none; r: 8; opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
