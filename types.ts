export interface AudioStreamConfig {
  sampleRate: number;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface LiveState {
  status: ConnectionState;
  errorMessage?: string;
  volume: number; // 0 to 1 for visualization
}