import React from 'react';
import { useLiveAPI } from './hooks/useLiveAPI';
import { Visualizer } from './components/Visualizer';
import { ControlBar } from './components/ControlBar';
import { ConnectionState } from './types';
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const { connect, disconnect, status, error, volume } = useLiveAPI();
  const apiKeyMissing = !process.env.API_KEY;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative selection:bg-blue-500/30">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black z-0" />
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md" />
          <h1 className="text-xl font-bold tracking-tight text-white/90">Gemini Live</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full z-10 p-4">
        
        {/* Error Banner */}
        {error && (
          <div className="absolute top-24 mx-auto bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* API Key Missing Warning */}
        {apiKeyMissing && (
           <div className="absolute top-24 mx-auto max-w-md bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-6 py-4 rounded-xl flex flex-col gap-2 text-center animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-center gap-2 font-bold">
              <AlertCircle size={20} />
              <span>Missing API Key</span>
            </div>
            <p className="text-sm text-yellow-200/80">
              The Gemini API Key is missing. Please add <code>API_KEY</code> to your environment variables in Vercel or your local .env file.
            </p>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center">
          <Visualizer volume={volume} status={status} />
        </div>
        
        <div className="mb-12">
          <ControlBar 
            status={status} 
            onConnect={connect} 
            onDisconnect={disconnect} 
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="absolute bottom-4 text-xs text-gray-600 z-10">
        Powered by Gemini 2.5 Flash Native Audio
      </footer>
    </div>
  );
};

export default App;