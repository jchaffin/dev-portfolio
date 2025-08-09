export function audioFormatForCodec(codec: string) {
  switch (codec.toLowerCase()) {
    case 'opus':
      return 'pcm16';
    case 'pcm':
      return 'pcm16';
    case 'g711':
      return 'g711_ulaw';
    default:
      return 'pcm16';
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
  