// ============================================================================
// Audio utilities for VoiceKit
// PCM conversion, resampling, codec encoding/decoding, WAV encoding
// ============================================================================

// ============================================================================
// Low-level helpers
// ============================================================================

export function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

// ============================================================================
// PCM Conversion
// ============================================================================

export function float32ToPcm16(float32: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
}

export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
  }
  return float32;
}

export function pcm16ToBytes(pcm16: Int16Array): Uint8Array {
  return new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
}

export function bytesToPcm16(bytes: Uint8Array): Int16Array {
  const aligned = new ArrayBuffer(bytes.length);
  new Uint8Array(aligned).set(bytes);
  return new Int16Array(aligned);
}

// ============================================================================
// Base64 helpers
// ============================================================================

export function pcm16ToBase64(pcm16: Int16Array): string {
  const bytes = pcm16ToBytes(pcm16);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToPcm16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytesToPcm16(bytes);
}

export function float32ToBase64(float32: Float32Array): string {
  return pcm16ToBase64(float32ToPcm16(float32));
}

export function base64ToFloat32(base64: string): Float32Array {
  return pcm16ToFloat32(base64ToPcm16(base64));
}

// ============================================================================
// Windowed sinc resampling
//
// Proper band-limited interpolation. Uses a Kaiser-windowed sinc kernel
// so upsampled voice doesn't sound like aliased garbage.
// ============================================================================

const SINC_HALF_WIDTH = 16; // taps per side — 32-tap kernel total

function sinc(x: number): number {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

// Kaiser window: I0(beta * sqrt(1 - (2n/N-1)^2)) / I0(beta)
// I0 approximated with the first 20 terms of the series expansion
function besselI0(x: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; k <= 20; k++) {
    term *= (x / (2 * k)) * (x / (2 * k));
    sum += term;
  }
  return sum;
}

function kaiserWindow(n: number, N: number, beta: number): number {
  const r = 2 * n / (N - 1) - 1;
  const arg = beta * Math.sqrt(Math.max(0, 1 - r * r));
  return besselI0(arg) / besselI0(beta);
}

/**
 * Build a windowed sinc filter kernel for resampling.
 * cutoff is normalized frequency (0..1 where 1 = Nyquist of the LOWER rate).
 */
function buildSincKernel(halfWidth: number, cutoff: number, beta: number): Float32Array {
  const size = halfWidth * 2 + 1;
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - halfWidth;
    const w = kaiserWindow(i, size, beta);
    kernel[i] = cutoff * sinc(cutoff * x) * w;
    sum += kernel[i];
  }
  // Normalize so the kernel sums to 1
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}

/**
 * Resample audio using windowed sinc interpolation.
 * Clean for voice at any ratio — no aliasing artifacts on upsample,
 * proper anti-alias filtering on downsample.
 */
export function resample(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate) return input;
  if (input.length === 0) return new Float32Array(0);

  const ratio = fromRate / toRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  // Anti-alias cutoff: Nyquist of the lower rate, relative to the higher rate
  const cutoff = Math.min(fromRate, toRate) / Math.max(fromRate, toRate);
  // Kaiser beta: higher = more stopband attenuation, 6 is good for voice
  const beta = 6;
  const halfWidth = SINC_HALF_WIDTH;
  const kernel = buildSincKernel(halfWidth, cutoff, beta);

  for (let i = 0; i < outputLength; i++) {
    const srcCenter = i * ratio;
    const srcInt = Math.floor(srcCenter);
    const srcFrac = srcCenter - srcInt;

    let sample = 0;
    for (let j = -halfWidth; j <= halfWidth; j++) {
      const srcIdx = srcInt + j;
      if (srcIdx < 0 || srcIdx >= input.length) continue;
      // Offset into kernel: j + halfWidth, but shifted by fractional position
      const kernelPos = j - srcFrac;
      const w = kaiserWindow(
        Math.round((kernelPos + halfWidth) / (2 * halfWidth + 1) * (2 * halfWidth)),
        2 * halfWidth + 1,
        beta
      );
      sample += input[srcIdx] * cutoff * sinc(cutoff * kernelPos) * w;
    }
    output[i] = sample;
  }

  return output;
}

export function resamplePcm16(
  input: Int16Array,
  fromRate: number,
  toRate: number
): Int16Array {
  if (fromRate === toRate) return input;
  return float32ToPcm16(resample(pcm16ToFloat32(input), fromRate, toRate));
}

export function upsample8kTo16k(input: Float32Array): Float32Array {
  return resample(input, 8000, 16000);
}

export function upsample8kTo16kPcm16(input: Int16Array): Int16Array {
  return resamplePcm16(input, 8000, 16000);
}

export function downsample16kTo8k(input: Float32Array): Float32Array {
  return resample(input, 16000, 8000);
}

export function upsample8kTo48k(input: Float32Array): Float32Array {
  return resample(input, 8000, 48000);
}

// ============================================================================
// Pitch shifting (PSOLA-style for voice)
//
// Time-domain pitch shift via resampling + WSOLA overlap-add.
// Preserves duration — only changes pitch.
// ============================================================================

/**
 * Shift pitch by a factor. >1 = higher, <1 = lower.
 * E.g. 1.5 = up a fifth, 0.5 = down an octave.
 * Preserves original duration.
 */
export function shiftPitch(
  input: Float32Array,
  factor: number,
  sampleRate: number
): Float32Array {
  if (factor === 1) return input;
  if (input.length === 0) return new Float32Array(0);

  // Step 1: resample to change pitch (this also changes speed)
  const stretched = resample(input, sampleRate, sampleRate * factor);

  // Step 2: time-stretch back to original duration via overlap-add
  return timeStretch(stretched, input.length, sampleRate);
}

/**
 * Overlap-add time stretcher. Stretches/compresses `input` to exactly
 * `targetLength` samples without changing pitch.
 */
function timeStretch(
  input: Float32Array,
  targetLength: number,
  sampleRate: number
): Float32Array {
  if (input.length === targetLength) return input;
  if (input.length === 0) return new Float32Array(targetLength);

  // Window size tuned for voice fundamental (80-300 Hz)
  const windowSize = Math.round(sampleRate * 0.025); // 25ms
  const hopOut = Math.round(windowSize / 2);
  const stretchRatio = targetLength / input.length;
  const hopIn = Math.round(hopOut / stretchRatio);

  const output = new Float32Array(targetLength);
  const windowWeights = new Float32Array(targetLength);

  // Hann window
  const hann = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  let inPos = 0;
  let outPos = 0;

  while (outPos < targetLength && inPos < input.length) {
    for (let i = 0; i < windowSize; i++) {
      const srcIdx = inPos + i;
      const dstIdx = outPos + i;
      if (srcIdx >= input.length || dstIdx >= targetLength) break;
      output[dstIdx] += input[srcIdx] * hann[i];
      windowWeights[dstIdx] += hann[i];
    }
    inPos += hopIn;
    outPos += hopOut;
  }

  // Normalize by accumulated window weights
  for (let i = 0; i < targetLength; i++) {
    if (windowWeights[i] > 1e-6) {
      output[i] /= windowWeights[i];
    }
  }

  return output;
}

/**
 * Change playback speed without changing pitch.
 * >1 = faster, <1 = slower.
 */
export function changeSpeed(
  input: Float32Array,
  factor: number,
  sampleRate: number
): Float32Array {
  if (factor === 1) return input;
  const targetLength = Math.round(input.length / factor);
  return timeStretch(input, targetLength, sampleRate);
}

/**
 * Shift pitch by semitones. +12 = up one octave, -12 = down one octave.
 */
export function shiftPitchSemitones(
  input: Float32Array,
  semitones: number,
  sampleRate: number
): Float32Array {
  return shiftPitch(input, Math.pow(2, semitones / 12), sampleRate);
}

// ============================================================================
// Gain / volume
// ============================================================================

export function applyGain(samples: Float32Array, gainDb: number): Float32Array {
  const multiplier = Math.pow(10, gainDb / 20);
  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    output[i] = Math.max(-1, Math.min(1, samples[i] * multiplier));
  }
  return output;
}

export function normalize(samples: Float32Array, targetPeak = 0.95): Float32Array {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  if (peak < 1e-6) return samples;
  const gain = targetPeak / peak;
  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    output[i] = samples[i] * gain;
  }
  return output;
}

// ============================================================================
// Simple biquad filters for tone shaping
// ============================================================================

interface BiquadCoeffs {
  b0: number; b1: number; b2: number;
  a1: number; a2: number;
}

function applyBiquad(samples: Float32Array, c: BiquadCoeffs): Float32Array {
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return out;
}

/**
 * Low-pass filter. Cuts frequencies above `cutoffHz`.
 */
export function lowpass(samples: Float32Array, sampleRate: number, cutoffHz: number, Q = 0.707): Float32Array {
  const w0 = 2 * Math.PI * cutoffHz / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  const a0 = 1 + alpha;
  return applyBiquad(samples, {
    b0: ((1 - cosw0) / 2) / a0,
    b1: (1 - cosw0) / a0,
    b2: ((1 - cosw0) / 2) / a0,
    a1: (-2 * cosw0) / a0,
    a2: (1 - alpha) / a0,
  });
}

/**
 * High-pass filter. Cuts frequencies below `cutoffHz`.
 */
export function highpass(samples: Float32Array, sampleRate: number, cutoffHz: number, Q = 0.707): Float32Array {
  const w0 = 2 * Math.PI * cutoffHz / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  const a0 = 1 + alpha;
  return applyBiquad(samples, {
    b0: ((1 + cosw0) / 2) / a0,
    b1: (-(1 + cosw0)) / a0,
    b2: ((1 + cosw0) / 2) / a0,
    a1: (-2 * cosw0) / a0,
    a2: (1 - alpha) / a0,
  });
}

/**
 * Band-pass filter centered at `centerHz`.
 */
export function bandpass(samples: Float32Array, sampleRate: number, centerHz: number, Q = 1): Float32Array {
  const w0 = 2 * Math.PI * centerHz / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha;
  return applyBiquad(samples, {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * Math.cos(w0)) / a0,
    a2: (1 - alpha) / a0,
  });
}

/**
 * Peaking EQ: boost or cut at `centerHz` by `gainDb`.
 */
export function peakingEQ(samples: Float32Array, sampleRate: number, centerHz: number, gainDb: number, Q = 1): Float32Array {
  const A = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * centerHz / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha / A;
  return applyBiquad(samples, {
    b0: (1 + alpha * A) / a0,
    b1: (-2 * Math.cos(w0)) / a0,
    b2: (1 - alpha * A) / a0,
    a1: (-2 * Math.cos(w0)) / a0,
    a2: (1 - alpha / A) / a0,
  });
}

/**
 * Voice presence boost: +3dB shelf around 2-4kHz for clarity.
 */
export function voicePresenceBoost(samples: Float32Array, sampleRate: number, boostDb = 3): Float32Array {
  return peakingEQ(samples, sampleRate, 3000, boostDb, 0.8);
}

/**
 * De-ess: reduce sibilance in the 5-8kHz range.
 */
export function deEss(samples: Float32Array, sampleRate: number, reductionDb = -4): Float32Array {
  return peakingEQ(samples, sampleRate, 6500, reductionDb, 1.5);
}

/**
 * Telephone effect: bandpass 300-3400Hz (ITU-T G.712).
 */
export function telephoneFilter(samples: Float32Array, sampleRate: number): Float32Array {
  let out = highpass(samples, sampleRate, 300, 0.707);
  out = lowpass(out, sampleRate, 3400, 0.707);
  return out;
}

// ============================================================================
// G.711 mu-law codec
// ============================================================================

const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

export function linearToMulaw(sample: number): number {
  const sign = (sample >> 8) & 0x80;
  if (sign !== 0) sample = -sample;
  if (sample > MULAW_CLIP) sample = MULAW_CLIP;
  sample += MULAW_BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; exponent--, mask >>= 1);

  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  const byte = ~(sign | (exponent << 4) | mantissa) & 0xFF;
  return byte;
}

export function mulawToLinear(byte: number): number {
  byte = ~byte & 0xFF;
  const sign = byte & 0x80;
  const exponent = (byte >> 4) & 0x07;
  const mantissa = byte & 0x0F;
  let sample = ((mantissa << 3) + MULAW_BIAS) << exponent;
  sample -= MULAW_BIAS;
  return sign !== 0 ? -sample : sample;
}

export function encodeMulaw(pcm16: Int16Array): Uint8Array {
  const mulaw = new Uint8Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    mulaw[i] = linearToMulaw(pcm16[i]);
  }
  return mulaw;
}

export function decodeMulaw(mulaw: Uint8Array): Int16Array {
  const pcm16 = new Int16Array(mulaw.length);
  for (let i = 0; i < mulaw.length; i++) {
    pcm16[i] = mulawToLinear(mulaw[i]);
  }
  return pcm16;
}

// ============================================================================
// G.711 A-law codec
// ============================================================================

export function linearToAlaw(sample: number): number {
  const sign = (~sample >> 8) & 0x80;
  if (sign === 0) sample = -sample;
  if (sample > MULAW_CLIP) sample = MULAW_CLIP;

  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; exponent--, mask >>= 1);

  const mantissa = (sample >> (exponent === 0 ? 4 : exponent + 3)) & 0x0F;
  const byte = (sign | (exponent << 4) | mantissa) ^ 0xD5;
  return byte;
}

export function alawToLinear(byte: number): number {
  byte ^= 0xD5;
  const sign = byte & 0x80;
  const exponent = (byte >> 4) & 0x07;
  const mantissa = byte & 0x0F;
  let sample: number;
  if (exponent === 0) {
    sample = (mantissa << 4) + 8;
  } else {
    sample = ((mantissa << 3) + 0x84) << exponent;
  }
  return sign !== 0 ? -sample : sample;
}

export function encodeAlaw(pcm16: Int16Array): Uint8Array {
  const alaw = new Uint8Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    alaw[i] = linearToAlaw(pcm16[i]);
  }
  return alaw;
}

export function decodeAlaw(alaw: Uint8Array): Int16Array {
  const pcm16 = new Int16Array(alaw.length);
  for (let i = 0; i < alaw.length; i++) {
    pcm16[i] = alawToLinear(alaw[i]);
  }
  return pcm16;
}

// ============================================================================
// RMS Energy calculation (for VAD)
// ============================================================================

export function rmsEnergy(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

export function rmsEnergyPcm16(samples: Int16Array): number {
  return rmsEnergy(pcm16ToFloat32(samples));
}

export function dbFS(rms: number): number {
  if (rms <= 0) return -Infinity;
  return 20 * Math.log10(rms);
}

// ============================================================================
// WAV encoding
// ============================================================================

export function encodeWAV(
  samples: Float32Array,
  sampleRate: number,
  channels = 1
): ArrayBuffer {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

export function encodeWAVFromPcm16(
  pcm16: Int16Array,
  sampleRate: number,
  channels = 1
): ArrayBuffer {
  return encodeWAV(pcm16ToFloat32(pcm16), sampleRate, channels);
}

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
  await audioContext.close();
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

// ============================================================================
// Codec format helpers
// ============================================================================

export function audioFormatForCodec(codec: string) {
  switch (codec.toLowerCase()) {
    case 'opus':
    case 'pcm':
      return 'pcm16';
    case 'g711':
    case 'g711_ulaw':
    case 'pcmu':
      return 'g711_ulaw';
    case 'g711_alaw':
    case 'pcma':
      return 'g711_alaw';
    default:
      return 'pcm16';
  }
}

export function applyCodecPreferences(pc: RTCPeerConnection, codec: string) {
  if (codec === 'g711' || codec === 'pcmu' || codec === 'g711_ulaw') {
    pc.getTransceivers().forEach((transceiver) => {
      if (transceiver.sender.track?.kind === 'audio') {
        transceiver.setCodecPreferences([
          { mimeType: 'audio/PCMU', clockRate: 8000 },
          { mimeType: 'audio/PCMA', clockRate: 8000 },
        ]);
      }
    });
  } else if (codec === 'pcma' || codec === 'g711_alaw') {
    pc.getTransceivers().forEach((transceiver) => {
      if (transceiver.sender.track?.kind === 'audio') {
        transceiver.setCodecPreferences([
          { mimeType: 'audio/PCMA', clockRate: 8000 },
          { mimeType: 'audio/PCMU', clockRate: 8000 },
        ]);
      }
    });
  }
  return pc;
}

// ============================================================================
// Stereo / mono mixing
// ============================================================================

export function stereoToMono(stereo: Float32Array, channels = 2): Float32Array {
  const mono = new Float32Array(stereo.length / channels);
  for (let i = 0; i < mono.length; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += stereo[i * channels + ch];
    }
    mono[i] = sum / channels;
  }
  return mono;
}

export function monoToStereo(mono: Float32Array): Float32Array {
  const stereo = new Float32Array(mono.length * 2);
  for (let i = 0; i < mono.length; i++) {
    stereo[i * 2] = mono[i];
    stereo[i * 2 + 1] = mono[i];
  }
  return stereo;
}
