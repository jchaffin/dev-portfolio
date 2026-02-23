// Ambient declarations for optional peer dependencies.
// These allow TypeScript to compile adapter files even when the
// peer dependency is not installed.

declare module 'livekit-client' {
  export class Room {
    connect(url: string, token: string): Promise<void>;
    disconnect(): Promise<void>;
    on(event: string, handler: (...args: any[]) => void): void;
    localParticipant: {
      setMicrophoneEnabled(enabled: boolean): Promise<void>;
      publishData(data: Uint8Array, options?: { reliable?: boolean }): Promise<void>;
    };
  }
  export const RoomEvent: {
    TrackSubscribed: string;
    DataReceived: string;
    Disconnected: string;
    Reconnecting: string;
    Reconnected: string;
  };
  export const Track: {
    Kind: { Audio: string; Video: string };
  };
}

declare module 'livekit-server-sdk' {
  export class AccessToken {
    constructor(apiKey: string, apiSecret: string, options: { identity: string; ttl?: string });
    addGrant(grant: { roomJoin: boolean; room: string }): void;
    toJwt(): Promise<string>;
  }
}
