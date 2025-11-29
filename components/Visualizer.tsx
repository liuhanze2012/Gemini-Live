import React from 'react';
import { ConnectionState } from '../types';

interface VisualizerProps {
  volume: number;
  status: ConnectionState;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume, status }) => {
  // Base scale is 1, max scale is 2.5
  const scale = 1 + volume * 1.5;
  const isConnected = status === ConnectionState.CONNECTED;
  const isConnecting = status === ConnectionState.CONNECTING;

  let orbColor = "bg-gray-500";
  let pulseAnimation = "";
  
  if (isConnecting) {
    orbColor = "bg-yellow-400";
    pulseAnimation = "animate-pulse";
  } else if (isConnected) {
    // Dynamic gradient based on volume? Or just solid beautiful color
    orbColor = "bg-gradient-to-r from-blue-400 to-purple-500";
  } else if (status === ConnectionState.ERROR) {
    orbColor = "bg-red-500";
  }

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96">
      {/* Background Glows */}
      {isConnected && (
        <>
          <div 
            className="absolute w-full h-full rounded-full bg-blue-500/30 blur-3xl mix-blend-screen animate-blob"
            style={{ transform: `scale(${1 + volume})` }}
          />
          <div 
            className="absolute w-full h-full rounded-full bg-purple-500/30 blur-3xl mix-blend-screen animate-blob animation-delay-2000"
            style={{ transform: `scale(${1 + volume * 0.8})` }}
          />
        </>
      )}

      {/* Main Orb */}
      <div 
        className={`relative z-10 w-32 h-32 md:w-48 md:h-48 rounded-full shadow-2xl transition-all duration-75 ease-out ${orbColor} ${pulseAnimation}`}
        style={{ 
          transform: isConnected ? `scale(${scale})` : 'scale(1)',
          boxShadow: isConnected ? `0 0 ${20 + volume * 50}px rgba(100, 100, 255, 0.6)` : 'none'
        }}
      >
        {/* Inner core */}
        <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm" />
      </div>
      
      {/* Status Text Overlay */}
      <div className="absolute bottom-[-60px] text-center w-full">
         <p className="text-gray-400 text-sm tracking-widest uppercase">
            {status === ConnectionState.DISCONNECTED ? "Ready to Connect" : status}
         </p>
      </div>
    </div>
  );
};