export function audioFormatForCodec(codec: string) {
  switch (codec.toLowerCase()) {
    case 'opus':
      return { sampleRate: 48000, channels: 1 };
    case 'pcm':
      return { sampleRate: 16000, channels: 1 };
    case 'g711':
      return { sampleRate: 8000, channels: 1 };
    default:
      return { sampleRate: 48000, channels: 1 };
  }
}

export function applyCodecPreferences(pc: RTCPeerConnection, codec: string) {
  if (codec === 'g711') {
    // Force narrow-band codecs for PSTN simulation
    pc.getTransceivers().forEach(transceiver => {
      if (transceiver.sender.track?.kind === 'audio') {
        transceiver.setCodecPreferences([
          { mimeType: 'audio/PCMU', clockRate: 8000 },
          { mimeType: 'audio/PCMA', clockRate: 8000 }
        ]);
      }
    });
  }
  return pc;
}
  