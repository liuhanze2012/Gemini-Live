import React from 'react';
import { ConnectionState } from '../types';
import { Mic, MicOff, Power, X } from 'lucide-react';

interface ControlBarProps {
  status: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({ status, onConnect, onDisconnect }) => {
  const isConnected = status === ConnectionState.CONNECTED;
  const isConnecting = status === ConnectionState.CONNECTING;

  if (isConnected || isConnecting) {
    return (
      <div className="flex gap-4 items-center bg-gray-900/80 backdrop-blur-md p-4 rounded-full border border-gray-800 shadow-xl z-50">
        <button 
          onClick={onDisconnect}
          className="group flex items-center justify-center w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg hover:shadow-red-500/30"
          title="End Call"
        >
          <X size={24} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={status === ConnectionState.ERROR && false} // Allow retry
      className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full hover:bg-gray-200 transition-all shadow-xl hover:shadow-white/20 font-semibold text-lg"
    >
      <div className="p-1 rounded-full bg-blue-500 text-white">
        <Mic size={20} />
      </div>
      <span>Start Conversation</span>
    </button>
  );
};