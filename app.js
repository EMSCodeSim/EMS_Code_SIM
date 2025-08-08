// Get the audio player element and related controls
const audioPlayer = document.getElementById('audioPlayer');
const audioProgress = document.getElementById('audioProgress');
const currentTimeSpan = document.getElementById('currentTime');
const totalTimeSpan = document.getElementById('totalTime');
const playButton = document.getElementById('playSoundBtn');
const pauseButton = document.getElementById('pauseSoundBtn');
const stopButton = document.getElementById('stopSoundBtn');

// Set initial sound file (ensure the path is correct)
const sounds = {
    normal: new Audio('main/vitals/normal_sound.mp3'),
    stridor: new Audio('main/vitals/stridor_sound.mp3'),
    wheezing: new Audio('main/vitals/wheezing_sound.mp3'),
};

let currentSound = sounds.normal; // Default sound is normal
let currentVolume = 0.5; // Default volume level

// Event listener for the "Play" button
playButton.addEventListener('click', () => {
    currentSound.volume = currentVolume;  // Set volume based on slider
    currentSound.play();  // Play the selected sound
});

// Event listener for the "Pause" button
pauseButton.addEventListener('click', () => {
    currentSound.pause();  // Pause the current sound
});

// Event listener for the "Stop" button
stopButton.addEventListener('click', () => {
    currentSound.pause();  // Pause the current sound
    currentSound.currentTime = 0;  // Reset the sound to the beginning
});

// Event listener for lung area buttons (simulate auscultation)
document.getElementById('RUL').addEventListener('click', () => {
    playSoundForLung('normal');
});

document.getElementById('LUL').addEventListener('click', () => {
    playSoundForLung('wheezing');
});

document.getElementById('RLL').addEventListener('click', () => {
    playSoundForLung('stridor');
});

document.getElementById('LLL').addEventListener('click', () => {
    playSoundForLung('normal');
});

// Function to play sound based on lung area
function playSoundForLung(lung) {
    currentSound.pause();
    currentSound = sounds[lung];
    currentSound.play();
}

// Update the progress bar as the audio plays
audioPlayer.addEventListener('timeupdate', () => {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    audioProgress.value = progress;

    // Update current time and total time display
    const currentMinutes = Math.floor(audioPlayer.currentTime / 60);
    const currentSeconds = Math.floor(audioPlayer.currentTime % 60);
    const totalMinutes = Math.floor(audioPlayer.duration / 60);
    const totalSeconds = Math.floor(audioPlayer.duration % 60);

    currentTimeSpan.textContent = `${currentMinutes}:${currentSeconds < 10 ? '0' : ''}${currentSeconds}`;
    totalTimeSpan.textContent = `${totalMinutes}:${totalSeconds < 10 ? '0' : ''}${totalSeconds}`;
});

// Volume control
document.getElementById('volume').addEventListener('input', (event) => {
    currentVolume = event.target.value / 100;  // Update volume value based on the slider
    currentSound.volume = currentVolume;  // Apply new volume to the sound
});

// Event listeners for Anterior and Posterior view buttons
document.getElementById('anteriorBtn').addEventListener('click', () => {
    document.getElementById('chestImage').src = 'main/vitals/front.jpg';
});

document.getElementById('posteriorBtn').addEventListener('click', () => {
    document.getElementById('chestImage').src = 'main/vitals/back.jpg';
});

// Reset button functionality
document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('chestImage').src = 'main/vitals/front.jpg';
    document.getElementById('soundType').value = 'normal';
    document.getElementById('volume').value = 50;
    currentVolume = 0.5;
    currentSound.pause();
    currentSound.currentTime = 0;
    audioProgress.value = 0;
});
