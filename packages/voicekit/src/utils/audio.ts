// Audio utilities for VoiceKit

/**
 * Writes a string into a DataView at the given offset.
 */
export function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Converts a Float32Array to 16-bit PCM in a DataView.
 */
export function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

/**
 * Encodes a Float32Array as a WAV file.
 */
export function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

/**
 * Converts a WebM audio blob to a WAV blob.
 */
export async function convertWebMToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const combined = new Float32Array(length);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      combined[i] += channelData[i];
    }
  }
  for (let i = 0; i < length; i++) {
    combined[i] /= numChannels;
  }

  const wavBuffer = encodeWAV(combined, audioBuffer.sampleRate);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Get audio format for codec
 */
export function audioFormatForCodec(codec: string) {
  switch (codec.toLowerCase()) {
    case 'opus':
    case 'pcm':
      return 'pcm16';
    case 'g711':
      return 'g711_ulaw';
    default:
      return 'pcm16';
  }
}

/**
 * Apply codec preferences to RTCPeerConnection
 */
export function applyCodecPreferences(pc: RTCPeerConnection, codec: string) {
  if (codec === 'g711') {
    pc.getTransceivers().forEach((transceiver) => {
      if (transceiver.sender.track?.kind === 'audio') {
        transceiver.setCodecPreferences([
          { mimeType: 'audio/PCMU', clockRate: 8000 },
          { mimeType: 'audio/PCMA', clockRate: 8000 },
        ]);
      }
    });
  }
  return pc;
}
