const STORAGE_KEY = 'gambula-sound';
let audioContext;

export function getSoundEnabled() {
  if (typeof window === 'undefined') {
    return true;
  }

  return localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function setSoundEnabled(enabled) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
}

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = AudioContextClass ? new AudioContextClass() : null;
  }

  return audioContext;
}

export function playArcadeTone(type = 'score') {
  if (!getSoundEnabled()) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  const presets = {
    click: [620, 0.05, 'triangle'],
    score: [840, 0.08, 'square'],
    success: [980, 0.12, 'sawtooth'],
    fail: [180, 0.2, 'square'],
    start: [420, 0.07, 'triangle'],
  };

  const [frequency, duration, waveform] = presets[type] || presets.score;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startAt = context.currentTime;

  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}
