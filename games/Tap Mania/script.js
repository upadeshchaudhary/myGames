// Config
const GAME_DURATION = 10; // seconds
const COUNTDOWN_DURATION = 3; // seconds

// State
let tapCount = 0;
let timeRemaining = GAME_DURATION;
let bestScore = Number(localStorage.getItem('tapManiaBest')) || 0;
let gameTimer = null;
let countdownTimer = null;

// Screens
const screens = {
  start: document.getElementById('start-screen'),
  countdown: document.getElementById('countdown-screen'),
  playing: document.getElementById('playing-screen'),
  result: document.getElementById('result-screen')
};

// Elements
const bestScoreDisplay = document.getElementById('best-score-display');
const countdownNumber = document.getElementById('countdown-number');
const timeDisplay = document.getElementById('time-display');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const newBestMsg = document.getElementById('new-best-msg');
const tapBtn = document.getElementById('tap-btn');
const startBtn = document.getElementById('start-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// Init
bestScoreDisplay.textContent = bestScore;

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function startCountdown() {
  showScreen('countdown');
  let count = COUNTDOWN_DURATION;
  countdownNumber.textContent = count;

  countdownTimer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
    } else {
      clearInterval(countdownTimer);
      startGame();
    }
  }, 1000);
}

function startGame() {
  tapCount = 0;
  timeRemaining = GAME_DURATION;
  scoreDisplay.textContent = tapCount;
  timeDisplay.textContent = timeRemaining.toFixed(1);
  showScreen('playing');

  const startTime = Date.now();
  const endTime = startTime + GAME_DURATION * 1000;

  gameTimer = setInterval(() => {
    const now = Date.now();
    timeRemaining = Math.max(0, (endTime - now) / 1000);
    timeDisplay.textContent = timeRemaining.toFixed(1);

    if (timeRemaining <= 0) {
      clearInterval(gameTimer);
      endGame();
    }
  }, 50);
}

function handleTap() {
  tapCount++;
  scoreDisplay.textContent = tapCount;
}

function endGame() {
  finalScore.textContent = tapCount;

  if (tapCount > bestScore) {
    bestScore = tapCount;
    localStorage.setItem('tapManiaBest', bestScore);
    newBestMsg.classList.remove('hidden');
  } else {
    newBestMsg.classList.add('hidden');
  }

  bestScoreDisplay.textContent = bestScore;
  showScreen('result');
}

// Events
startBtn.addEventListener('click', startCountdown);
playAgainBtn.addEventListener('click', startCountdown);
tapBtn.addEventListener('click', handleTap);
