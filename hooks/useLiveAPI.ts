import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { 
  MODEL_NAME, 
  AUDIO_INPUT_SAMPLE_RATE, 
  AUDIO_OUTPUT_SAMPLE_RATE, 
  BUFFER_SIZE,
  DEFAULT_SYSTEM_INSTRUCTION
} from '../constants';
import { createPcmBlob, decodeAudioData, base64DecodeToUint8Array } from '../utils/audioUtils';

export const useLiveAPI = () => {
  const [status, setStatus] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Output Queue Management
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Analyser for visualization
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Connection Ref
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const disconnect = useCallback(() => {
    // Cleanup Audio
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Stop all playing sources
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    activeSourcesRef.current.clear();

    // Close contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Stop visualizer
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close Session
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try { session.close(); } catch (e) { console.error("Error closing session", e); }
      });
      sessionPromiseRef.current = null;
    }

    setStatus(ConnectionState.DISCONNECTED);
    setVolume(0);
  }, []);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      setError("API Key not found in environment variables.");
      return;
    }

    try {
      setStatus(ConnectionState.CONNECTING);
      setError(null);

      // 1. Initialize Audio Contexts
      const InputContext = window.AudioContext || (window as any).webkitAudioContext;
      const OutputContext = window.AudioContext || (window as any).webkitAudioContext;
      
      inputAudioContextRef.current = new InputContext({ sampleRate: AUDIO_INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new OutputContext({ sampleRate: AUDIO_OUTPUT_SAMPLE_RATE });

      // 2. Setup Analyser for Visualizer
      analyserRef.current = outputAudioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(outputAudioContextRef.current.destination);

      // 3. Request Microphone
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser or environment.");
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch (e: any) {
         if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
           throw new Error("No microphone found. Please check your device settings.");
         }
         if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
           throw new Error("Microphone permission denied. Please allow microphone access.");
         }
         throw e;
      }

      // 4. Initialize GenAI Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 5. Connect Session
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            console.log("Session Opened");
            setStatus(ConnectionState.CONNECTED);
            
            // Start Audio Streaming
            if (!inputAudioContextRef.current || !streamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            inputSourceRef.current = source;
            
            const processor = inputAudioContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            
            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!outputAudioContextRef.current) return;

            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64DecodeToUint8Array(base64Audio),
                ctx,
                AUDIO_OUTPUT_SAMPLE_RATE
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              
              // Connect to Analyser (which connects to destination)
              if (analyserRef.current) {
                source.connect(analyserRef.current);
              } else {
                source.connect(ctx.destination);
              }

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              source.onended = () => {
                activeSourcesRef.current.delete(source);
              };
              activeSourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              console.log("Interrupted");
              activeSourcesRef.current.forEach(src => {
                try { src.stop(); } catch(e) {/* ignore */}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: (e) => {
            console.log("Session Closed", e);
            disconnect();
          },
          onerror: (e) => {
            console.error("Session Error", e);
            setError("Connection error occurred.");
            disconnect();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

      // Start Visualizer Loop
      const updateVolume = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setVolume(avg / 255); // Normalize to 0-1
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect.");
      disconnect();
    }
  }, [disconnect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    status,
    error,
    volume,
  };
};