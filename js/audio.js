// js/audio.js
// This file will handle audio generation for the Perfect Pitch app

class AudioHandler {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.oscillators = []; // Keep track of active oscillators to stop them
    this.setupAudioContext();
  }
  
  setupAudioContext() {
    // Create audio context only when needed (after user interaction)
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.masterGain.gain.value = 0.3; // Set global volume to 30%
  }
  
  // Frequency calculation from note name (e.g., "C4")
  noteToFrequency(note) {
    const A4 = 440;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Extract note and octave
    const noteName = note.slice(0, -1); // All characters except the last one
    const octave = parseInt(note.slice(-1)); // The last character is the octave
    
    // Calculate semitones from A4
    const noteIndex = notes.indexOf(noteName);
    if (noteIndex === -1) {
      console.error(`Invalid note: ${note}`);
      return A4; // Default to A4 if invalid
    }
    
    // A4 is octave 4, note index 9
    const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9);
    
    // Calculate frequency
    return A4 * Math.pow(2, semitonesFromA4 / 12);
  }
  
  // Play a specific note with a selected instrument
  playNote(note, instrument = 'piano', duration = 1.0) {
    // Stop all previously active oscillators
    this.stopAllOscillators();
    
    // Get frequency from note
    const frequency = this.noteToFrequency(note);
    
    if (instrument === 'piano') {
      this.playPianoNote(frequency, duration);
    } else if (instrument === 'synth') {
      this.playSynthNote(frequency, duration);
    } else if (instrument === 'guitar') {
      this.playGuitarNote(frequency, duration);
    } else {
      // Default to piano if unknown instrument
      this.playPianoNote(frequency, duration);
    }
  }
  
  // Piano-like sound using a more realistic approach
  playPianoNote(frequency, duration) {
    const now = this.audioContext.currentTime;
    
    // Main oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'triangle'; // Triangle wave for a clearer fundamental
    
    // Create a noise burst for the attack (key hammer hitting strings)
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.05, this.audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Create noise envelope for the attack
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    // Main envelope for the oscillator
    const mainGain = this.audioContext.createGain();
    
    // Create a filter that starts bright and decays for piano-like resonance
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + 0.5);
    filter.Q.setValueAtTime(2, now);
    
    // Piano-like envelope (more percussive attack, exponential decay)
    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(0.7, now + 0.02);  // Sharp attack
    mainGain.gain.exponentialRampToValueAtTime(0.01, now + duration);  // Decay like a piano string
    
    // Connect the signal path
    oscillator.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(this.masterGain);
    
    // Connect the noise
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    // Set frequency and start
    oscillator.frequency.value = frequency;
    oscillator.start(now);
    noise.start(now);
    
    // Stop after duration
    oscillator.stop(now + duration + 0.2);
    noise.stop(now + 0.05);  // Noise stops quickly
    
    // Store references
    this.oscillators = [oscillator, noise];
  }
  
  // Synth-like sound using a sawtooth wave
  playSynthNote(frequency, duration) {
    const now = this.audioContext.currentTime;
    
    // Create oscillator and gain node
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = frequency;
    
    // Create a filter to shape the sound
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 3.0;
    
    const gainNode = this.audioContext.createGain();
    
    // Configure volume envelope - more synth-like with sustain
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.7, now + 0.02);  // Quick attack
    gainNode.gain.setValueAtTime(0.7, now + duration - 0.1);  // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);  // Release
    
    // Configure filter envelope for more interesting synth sound
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.1);
    filter.frequency.exponentialRampToValueAtTime(2000, now + duration);
    
    // Connect and start
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start(now);
    oscillator.stop(now + duration + 0.1); // Add a little release time
    
    // Store reference
    this.oscillators = [oscillator];
  }
  
  // Guitar-like sound using a more realistic approach
  playGuitarNote(frequency, duration) {
    const now = this.audioContext.currentTime;
    
    // Main oscillator - use sawtooth for more harmonic content
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = frequency;
    
    // Create gain node with envelope similar to a plucked string
    const gainNode = this.audioContext.createGain();
    
    // Create a filter to shape the tone
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2.0;
    
    // Configure the envelope to sound more like a plucked guitar
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.01);   // Fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.1); // Quick decay
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Longer sustain than piano
    
    // Connect the signal path
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Start and stop the oscillator
    oscillator.start(now);
    oscillator.stop(now + duration + 0.2); // Let it ring out a bit longer
    
    // Store reference
    this.oscillators = [oscillator];
  }
  
  // Stop all currently playing oscillators
  stopAllOscillators() {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator already stopped, ignore error
      }
    });
    this.oscillators = [];
  }
  
  // Play a test note to initialize the audio context (needed on some browsers after user interaction)
  initializeAudio() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Export the class if using modules, or attach to window if not
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioHandler;
} else {
  window.AudioHandler = AudioHandler;
}