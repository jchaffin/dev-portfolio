export {
  // Low-level
  writeString,
  floatTo16BitPCM,

  // PCM conversion
  float32ToPcm16,
  pcm16ToFloat32,
  pcm16ToBytes,
  bytesToPcm16,

  // Base64
  pcm16ToBase64,
  base64ToPcm16,
  float32ToBase64,
  base64ToFloat32,

  // Resampling (windowed sinc)
  resample,
  resamplePcm16,
  upsample8kTo16k,
  upsample8kTo16kPcm16,
  downsample16kTo8k,
  upsample8kTo48k,

  // Pitch / speed
  shiftPitch,
  shiftPitchSemitones,
  changeSpeed,

  // Gain / normalization
  applyGain,
  normalize,

  // Filters / EQ
  lowpass,
  highpass,
  bandpass,
  peakingEQ,
  voicePresenceBoost,
  deEss,
  telephoneFilter,

  // G.711 mu-law
  linearToMulaw,
  mulawToLinear,
  encodeMulaw,
  decodeMulaw,

  // G.711 A-law
  linearToAlaw,
  alawToLinear,
  encodeAlaw,
  decodeAlaw,

  // Energy / VAD support
  rmsEnergy,
  rmsEnergyPcm16,
  dbFS,

  // WAV encoding
  encodeWAV,
  encodeWAVFromPcm16,
  convertWebMToWav,

  // Codec helpers
  audioFormatForCodec,
  applyCodecPreferences,

  // Stereo/mono
  stereoToMono,
  monoToStereo,
} from './audio';
