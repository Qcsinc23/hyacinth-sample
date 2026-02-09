// Audio alerts system for Hyacinth
// Uses Web Audio API for notification sounds

type AlertType = 'critical' | 'warning' | 'success' | 'error' | 'info';

interface AudioSettings {
  enabled: boolean;
  volume: number;
}

// Default settings
let audioSettings: AudioSettings = {
  enabled: true,
  volume: 0.7,
};

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

// Initialize audio context (must be called after user interaction)
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  return audioContext;
}

// Generate beep sound with specific frequency and duration
function playBeep(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
  if (!audioSettings.enabled) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(audioSettings.volume * 0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// Generate a chord (multiple frequencies)
function playChord(frequencies: number[], duration: number): void {
  frequencies.forEach((freq, index) => {
    setTimeout(() => playBeep(freq, duration), index * 50);
  });
}

// Alert sound functions
export const audioAlerts = {
  // Critical alert - urgent, attention-grabbing pattern
  critical: () => {
    if (!audioSettings.enabled) return;
    // Alternating high-low beeps
    const pattern = [800, 400, 800, 400, 800];
    pattern.forEach((freq, i) => {
      setTimeout(() => playBeep(freq, 0.15, 'square'), i * 200);
    });
  },

  // Warning alert - medium urgency
  warning: () => {
    if (!audioSettings.enabled) return;
    // Two-tone descending
    playBeep(600, 0.2, 'sine');
    setTimeout(() => playBeep(400, 0.3, 'sine'), 200);
  },

  // Success notification - pleasant ascending
  success: () => {
    if (!audioSettings.enabled) return;
    // Happy ascending triad
    playChord([523.25, 659.25, 783.99], 0.3); // C major chord
  },

  // Error notification - descending, somber
  error: () => {
    if (!audioSettings.enabled) return;
    // Descending two-tone
    playBeep(300, 0.2, 'sawtooth');
    setTimeout(() => playBeep(200, 0.4, 'sawtooth'), 150);
  },

  // Info notification - subtle
  info: () => {
    if (!audioSettings.enabled) return;
    // Gentle single tone
    playBeep(500, 0.15, 'sine');
  },

  // Expiration warning - special pattern
  expirationWarning: () => {
    if (!audioSettings.enabled) return;
    // Rhythmic pattern suggesting urgency
    const pattern = [520, 0, 520, 0, 520, 0, 700];
    pattern.forEach((freq, i) => {
      if (freq > 0) {
        setTimeout(() => playBeep(freq, 0.12, 'sine'), i * 150);
      }
    });
  },

  // Low stock alert
  lowStock: () => {
    if (!audioSettings.enabled) return;
    // Double beep pattern
    playBeep(450, 0.1, 'triangle');
    setTimeout(() => playBeep(450, 0.1, 'triangle'), 150);
  },

  // Generic play function
  play: (type: AlertType) => {
    switch (type) {
      case 'critical':
        audioAlerts.critical();
        break;
      case 'warning':
        audioAlerts.warning();
        break;
      case 'success':
        audioAlerts.success();
        break;
      case 'error':
        audioAlerts.error();
        break;
      case 'info':
        audioAlerts.info();
        break;
    }
  },

  // Settings
  enable: () => {
    audioSettings.enabled = true;
    saveSettings();
  },

  disable: () => {
    audioSettings.enabled = false;
    saveSettings();
  },

  toggle: () => {
    audioSettings.enabled = !audioSettings.enabled;
    saveSettings();
    return audioSettings.enabled;
  },

  isEnabled: () => audioSettings.enabled,

  setVolume: (volume: number) => {
    audioSettings.volume = Math.max(0, Math.min(1, volume));
    saveSettings();
  },

  getVolume: () => audioSettings.volume,

  // Initialize from storage
  init: () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hyacinth_audio_settings');
      if (saved) {
        try {
          audioSettings = { ...audioSettings, ...JSON.parse(saved) };
        } catch {
          // Use defaults
        }
      }
    }
  },

  // Test all sounds
  testAll: () => {
    const types: AlertType[] = ['info', 'success', 'warning', 'error', 'critical'];
    types.forEach((type, i) => {
      setTimeout(() => {
        console.log(`Testing ${type} sound`);
        audioAlerts.play(type);
      }, i * 1000);
    });
  },
};

// Save settings to localStorage
function saveSettings() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hyacinth_audio_settings', JSON.stringify(audioSettings));
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  audioAlerts.init();
}

export default audioAlerts;
