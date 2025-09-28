// js/main.js
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const app = document.getElementById('app');
  const mainMenuScreen = document.getElementById('main-menu');
  const settingsScreen = document.getElementById('settings-screen');
  const trainingScreen = document.getElementById('training-screen');
  const progressScreen = document.getElementById('progress-screen');
  
  const startBtn = document.getElementById('start-btn');
  const startTrainingBtn = document.getElementById('start-training-btn');
  const exitTrainingBtn = document.getElementById('exit-training');
  const replayNoteBtn = document.getElementById('replay-note');
  const backToMainBtn = document.getElementById('back-to-main');
  const backToMainFromProgressBtn = document.getElementById('back-to-main-from-progress');
  const viewProgressLink = document.querySelector('a[href="#progress"]');
  
  // Settings elements
  const instrumentSelect = document.getElementById('instrument-select');
  const octaveSelection = document.getElementById('octave-selection');
  const noteSelection = document.getElementById('note-selection');
  
  // Training elements
  const noteDisplay = document.getElementById('note-display');
  const feedbackAnimation = document.getElementById('feedback-animation');
  const onscreenKeyboard = document.getElementById('onscreen-keyboard');
  
  // Progress elements
  const dailyPracticeChart = document.getElementById('daily-practice-chart');
  const accuracyChart = document.getElementById('accuracy-chart');
  const retriesChart = document.getElementById('retries-chart');
  const timeChart = document.getElementById('time-chart');
  const hardestNotesChart = document.getElementById('hardest-notes-chart');
  const perfectPitchValue = document.getElementById('perfect-pitch-value');
  
  // Application state
  let appState = {
    currentScreen: 'main-menu', // 'main-menu', 'settings', 'training', 'progress'
    selectedInstrument: 'piano',
    selectedOctaves: [3, 4, 5], // Default octaves
    selectedNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], // Default notes
    midiAccess: null,
    midiInput: null,
    isMidiAvailable: false,
    
    // Audio handler
    audioHandler: null,
    
    // Training session state
    currentNote: null,
    noteStartTime: null, // Time when the current note was played
    sessionStartTime: null, // Time when the training session started
    retries: 0, // Number of incorrect attempts for the current note
    correctGuesses: 0,
    incorrectGuesses: 0,
    trainingActive: false,
    
    // Progress data
    progressData: {
      dailyPractice: {}, // Date string as key
      accuracy: {},
      retries: {},
      time: {},
      hardestNotes: {},
      perfectPitchPercentage: 0
    }
  };

  // Initialize the app
  function initApp() {
    setupEventListeners();
    loadProgressData();
    initializeNoteAndOctaveSelection();
    checkMIDIAccess();
    
    // Initialize audio handler
    if (window.AudioHandler) {
      appState.audioHandler = new window.AudioHandler();
    }
    
    // Initialize variables to track note holding
    window.currentlyPressedNote = null;
    window.noteStartTime = null;
    window.keyPressTime = null;
  }

  // Set up event listeners
  function setupEventListeners() {
    startBtn.addEventListener('click', () => {
      if (appState.audioHandler) {
        appState.audioHandler.initializeAudio();
      }
      showScreen('settings');
    });
    startTrainingBtn.addEventListener('click', () => {
      if (appState.audioHandler) {
        appState.audioHandler.initializeAudio();
      }
      startTrainingSession();
    });
    exitTrainingBtn.addEventListener('click', exitTrainingSession);
    replayNoteBtn.addEventListener('click', () => {
      if (appState.audioHandler) {
        appState.audioHandler.initializeAudio();
      }
      replayCurrentNote();
    });
    backToMainBtn.addEventListener('click', () => showScreen('main-menu'));
    backToMainFromProgressBtn.addEventListener('click', () => showScreen('main-menu'));
    viewProgressLink.addEventListener('click', (e) => {
      e.preventDefault();
      showScreen('progress');
    });
    
    // Add reset progress button listener
    document.getElementById('reset-progress').addEventListener('click', resetAllProgress);
  }

  // Check for MIDI access
  function checkMIDIAccess() {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
      console.log('Web MIDI API is not supported in this browser.');
      appState.isMidiAvailable = false;
      createOnScreenKeyboard();
    }
  }

  function onMIDISuccess(midiAccess) {
    console.log('MIDI Access successful');
    appState.midiAccess = midiAccess;
    appState.isMidiAvailable = true;
    
    // Try to get the first MIDI input device
    const inputs = midiAccess.inputs.values();
    for (let input of inputs) {
      if (input.state === 'connected') {
        appState.midiInput = input;
        console.log('MIDI Input connected:', input.name);
        input.onmidimessage = handleMIDIMessage;
        break; // Use the first available input that's connected
      }
    }
    
    // Always add MIDI access listeners for when devices are connected/disconnected
    midiAccess.onstatechange = (event) => {
      const port = event.port;
      if (port.type === 'input' && port.state === 'connected') {
        appState.midiInput = port;
        console.log('New MIDI input connected:', port.name);
        port.onmidimessage = handleMIDIMessage;
        // Hide the on-screen keyboard if a device is connected
        onscreenKeyboard.classList.add('hidden');
      } else if (port.type === 'input' && port.state === 'disconnected') {
        console.log('MIDI input disconnected:', port.name);
        // Check if there are still other inputs connected
        const inputs = midiAccess.inputs.values();
        let newActiveInput = null;
        for (let input of inputs) {
          if (input.state === 'connected' && input !== port) {
            newActiveInput = input;
            break;
          }
        }
        
        if (newActiveInput) {
          // Use another connected input
          appState.midiInput = newActiveInput;
        } else {
          // No inputs left, clear the MIDI input
          appState.midiInput = null;
          // Show the on-screen keyboard if no MIDI device is available
          createOnScreenKeyboard();
        }
      }
    };
    
    // If no input was found initially, create on-screen keyboard
    if (!appState.midiInput) {
      console.log('No MIDI input found initially, creating on-screen keyboard');
      createOnScreenKeyboard();
    } else {
      // If MIDI is available, hide the on-screen keyboard container
      onscreenKeyboard.classList.add('hidden');
    }
  }

  function onMIDIFailure() {
    console.log('MIDI Access failed');
    appState.isMidiAvailable = false;
    createOnScreenKeyboard();
  }

  // Handle incoming MIDI messages
  function handleMIDIMessage(message) {
    if (!appState.trainingActive) return;
    
    const [command, note, velocity] = message.data;
    const commandType = command & 0xf0; // We're only interested in the command type
    
    // Note ON
    if (commandType === 0x90 && velocity > 0) {
      handleNotePlayed(note, true);
    } 
    // Note OFF
    else if (commandType === 0x80 || (commandType === 0x90 && velocity === 0)) {
      handleNotePlayed(note, false);
    }
  }

  // Initialize note and octave selection with visually appealing elements
  function initializeNoteAndOctaveSelection() {
    // Clear existing elements
    octaveSelection.innerHTML = '';
    noteSelection.innerHTML = '';
    
    // Create octave selection options (1 to 8)
    for (let i = 1; i <= 8; i++) {
      const option = document.createElement('div');
      option.className = `octave-option ${appState.selectedOctaves.includes(i) ? 'selected' : ''}`;
      option.dataset.value = i;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `octave-${i}`;
      checkbox.value = i;
      checkbox.checked = appState.selectedOctaves.includes(i);
      checkbox.className = 'octave-checkbox';
      
      const label = document.createElement('span');
      label.textContent = `Oct ${i}`;
      
      option.appendChild(checkbox);
      option.appendChild(label);
      
      option.addEventListener('click', (e) => {
        // Toggle the checkbox
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
          if (!appState.selectedOctaves.includes(parseInt(checkbox.value))) {
            appState.selectedOctaves.push(parseInt(checkbox.value));
          }
        } else {
          appState.selectedOctaves = appState.selectedOctaves.filter(oct => oct !== parseInt(checkbox.value));
        }
        
        // Update visual selection
        option.classList.toggle('selected', checkbox.checked);
      });
      
      octaveSelection.appendChild(option);
    }
    
    // Create note selection options (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    notes.forEach(note => {
      const option = document.createElement('div');
      option.className = `note-option ${appState.selectedNotes.includes(note) ? 'selected' : ''}`;
      option.dataset.value = note;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `note-${note}`;
      checkbox.value = note;
      checkbox.checked = appState.selectedNotes.includes(note);
      checkbox.className = 'note-checkbox';
      
      const label = document.createElement('span');
      label.textContent = note;
      
      option.appendChild(checkbox);
      option.appendChild(label);
      
      option.addEventListener('click', (e) => {
        // Toggle the checkbox
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
          if (!appState.selectedNotes.includes(checkbox.value)) {
            appState.selectedNotes.push(checkbox.value);
          }
        } else {
          appState.selectedNotes = appState.selectedNotes.filter(n => n !== checkbox.value);
        }
        
        // Update visual selection
        option.classList.toggle('selected', checkbox.checked);
      });
      
      noteSelection.appendChild(option);
    });
  }

  // Show the specified screen
  function showScreen(screenName) {
    // Hide all screens
    mainMenuScreen.classList.add('hidden');
    settingsScreen.classList.add('hidden');
    trainingScreen.classList.add('hidden');
    progressScreen.classList.add('hidden');
    
    // Show the requested screen
    switch(screenName) {
      case 'main-menu':
        mainMenuScreen.classList.remove('hidden');
        break;
      case 'settings':
        settingsScreen.classList.remove('hidden');
        break;
      case 'training':
        trainingScreen.classList.remove('hidden');
        break;
      case 'progress':
        progressScreen.classList.remove('hidden');
        renderProgressData();
        break;
    }
    
    appState.currentScreen = screenName;
  }

  // Start the training session
  function startTrainingSession() {
    // Update app state
    appState.selectedInstrument = instrumentSelect.value;
    appState.trainingActive = true;
    
    // Start session timer
    appState.sessionStartTime = new Date().getTime();
    
    // Show training screen
    showScreen('training');
    
    // Initialize training session
    resetTrainingSession();
    playNextNote();
  }

  // Reset the training session state
  function resetTrainingSession() {
    appState.currentNote = null;
    appState.startTime = null;
    appState.retries = 0;
    appState.correctGuesses = 0;
    appState.incorrectGuesses = 0;
  }

  // Exit the training session
  function exitTrainingSession() {
    if (appState.trainingActive && appState.sessionStartTime) {
      // Calculate session duration and add to daily practice
      const sessionDuration = (new Date().getTime() - appState.sessionStartTime) / 1000; // in seconds
      const today = new Date().toISOString().split('T')[0];
      
      if (!appState.progressData.dailyPractice[today]) {
        appState.progressData.dailyPractice[today] = 0;
      }
      
      // Add session time to daily practice
      appState.progressData.dailyPractice[today] += Math.round(sessionDuration);
      saveProgressData();
    }
    
    appState.trainingActive = false;
    showScreen('main-menu');
  }

  // Replay the current note
  function replayCurrentNote() {
    if (appState.currentNote) {
      playNoteForTraining(appState.currentNote);
    }
  }

    // Play the next note in the training session
  function playNextNote() {
    if (!appState.trainingActive) return;
    
    // Select a random note from the chosen octaves and notes
    appState.currentNote = getRandomNote();
    // Don't show the note name, just show a placeholder or nothing
    noteDisplay.textContent = '?';
    
    // Start timing from when the note is played
    appState.noteStartTime = new Date().getTime();
    
    // Reset retries for this note (this counts failed attempts for the current note)
    appState.retries = 0;
    
    // Play the note
    playNoteForTraining(appState.currentNote);
  }

  // Get a random note based on selected octaves and notes
  function getRandomNote() {
    const selectedOctaves = appState.selectedOctaves;
    const selectedNotes = appState.selectedNotes;
    
    if (selectedOctaves.length === 0 || selectedNotes.length === 0) {
      // Fallback to a default note if no selections
      return 'C4';
    }
    
    // Randomly select an octave and note
    const randomOctave = selectedOctaves[Math.floor(Math.random() * selectedOctaves.length)];
    const randomNote = selectedNotes[Math.floor(Math.random() * selectedNotes.length)];
    
    return `${randomNote}${randomOctave}`;
  }

  // Play a note for the training session
  function playNoteForTraining(note) {
    if (appState.audioHandler) {
      // Initialize audio on first user interaction (needed on some browsers)
      appState.audioHandler.initializeAudio();
      
      // Play the note with the selected instrument
      appState.audioHandler.playNote(note, appState.selectedInstrument, 1.5); // Slightly longer duration for better learning
    } else {
      console.log(`Playing note: ${note} with ${appState.selectedInstrument}`);
    }
  }

  // Handle when a note is played (from MIDI or on-screen keyboard)
  function handleNotePlayed(noteNumber, isNoteOn) {
    // Convert MIDI note number to note name (with and without octave)
    const noteNameNoOctave = midiNoteToNameNoOctave(noteNumber);
    
    // Extract the note name from the current note being trained on
    const currentNoteName = appState.currentNote.replace(/\d/g, ''); // Remove octave numbers
    
    // Check if this is the correct note
    if (isNoteOn) {
      // Note just pressed - start tracking if it's the correct note
      if (noteNameNoOctave === currentNoteName) {
        // This is the correct note name, start the timer to see if it's held
        window.currentlyPressedNote = noteNumber;
        window.keyPressTime = new Date().getTime(); // Track when the key was pressed
      } else {
        // This is the wrong note
        handleIncorrectNote();
      }
    } else {
      // Note released
      if (noteNumber === window.currentlyPressedNote) {
        // This was the correct note that was being checked
        // Check if it was held for at least 1 second
        const heldDuration = new Date().getTime() - window.keyPressTime;
        
        if (heldDuration >= 1000) {
          // Held for 1 second or more, correct - calculate time from when note was played by app
          const timeToCorrect = new Date().getTime() - appState.noteStartTime;
          window.keyPressTime = null;
          handleCorrectNoteWithDuration(timeToCorrect / 1000); // Convert to seconds
        } else {
          // Released too early, incorrect
          window.keyPressTime = null;
          handleIncorrectNote();
        }
        
        window.currentlyPressedNote = null;
      }
    }
  }

    // Handle correct note input with time duration
  function handleCorrectNoteWithDuration(timeTaken) {
    // Update statistics
    appState.correctGuesses++;
    
    // Show the correct note
    noteDisplay.textContent = appState.currentNote;
    
    // Record this attempt in progress data
    recordTrainingAttempt(true, appState.retries, timeTaken); // Time already in seconds
    
    // Show success feedback
    showFeedback('correct');
    
    // Play next note after a short delay
    setTimeout(() => {
      playNextNote();
    }, 1000);
  }
  
  // Handle correct note input (for backward compatibility)
  function handleCorrectNote() {
    // Calculate time taken from when note was played to when correct note was held for 1s
    const timeTaken = new Date().getTime() - appState.noteStartTime;
    
    handleCorrectNoteWithDuration(timeTaken / 1000); // Convert to seconds
  }

  // Handle incorrect note input
  function handleIncorrectNote() {
    // Update statistics
    appState.incorrectGuesses++;
    // Increment retries - this counts how many incorrect attempts were made for the current note
    // We increment here because when the correct note is eventually played, 
    // the retries value will represent how many failures occurred before success
    appState.retries++;
    
    // Record this attempt in progress data as incorrect
    // We don't record time for incorrect attempts in the time tracking, 
    // since time tracking is for successful identification time
    // Just track that an incorrect attempt happened for accuracy
    recordTrainingAttempt(false, 0, 0); // Don't pass retries value for incorrect attempts, just track accuracy
    
    // Show error feedback
    showFeedback('incorrect');
  }

  // Show feedback (correct/incorrect)
  function showFeedback(type) {
    feedbackAnimation.className = 'w-full h-full flex items-center justify-center';
    
    // Clear previous content
    feedbackAnimation.innerHTML = '';
    
    if (type === 'correct') {
      // Create a pulsating checkmark with expanding circles
      const checkmarkContainer = document.createElement('div');
      checkmarkContainer.className = 'relative w-40 h-40 flex items-center justify-center';
      
      // Create expanding circles
      for (let i = 1; i <= 3; i++) {
        const circle = document.createElement('div');
        circle.className = `absolute rounded-full border-4 border-green-500 opacity-70`;
        circle.style.width = `${i * 30}px`;
        circle.style.height = `${i * 30}px`;
        circle.style.animation = `pulse ${1 + i * 0.5}s infinite ${i * 0.2}s`;
        checkmarkContainer.appendChild(circle);
      }
      
      // Create checkmark
      const checkmark = document.createElement('div');
      checkmark.innerHTML = '✓';
      checkmark.className = 'text-green-500 text-6xl z-10';
      checkmark.style.textShadow = '0 0 20px rgba(34, 197, 94, 0.8)';
      checkmarkContainer.appendChild(checkmark);
      
      feedbackAnimation.appendChild(checkmarkContainer);
      
      // Add CSS for the pulse animation if not already present
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(0.1); opacity: 0.7; }
          50% { opacity: 0.5; }
          100% { transform: scale(1); opacity: 0; }
        }
      `;
      if (!document.querySelector('#pulse-animation')) {
        style.id = 'pulse-animation';
        document.head.appendChild(style);
      }
    } else if (type === 'incorrect') {
      // Create a shaking X mark with background flash
      const xContainer = document.createElement('div');
      xContainer.className = 'relative w-40 h-40 flex items-center justify-center';
      
      // Create background flash effect
      const flash = document.createElement('div');
      flash.className = 'absolute w-full h-full bg-red-500 rounded-full opacity-30 animate-ping';
      xContainer.appendChild(flash);
      
      // Create X mark with shake animation
      const xMark = document.createElement('div');
      xMark.innerHTML = '✗';
      xMark.className = 'text-red-500 text-6xl z-10';
      xMark.style.textShadow = '0 0 20px rgba(239, 68, 68, 0.8)';
      xMark.style.animation = 'shake 0.5s linear';
      xContainer.appendChild(xMark);
      
      feedbackAnimation.appendChild(xContainer);
    }
    
    // Clear feedback after 1.5 seconds
    setTimeout(() => {
      if (feedbackAnimation.innerHTML !== '') {
        feedbackAnimation.innerHTML = '';
        feedbackAnimation.className = '';
      }
    }, 1500);
  }
  
  // Record a training attempt in the progress data
  function recordTrainingAttempt(isCorrect, retries, timeTaken) {
    // Get today's date as a string
    const today = new Date().toISOString().split('T')[0];
    
    // Ensure today's data is initialized
    if (!appState.progressData.dailyPractice[today]) {
      appState.progressData.dailyPractice[today] = 0;
    }
    if (!appState.progressData.accuracy[today]) {
      appState.progressData.accuracy[today] = { correct: 0, incorrect: 0 };
    }
    if (!appState.progressData.retries[today]) {
      appState.progressData.retries[today] = [];
    }
    if (!appState.progressData.time[today]) {
      appState.progressData.time[today] = [];
    }
    
    // Update accuracy - both correct and incorrect attempts should be recorded
    if (isCorrect) {
      appState.progressData.accuracy[today].correct++;
    } else {
      appState.progressData.accuracy[today].incorrect++;
    }
    
    // Update retries and time for daily stats - only for successful attempts
    if (isCorrect) {
      appState.progressData.time[today].push(timeTaken);  // How long it took to get it right
      appState.progressData.retries[today].push(retries); // How many attempts it took to get this note right
    }
    
    // Update hardest notes tracking - reset data periodically to focus on recent performance
    if (!appState.progressData.hardestNotes[appState.currentNote]) {
      appState.progressData.hardestNotes[appState.currentNote] = { 
        note: appState.currentNote,
        totalAttempts: 0,
        correctAttempts: 0,
        retries: [],
        time: [],
        lastUpdated: null  // Track when this was last updated
      };
    }
    
    // Check if we should reset data for this note (e.g., if it hasn't been practiced recently)
    const now = new Date();
    const lastUpdated = appState.progressData.hardestNotes[appState.currentNote].lastUpdated ? 
      new Date(appState.progressData.hardestNotes[appState.currentNote].lastUpdated) : 
      now;
    
    // Reset if the note hasn't been practiced in the last 30 days
    const daysSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) {
      // Reset data for this note
      appState.progressData.hardestNotes[appState.currentNote].totalAttempts = 0;
      appState.progressData.hardestNotes[appState.currentNote].correctAttempts = 0;
      appState.progressData.hardestNotes[appState.currentNote].retries = [];
      appState.progressData.hardestNotes[appState.currentNote].time = [];
    }
    
    // Update note-specific stats
    appState.progressData.hardestNotes[appState.currentNote].totalAttempts++;
    appState.progressData.hardestNotes[appState.currentNote].lastUpdated = now.toISOString();
    
    if (isCorrect) {
      appState.progressData.hardestNotes[appState.currentNote].correctAttempts++;
      appState.progressData.hardestNotes[appState.currentNote].retries.push(retries);
      appState.progressData.hardestNotes[appState.currentNote].time.push(timeTaken);
    }
    
    // Save updated data immediately
    saveProgressData();
  }

  // Convert MIDI note number to note name
  function midiNoteToName(noteNumber) {
    // Simplified conversion - in a real implementation, we'd want more accuracy
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1; // MIDI notes start at C-1
    const noteIndex = noteNumber % 12;
    
    return `${noteNames[noteIndex]}${octave}`;
  }

  // Convert MIDI note number to note name without octave
  function midiNoteToNameNoOctave(noteNumber) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteIndex = noteNumber % 12;
    
    return noteNames[noteIndex];
  }

  // Create on-screen keyboard if no MIDI device is detected
  function createOnScreenKeyboard() {
    // Show the on-screen keyboard container
    onscreenKeyboard.classList.remove('hidden');
    
    // Create piano keys - just one octave since the app is octave-agnostic
    const octave = 4; // Use 4th octave as the reference
    
    // Clear previous keyboard
    onscreenKeyboard.innerHTML = '';
    
    // Create a container for one octave
    const octaveDiv = document.createElement('div');
    octaveDiv.className = 'relative h-40 mx-auto my-4'; // Set a fixed height for the keyboard
    octaveDiv.style.width = '336px'; // 7 white keys * 48px (with margins)
    octaveDiv.dataset.octave = octave;
    
    // Create white keys first (they go behind black keys)
    const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    whiteNotes.forEach((note, index) => {
      const key = document.createElement('div');
      key.className = 'piano-key white absolute';
      key.dataset.note = `${note}${octave}`;
      key.dataset.midiNote = getMIDINoteNumber(note, octave);
      
      // Position white keys
      key.style.left = `${index * 48}px`;
      key.style.width = '44px'; // Adjust width to fit 7 keys in 336px with margins
      
      key.addEventListener('touchstart', handleKeyPress);
      key.addEventListener('mousedown', handleKeyPress);
      
      // For mouse up and touch end, we'll use a common function
      const handleKeyRelease = (e) => {
        e.preventDefault();
        // Find the key element that was released
        let keyElement = e.currentTarget;
        if (!keyElement.classList.contains('piano-key')) {
          keyElement = e.target;
        }
        keyElement.classList.remove('active');
        
        const midiNote = parseInt(keyElement.dataset.midiNote);
        handleNotePlayed(midiNote, false);
      };
      
      key.addEventListener('touchend', handleKeyRelease);
      key.addEventListener('mouseup', handleKeyRelease);
      key.addEventListener('touchcancel', handleKeyRelease);
      
      octaveDiv.appendChild(key);
    });
    
    // Create black keys in the right positions
    const blackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];
    const blackKeyPositions = [0, 1, 3, 4, 5]; // Which white keys they appear after
    
    blackNotes.forEach((note, index) => {
      const blackKey = document.createElement('div');
      blackKey.className = 'piano-key black absolute';
      blackKey.dataset.note = `${note}${octave}`;
      blackKey.dataset.midiNote = getMIDINoteNumber(note, octave);
      
      // Position black keys between white keys
      const leftPos = blackKeyPositions[index] * 48 + 34; // Positioned between white keys
      blackKey.style.left = `${leftPos}px`;
      
      blackKey.addEventListener('touchstart', handleKeyPress);
      blackKey.addEventListener('mousedown', handleKeyPress);
      
      const handleBlackKeyRelease = (e) => {
        e.preventDefault();
        let keyElement = e.currentTarget;
        if (!keyElement.classList.contains('piano-key')) {
          keyElement = e.target;
        }
        keyElement.classList.remove('active');
        
        const midiNote = parseInt(keyElement.dataset.midiNote);
        handleNotePlayed(midiNote, false);
      };
      
      blackKey.addEventListener('touchend', handleBlackKeyRelease);
      blackKey.addEventListener('mouseup', handleBlackKeyRelease);
      blackKey.addEventListener('touchcancel', handleBlackKeyRelease);
      
      octaveDiv.appendChild(blackKey);
    });
    
    onscreenKeyboard.appendChild(octaveDiv);
  }

  // Get MIDI note number from note name and octave
  function getMIDINoteNumber(noteName, octave) {
    const noteValues = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 
      'E': 4, 'F': 5, 'F#': 6, 'G': 7, 
      'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    
    // MIDI note number: 12 * (octave + 1) + note value
    // Starting at octave -1 for MIDI note 0 (C-1), middle C (C4) is MIDI note 60
    return 12 * (octave + 1) + noteValues[noteName];
  }

  // Handle on-screen keyboard key press
  function handleKeyPress(e) {
    e.preventDefault();
    const key = e.currentTarget;
    const note = key.dataset.note;
    const midiNote = parseInt(key.dataset.midiNote);
    
    // Add active class for visual feedback
    key.classList.add('active');
    
    // Play the note sound using the audio handler
    if (appState.audioHandler) {
      appState.audioHandler.initializeAudio();
      // Use the currently selected instrument for playback
      appState.audioHandler.playNote(note, appState.selectedInstrument, 0.5); // Short duration for key press feedback
    }
    
    // Handle the note being played
    handleNotePlayed(midiNote, true);
  }

  // Load progress data from localStorage
  function loadProgressData() {
    try {
      const savedData = localStorage.getItem('perfectPitchProgress');
      if (savedData) {
        appState.progressData = JSON.parse(savedData);
      } else {
        // Initialize with default values if no saved data exists
        appState.progressData = {
          dailyPractice: {}, // Date string as key
          accuracy: {},
          retries: {},
          time: {},
          hardestNotes: {},
          perfectPitchPercentage: 0
        };
      }
    } catch (e) {
      console.error('Error loading progress data:', e);
      // Initialize with default values if there's an error
      appState.progressData = {
        dailyPractice: {}, // Date string as key
        accuracy: {},
        retries: {},
        time: {},
        hardestNotes: {},
        perfectPitchPercentage: 0
      };
    }
  }

  // Reset all progress data
  function resetAllProgress() {
    // Confirm with the user before resetting data
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      // Reset the progress data to default values
      appState.progressData = {
        dailyPractice: {}, // Date string as key
        accuracy: {},
        retries: {},
        time: {},
        hardestNotes: {},
        perfectPitchPercentage: 0
      };
      
      // Save the reset data to localStorage
      saveProgressData();
      
      // Show a confirmation message
      alert('All progress data has been reset successfully.');
      
      // Refresh the progress screen if it's currently displayed
      if (appState.currentScreen === 'progress') {
        renderProgressData();
      }
    }
  }

  // Save progress data to localStorage
  function saveProgressData() {
    try {
      localStorage.setItem('perfectPitchProgress', JSON.stringify(appState.progressData));
    } catch (e) {
      console.error('Error saving progress data:', e);
    }
  }

  // Render progress data on the progress screen
  function renderProgressData() {
    // Update perfect pitch percentage first
    appState.progressData.perfectPitchPercentage = calculatePerfectPitchPercentage();
    perfectPitchValue.textContent = `${Math.floor(appState.progressData.perfectPitchPercentage)}%`;
    
    // Initialize charts using our custom chart implementation
    if (window.ProgressCharts) {
      const charts = new window.ProgressCharts(appState.progressData);
    }
  }
  
    // Calculate the "Perfect Pitch" percentage
  function calculatePerfectPitchPercentage() {
    // Criteria for perfect pitch:
    // - Fast responses (under a certain threshold) - 25%
    // - High accuracy (minimal incorrect guesses) - 30%
    // - No retries (guess first time) - 25%
    // - All notes practiced with proficiency - 20%
    
    // Get all time data
    const { accuracy, retries, time, hardestNotes } = appState.progressData;
    
    // 1. ACCURACY SCORE (30% of total)
    // Calculate overall accuracy across all days
    let totalCorrect = 0;
    let totalIncorrect = 0;
    
    Object.values(accuracy).forEach(day => {
      totalCorrect += day.correct || 0;
      totalIncorrect += day.incorrect || 0;
    });
    
    const totalAttempts = totalCorrect + totalIncorrect;
    const accuracyPercentage = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const accuracyScore = (accuracyPercentage / 100) * 30; // Up to 30 points
    
    // 2. RETRIES SCORE (25% of total)
    // Calculate average retries across all successful attempts
    let totalRetries = 0;
    let allRetriesCount = 0;
    
    Object.values(retries).forEach(dayRetries => {
      if (Array.isArray(dayRetries)) {
        totalRetries += dayRetries.reduce((sum, val) => sum + val, 0);
        allRetriesCount += dayRetries.length;
      }
    });
    
    const avgRetries = allRetriesCount > 0 ? totalRetries / allRetriesCount : 0;
    // Lower retries = higher score (0 retries = 25 points, higher retries = lower score)
    const retriesScore = Math.max(0, 25 - (avgRetries * 5)); // Each retry reduces score by 5 points
    
    // 3. TIME SCORE (25% of total)
    // Calculate average time across all successful attempts
    let totalTime = 0;
    let allTimesCount = 0;
    
    Object.values(time).forEach(dayTimes => {
      if (Array.isArray(dayTimes)) {
        totalTime += dayTimes.reduce((sum, val) => sum + val, 0);
        allTimesCount += dayTimes.length;
      }
    });
    
    const avgTime = allTimesCount > 0 ? totalTime / allTimesCount : 10; // Default to 10s if no data
    // Faster responses = higher score (fast responses = 25 points, slower = lower score)
    // We'll use an exponential decay function to score time: score = max_score * e^(-time/constant)
    // For example, if constant = 2, then at 2s the score is ~63% of max, at 4s it's ~13% of max
    const timeScoreConstant = 3;
    const rawTimeScore = 25 * Math.exp(-avgTime / timeScoreConstant);
    const timeScore = Math.max(0, rawTimeScore); // Up to 25 points
    
    // 4. NOTE COVERAGE SCORE (20% of total)
    // Check how many different notes have been practiced
    // To get full points, user needs to have practiced all possible notes with some proficiency
    
    // Define all possible notes that could be trained on (based on selected octaves and notes)
    const allPossibleNotes = [];
    appState.selectedOctaves.forEach(octave => {
      appState.selectedNotes.forEach(note => {
        allPossibleNotes.push(`${note}${octave}`);
      });
    });
    
    // Count how many of the possible notes have been attempted
    const attemptedNotes = Object.keys(hardestNotes);
    const uniqueAttempted = attemptedNotes.length;
    const uniquePossible = allPossibleNotes.length > 0 ? allPossibleNotes.length : 1; // Avoid division by zero
    
    // Calculate note coverage score based on how many notes have been attempted
    const noteCoveragePercentage = (uniqueAttempted / uniquePossible) * 100;
    
    // To earn points for a note, it needs to have been practiced with some proficiency
    // Let's say a note is considered "mastered" if the user has at least 5 attempts with 
    // an average of less than 2 retries and less than 3 seconds per attempt
    let masteredNotes = 0;
    attemptedNotes.forEach(note => {
      const noteStats = hardestNotes[note];
      if (noteStats && noteStats.retries && noteStats.time && 
          Array.isArray(noteStats.retries) && Array.isArray(noteStats.time) &&
          noteStats.retries.length > 0) {
        const avgRetriesForNote = noteStats.retries.reduce((a, b) => a + b, 0) / noteStats.retries.length;
        const avgTimeForNote = noteStats.time.reduce((a, b) => a + b, 0) / noteStats.time.length;
        
        if (noteStats.totalAttempts >= 5 && avgRetriesForNote < 2 && avgTimeForNote < 3) {
          masteredNotes++;
        }
      }
    });
    
    const masteredPercentage = (masteredNotes / uniquePossible) * 100;
    // Use the minimum of coverage percentage and mastered percentage
    const effectiveNoteScore = Math.min(noteCoveragePercentage, masteredPercentage);
    const noteScore = (effectiveNoteScore / 100) * 20; // Up to 20 points
    
    // Calculate total score
    const totalScore = accuracyScore + retriesScore + timeScore + noteScore;
    
    // Ensure the score doesn't exceed 100%
    return Math.min(100, Math.max(0, totalScore)); // Clamp between 0-100
  }

  // Initialize the app
  initApp();
});