// Flag Tracker
// 9 cards, one is Nepal. Watch it, follow the shuffle, then pick it.

const COUNTRIES = [
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "GB", name: "Britain", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
];
const TARGET_CODE = "NP";
const MODES = {
  easy: {
    shuffleMoves: 8,
    moveMsStart: 620,
    moveMsMid: 520,
    moveMsEnd: 500,
    predictable: true,
    label: "Easy"
  },
  medium: {
    shuffleMoves: 16,
    moveMsStart: 420,
    moveMsMid: 360,
    moveMsEnd: 330,
    predictable: false,
    label: "Medium"
  },
  hard: {
    shuffleMoves: 28,
    moveMsStart: 340,
    moveMsMid: 300,
    moveMsEnd: 280,
    predictable: false,
    label: "Hard"
  }
};

const board = document.getElementById("board");
const startBtn = document.getElementById("startBtn");
const messageEl = document.getElementById("message");
const streakEl = document.getElementById("streak");
const roundEl = document.getElementById("round");
const modeSelect = document.getElementById("modeSelect");

let streak = 0;
let round = 1;
let cards = []; // { el, code, isTarget }
let picking = false;
let currentMode = modeSelect.value;

function setMessage(text, kind) {
  messageEl.textContent = text || "";
  messageEl.className = "message" + (kind ? " " + kind : "");
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBoard() {
  board.innerHTML = "";
  cards = [];

  const deck = shuffleArray(COUNTRIES);

  deck.forEach(({ code, name, flag }) => {
    const card = document.createElement("div");
    card.className = "card"; // starts hidden behind "?"
    card.innerHTML = `
      <div class="card-inner">
        <div class="question">?</div>
        <div class="code">${code}</div>
        <div class="flag">${flag}</div>
        <div class="label">${name.toUpperCase()}</div>
      </div>
    `;
    board.appendChild(card);
    cards.push({ el: card, code, isTarget: code === TARGET_CODE });
  });

  // reveal only the target so the player can watch it
  const target = cards.find((c) => c.isTarget);
  target.el.classList.add("revealed");
}

function muteAll() {
  cards.forEach((c) => c.el.classList.remove("revealed", "correct", "wrong"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// FLIP-based animated swap of two card DOM positions (2D, for grid layout)
function animateSwap(cardA, cardB, durationMs) {
  return new Promise((resolve) => {
    const firstA = cardA.el.getBoundingClientRect();
    const firstB = cardB.el.getBoundingClientRect();

    const parent = board;
    const placeholder = document.createElement("div");
    parent.insertBefore(placeholder, cardA.el);
    parent.insertBefore(cardA.el, cardB.el);
    parent.insertBefore(cardB.el, placeholder);
    placeholder.remove();

    const lastA = cardA.el.getBoundingClientRect();
    const lastB = cardB.el.getBoundingClientRect();

    const dxA = firstA.left - lastA.left;
    const dyA = firstA.top - lastA.top;
    const dxB = firstB.left - lastB.left;
    const dyB = firstB.top - lastB.top;

    cardA.el.style.transition = "none";
    cardB.el.style.transition = "none";
    cardA.el.style.transform = `translate(${dxA}px, ${dyA}px)`;
    cardB.el.style.transform = `translate(${dxB}px, ${dyB}px)`;

    requestAnimationFrame(() => {
      cardA.el.style.transition = `transform ${durationMs}ms ease`;
      cardB.el.style.transition = `transform ${durationMs}ms ease`;
      cardA.el.style.transform = "translate(0, 0)";
      cardB.el.style.transform = "translate(0, 0)";
    });

    setTimeout(() => {
      cardA.el.style.transition = "";
      cardB.el.style.transform = "";
      cardA.el.style.transform = "";
      resolve();
    }, durationMs);
  });
}

function getShufflePair(i) {
  const mode = MODES[currentMode];

  if (mode.predictable) {
    const pairList = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8]
    ];

    const pair = pairList[i % pairList.length];
    return pair;
  }

  const idxA = Math.floor(Math.random() * cards.length);
  let idxB = Math.floor(Math.random() * cards.length);
  while (idxB === idxA) idxB = Math.floor(Math.random() * cards.length);

  return [idxA, idxB];
}

async function shuffleCards() {
  const mode = MODES[currentMode];

  for (let i = 0; i < mode.shuffleMoves; i++) {
    const [idxA, idxB] = getShufflePair(i);

    const progress = i / (mode.shuffleMoves - 1);
    let duration;

    if (progress < 0.6) {
      const startProgress = progress / 0.6;
      duration = Math.round(
        mode.moveMsStart + (mode.moveMsMid - mode.moveMsStart) * startProgress
      );
    } else if (progress < 0.85) {
      const midProgress = (progress - 0.6) / 0.25;
      duration = Math.round(
        mode.moveMsMid - (mode.moveMsMid - 150) * midProgress
      );
    } else {
      const endProgress = (progress - 0.85) / 0.15;
      duration = Math.round(
        150 + (mode.moveMsEnd - 150) * endProgress
      );
    }

    await animateSwap(cards[idxA], cards[idxB], duration);
    [cards[idxA], cards[idxB]] = [cards[idxB], cards[idxA]];

    const interMoveDelay = i < mode.shuffleMoves - 1 ? Math.max(8, Math.round(duration * 0.07)) : 0;
    if (interMoveDelay > 0) {
      await sleep(interMoveDelay);
    }
  }
}

function enablePicking() {
  picking = true;
  cards.forEach((c) => {
    c.el.classList.add("pickable");
    c.el.addEventListener("click", onPick);
  });
}

function disablePicking() {
  picking = false;
  cards.forEach((c) => {
    c.el.classList.remove("pickable");
    c.el.removeEventListener("click", onPick);
  });
}

function onPick(e) {
  if (!picking) return;
  const card = cards.find((c) => c.el === e.currentTarget);
  if (!card) return;
  disablePicking();

  card.el.classList.add("revealed");

  if (card.isTarget) {
    card.el.classList.add("correct");
    streak += 1;
    setMessage("Correct! That was Nepal.", "good");
  } else {
    const target = cards.find((c) => c.isTarget);
    target.el.classList.add("revealed", "correct");
    streak = 0;
    setMessage("Not quite. That was Nepal.", "bad");
  }

  streakEl.textContent = streak;

  startBtn.textContent = "Try again";
  startBtn.disabled = false;
}

async function playRound() {
  startBtn.disabled = true;
  startBtn.textContent = "Shuffling...";
  setMessage("");
  cards.forEach((c) => c.el.classList.remove("correct", "wrong"));

  buildBoard();
  setMessage("Watch Nepal...");
  await sleep(1300);

  muteAll();
  setMessage("Follow it through the shuffle...");
  await sleep(250);

  board.classList.add("shuffling");
  await shuffleCards();
  board.classList.remove("shuffling");

  startBtn.textContent = "Pick Nepal";
  setMessage("Pick the Nepal card.");
  enablePicking();
}

modeSelect.addEventListener("change", () => {
  currentMode = modeSelect.value;
  setMessage("Mode set to " + MODES[currentMode].label + ".", "");
});

startBtn.addEventListener("click", () => {
  if (startBtn.textContent === "Try again") {
    round += 1;
    roundEl.textContent = round;
  }
  startBtn.textContent = "Shuffling...";
  playRound();
});

// initial render before first start
buildBoard();
setMessage("Press Start to begin.");