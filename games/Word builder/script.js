// Word Builder — Nepali
// Pool of 50 English clue words -> Nepali target word (as tile syllables).
// Each session draws 20 at random (words can repeat across sessions),
// then orders them so difficulty (tile count) ramps up gradually.

const WORD_POOL = [
  // Fruits
  { clue: "Apple", word: ["स्या", "उ"] },
  { clue: "Banana", word: ["के", "रा"] },
  { clue: "Mango", word: ["आँ", "प"] },
  { clue: "Papaya", word: ["मे", "वा"] },
  { clue: "Guava", word: ["अ", "म्बा"] },
  { clue: "Orange", word: ["सु", "न्त", "ला"] },
  { clue: "Grapes", word: ["अं", "गू", "र"] },
  { clue: "Pomegranate", word: ["अ", "ना", "र"] },
  { clue: "Pineapple", word: ["अ", "ना", "ना", "स"] },
  { clue: "Watermelon", word: ["त", "र", "बु", "जा"] },

  // Vegetables
  { clue: "Potato", word: ["आ", "लु"] },
  { clue: "Onion", word: ["प्या", "ज"] },
  { clue: "Pumpkin", word: ["फ", "र्सी"] },
  { clue: "Cucumber", word: ["का", "क्रो"] },
  { clue: "Cabbage", word: ["बन्", "दा"] },
  { clue: "Garlic", word: ["ल", "सु", "न"] },
  { clue: "Carrot", word: ["गा", "ज", "र"] },
  { clue: "Spinach", word: ["पा", "लुं", "गो"] },
  { clue: "Cauliflower", word: ["का", "उ", "ली"] },
  { clue: "Tomato", word: ["गो", "ल", "भे", "डा"] },

  // Animals
  { clue: "Cow", word: ["गा", "ई"] },
  { clue: "Horse", word: ["घो", "डा"] },
  { clue: "Lion", word: ["सिं", "ह"] },
  { clue: "Tiger", word: ["बा", "घ"] },
  { clue: "Goat", word: ["बा", "ख्रा"] },
  { clue: "Elephant", word: ["हा", "त्ती"] },
  { clue: "Dog", word: ["कु", "कु", "र"] },
  { clue: "Cat", word: ["बि", "रा", "लो"] },
  { clue: "Monkey", word: ["बाँ", "द", "र"] },
  { clue: "Rabbit", word: ["ख", "रा", "यो"] },

  // Birds
  { clue: "Crow", word: ["का", "ग"] },
  { clue: "Duck", word: ["हाँ", "स"] },
  { clue: "Eagle", word: ["ची", "ल"] },
  { clue: "Parrot", word: ["सु", "गा"] },
  { clue: "Peacock", word: ["म", "यू", "र"] },
  { clue: "Pigeon", word: ["ढु", "कु", "र"] },
  { clue: "Sparrow", word: ["भँ", "गे", "रा"] },
  { clue: "Owl", word: ["ला", "टो", "को", "से", "रो"] },

  // Flowers
  { clue: "Rose", word: ["गु", "ला", "ब"] },
  { clue: "Lotus", word: ["क", "म", "ल"] },
  { clue: "Jasmine", word: ["च", "मे", "ली"] },
  { clue: "Marigold", word: ["स", "य", "प", "त्री"] },
  { clue: "Sunflower", word: ["सू", "र्य", "मु", "खी"] },

  // Days
  { clue: "Monday", word: ["सोम", "बा", "र"] },
  { clue: "Sunday", word: ["आ", "इत", "बा", "र"] },
  { clue: "Tuesday", word: ["मं", "गल", "बा", "र"] },
  { clue: "Wednesday", word: ["बु", "ध", "बा", "र"] },

  // Numbers
  { clue: "Five", word: ["पाँ", "च"] },
  { clue: "Seven", word: ["सा", "त"] },
  { clue: "Ten", word: ["द", "श"] },
];

const WORDS_PER_SESSION = 20;
const DISTRACTOR_COUNT_BY_DIFFICULTY = { Easy: 4, Medium: 6, Hard: 8 };
const TIME_BY_DIFFICULTY = { Easy: 10, Medium: 8, Hard: 6 };
const ALL_LETTERS = [...new Set(WORD_POOL.flatMap((w) => w.word))];

let session = [];
let current = 0;
let score = 0;
let built = [];
let timer = null;
let timeLeft = 0;
let timeTotal = 0;
let locked = false;
let wrongWords = 0;

const progressEl = document.getElementById("progress");
const difficultyEl = document.getElementById("difficulty");
const scoreEl = document.getElementById("score");
const mistakesEl = document.getElementById("mistakes");
const progressFill = document.getElementById("progressFill");
const ringFg = document.getElementById("ringFg");
const timerNum = document.getElementById("timerNum");
const clueEl = document.getElementById("clue");
const targetEl = document.getElementById("target");
const tilesEl = document.getElementById("tiles");
const feedbackEl = document.getElementById("feedback");
const skipBtn = document.getElementById("skipBtn");
const gameEl = document.getElementById("game");
const completeEl = document.getElementById("complete");
const finalScoreEl = document.getElementById("finalScore");
const finalMistakesEl = document.getElementById("finalMistakes");
const playAgainBtn = document.getElementById("playAgain");
const shareBtn = document.getElementById("shareBtn");
const restartBtn = document.getElementById("restartBtn");
const gamesLink = document.getElementById("gamesLink");

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

function difficultyFor(letterCount) {
  if (letterCount <= 3) return "Easy";
  if (letterCount === 4) return "Medium";
  return "Hard";
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSession() {
  // pick WORDS_PER_SESSION at random (repeats allowed across sessions, not within one)
  const picked = shuffle(WORD_POOL).slice(0, WORDS_PER_SESSION);
  // order by tile count ascending so difficulty ramps up gradually,
  // shuffling within each difficulty band to keep it varied
  const bands = {};
  picked.forEach((w) => {
    const len = w.word.length;
    if (!bands[len]) bands[len] = [];
    bands[len].push(w);
  });
  const orderedLengths = Object.keys(bands).map(Number).sort((a, b) => a - b);
  session = orderedLengths.flatMap((len) => shuffle(bands[len]));
}

function startGame() {
  buildSession();
  current = 0;
  score = 0;
  wrongWords = 0;
  scoreEl.textContent = score;
  mistakesEl.textContent = wrongWords;
  gameEl.classList.remove("hidden");
  completeEl.classList.add("hidden");
  loadWord();
}

function loadWord() {
  clearInterval(timer);
  locked = false;
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  const data = session[current];
  const difficulty = difficultyFor(data.word.length);
  built = [];

  progressEl.innerHTML = `Word ${current + 1} of ${session.length} · <em id="difficulty">${difficulty}</em>`;
  progressFill.style.width = `${((current) / session.length) * 100 + 5}%`;

  clueEl.textContent = data.clue;

  targetEl.innerHTML = "";
  data.word.forEach(() => {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.innerHTML = `<div class="letter"></div><div class="dash"></div>`;
    targetEl.appendChild(slot);
  });

  const distractors = shuffle(
    ALL_LETTERS.filter((l) => !data.word.includes(l))
  ).slice(0, DISTRACTOR_COUNT_BY_DIFFICULTY[difficulty]);

  const tileLetters = shuffle([...data.word, ...distractors]);

  tilesEl.innerHTML = "";
  tileLetters.forEach((letter) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.textContent = letter;
    tile.addEventListener("click", () => onTileClick(tile, letter, data));
    tilesEl.appendChild(tile);
  });

  timeTotal = TIME_BY_DIFFICULTY[difficulty];
  timeLeft = timeTotal;
  timerNum.textContent = timeLeft;
  ringFg.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  ringFg.style.strokeDashoffset = "0";
  ringFg.classList.remove("low");

  timer = setInterval(() => {
    timeLeft -= 1;
    timerNum.textContent = Math.max(timeLeft, 0);
    const fraction = Math.max(timeLeft, 0) / timeTotal;
    ringFg.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - fraction)}`;
    if (timeLeft <= Math.ceil(timeTotal * 0.25)) ringFg.classList.add("low");
    if (timeLeft <= 0) {
      clearInterval(timer);
      onTimeUp();
    }
  }, 1000);
}

function onTileClick(tileEl, letter, data) {
  if (locked || tileEl.classList.contains("used")) return;

  built.push(letter);
  tileEl.classList.add("used");
  const slots = targetEl.querySelectorAll(".slot");
  const slot = slots[built.length - 1];
  slot.querySelector(".letter").textContent = letter;
  slot.classList.add("filled");

  if (built.length === data.word.length) {
    const isCorrect = built.every((part, index) => part === data.word[index]);
    if (isCorrect) {
      onWordComplete();
    } else {
      onWrongWord();
    }
  } else {
    tileEl.classList.add("selected");
  }
}

function onWrongWord() {
  wrongWords += 1;
  mistakesEl.textContent = wrongWords;
  feedbackEl.textContent = "Try again";
  feedbackEl.className = "feedback bad";
  targetEl.classList.add("wrong");

  setTimeout(() => {
    built = [];
    targetEl.querySelectorAll(".slot").forEach((slot) => {
      slot.querySelector(".letter").textContent = "";
      slot.classList.remove("filled");
    });
    tilesEl.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("used", "selected");
    });
    targetEl.classList.remove("wrong");
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
  }, 450);
}

function onWordComplete() {
  clearInterval(timer);
  locked = true;
  const points = 10 + timeLeft * 2;
  score += points;
  scoreEl.textContent = score;
  feedbackEl.textContent = `Correct! +${points} points`;
  feedbackEl.className = "feedback good";
  setTimeout(nextWord, 900);
}

function onTimeUp() {
  locked = true;
  feedbackEl.textContent = "Time's up!";
  feedbackEl.className = "feedback bad";
  setTimeout(nextWord, 900);
}

function nextWord() {
  current += 1;
  if (current >= session.length) {
    finishRound();
  } else {
    loadWord();
  }
}

function finishRound() {
  clearInterval(timer);
  progressFill.style.width = "100%";
  gameEl.classList.add("hidden");
  completeEl.classList.remove("hidden");
  finalScoreEl.textContent = score;
  finalMistakesEl.textContent = wrongWords;
}

skipBtn.addEventListener("click", () => {
  if (locked) return;
  clearInterval(timer);
  locked = true;
  feedbackEl.textContent = "Skipped.";
  feedbackEl.className = "feedback";
  setTimeout(nextWord, 400);
});

playAgainBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
gamesLink.addEventListener("click", (e) => e.preventDefault());

shareBtn.addEventListener("click", async () => {
  const text = `I scored ${score} points on Word Builder — Nepali!`;
  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = "Copied!";
    setTimeout(() => (shareBtn.textContent = "Share result"), 1500);
  } catch {
    alert(text);
  }
});

startGame();