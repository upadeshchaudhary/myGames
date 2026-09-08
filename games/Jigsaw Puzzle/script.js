// ---- Config ----
const GRID = 4;
const TOTAL = GRID * GRID;
const TIME_LIMIT = 180;

const PUZZLES = [
  { id: 1, title: "Mount Everest", img: "https://picsum.photos/seed/everest/800/800" },
  { id: 2, title: "Kathmandu Durbar Square", img: "https://picsum.photos/seed/kathmandu/800/800" },
  { id: 3, title: "Pokhara & Phewa Lake", img: "https://picsum.photos/seed/pokhara/800/800" },
  { id: 4, title: "Pashupatinath", img: "https://picsum.photos/seed/pashupatinath/800/800" },
  { id: 5, title: "Mustang Valley", img: "https://picsum.photos/seed/mustang/800/800" },
];

// ---- State ----
let puzzleIdx = 0;
let pieces = [];
let moves = 0;
let timeRemaining = TIME_LIMIT;
let timer = null;
let finished = false;
const bestScores = {};

let draggedSlotIdx = null; // Dragged element index

const boardEl = document.getElementById('board');
const previewEl = document.getElementById('previewImg');
const timeEl = document.getElementById('timeVal');
const moveEl = document.getElementById('moveVal');
const scoreEl = document.getElementById('scoreVal');
const titleEl = document.getElementById('puzzleTitle');
const bestEl = document.getElementById('bestVal');
const overlay = document.getElementById('overlay');

function loadPuzzle() {
  clearInterval(timer);
  finished = false;
  moves = 0;
  timeRemaining = TIME_LIMIT;
  draggedSlotIdx = null;
  
  const currentPuzzle = PUZZLES[puzzleIdx];
  overlay.classList.remove('show');
  titleEl.textContent = currentPuzzle.title;
  previewEl.style.backgroundImage = `url(${currentPuzzle.img})`;

  createPieces();
  shufflePieces();
  renderBoard();
  updateStats();
  startTimer();
  showBest();
}

function createPieces() {
  pieces = [];
  for (let i = 0; i < TOTAL; i++) {
    pieces.push({ id: i, correctPos: i, currentPos: i });
  }
}

function shufflePieces() {
  let positions = pieces.map(p => p.currentPos);
  do {
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
  } while (positions.every((pos, i) => pos === i));
  pieces.forEach((p, i) => p.currentPos = positions[i]);
}

function renderBoard() {
  boardEl.innerHTML = '';
  const currentPuzzle = PUZZLES[puzzleIdx];
  const ordered = [...pieces].sort((a, b) => a.currentPos - b.currentPos);

  ordered.forEach((piece, slotIdx) => {
    const el = document.createElement('div');
    el.className = 'piece';
    el.draggable = true;
    el.dataset.slot = slotIdx;

    const row = Math.floor(piece.id / GRID);
    const col = piece.id % GRID;
    el.style.backgroundImage = `url(${currentPuzzle.img})`;
    el.style.backgroundSize = `${GRID * 100}% ${GRID * 100}%`;
    el.style.backgroundPosition = `${(col / (GRID - 1)) * 100}% ${(row / (GRID - 1)) * 100}%`;

    if (piece.currentPos === piece.correctPos) {
      el.classList.add('correct');
    }

    // --- Drag & Drop Event Listeners ---
    el.addEventListener('dragstart', (e) => handleDragStart(e, slotIdx));
    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragenter', handleDragEnter);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', (e) => handleDrop(e, slotIdx));
    el.addEventListener('dragend', handleDragEnd);

    // --- Touch Dragging Support ---
    el.addEventListener('touchstart', (e) => handleTouchStart(e, slotIdx), { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', (e) => handleTouchEnd(e, slotIdx));

    boardEl.appendChild(el);
  });
}

// --- HTML5 Drag and Drop Handlers ---
function handleDragStart(e, slotIdx) {
  if (finished) return;
  draggedSlotIdx = slotIdx;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  if (e.target.classList.contains('piece')) {
    e.target.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  if (e.target.classList.contains('piece')) {
    e.target.classList.remove('drag-over');
  }
}

function handleDrop(e, targetSlotIdx) {
  e.preventDefault();
  if (e.target.classList.contains('piece')) {
    e.target.classList.remove('drag-over');
  }

  if (draggedSlotIdx !== null && draggedSlotIdx !== targetSlotIdx) {
    swapPieces(draggedSlotIdx, targetSlotIdx);
    updateMoves();
    renderBoard();
    checkCompletion();
  }
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedSlotIdx = null;
}

// --- Touch Handlers (Mobile Support) ---
let activeTouchPiece = null;

function handleTouchStart(e, slotIdx) {
  if (finished) return;
  draggedSlotIdx = slotIdx;
  activeTouchPiece = e.currentTarget;
  activeTouchPiece.classList.add('dragging');
}

function handleTouchMove(e) {
  if (!activeTouchPiece) return;
  e.preventDefault(); // Prevent page scrolling while dragging
}

function handleTouchEnd(e) {
  if (!activeTouchPiece) return;
  
  activeTouchPiece.classList.remove('dragging');
  const touch = e.changedTouches[0];
  const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);

  if (targetEl && targetEl.classList.contains('piece')) {
    const targetSlotIdx = parseInt(targetEl.dataset.slot, 10);
    if (!isNaN(targetSlotIdx) && draggedSlotIdx !== targetSlotIdx) {
      swapPieces(draggedSlotIdx, targetSlotIdx);
      updateMoves();
      renderBoard();
      checkCompletion();
    }
  }

  draggedSlotIdx = null;
  activeTouchPiece = null;
}

function swapPieces(slotA, slotB) {
  const ordered = [...pieces].sort((a, b) => a.currentPos - b.currentPos);
  const pa = ordered[slotA], pb = ordered[slotB];
  const tmp = pa.currentPos;
  pa.currentPos = pb.currentPos;
  pb.currentPos = tmp;
}

function updateMoves() {
  moves++;
  updateStats();
}

function updateStats() {
  const mm = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
  const ss = String(timeRemaining % 60).padStart(2, '0');
  timeEl.textContent = `${mm}:${ss}`;
  moveEl.textContent = moves;
  scoreEl.textContent = calculateScore();
}

function calculateScore() {
  const elapsed = TIME_LIMIT - timeRemaining;
  let score = 1000 - moves * 5 - elapsed * 1;
  return Math.max(score, 0);
}

function startTimer() {
  timer = setInterval(() => {
    timeRemaining--;
    updateStats();
    if (timeRemaining <= 0) {
      clearInterval(timer);
      endGame(false);
    }
  }, 1000);
}

function checkCompletion() {
  if (pieces.every(p => p.currentPos === p.correctPos)) {
    clearInterval(timer);
    endGame(true);
  }
}

function endGame(won) {
  finished = true;
  const score = won ? calculateScore() : 0;

  document.getElementById('modalIcon').textContent = won ? '🎉' : '⏰';
  document.getElementById('modalTitle').textContent = won ? 'Puzzle Complete!' : 'Time\'s Up!';
  document.getElementById('finalScore').textContent = won ? score : '0';
  document.getElementById('finalStats').textContent = won
    ? `Moves: ${moves} · Time: ${TIME_LIMIT - timeRemaining}s`
    : `Out of time — moves made: ${moves}`;

  overlay.classList.add('show');
  if (won) saveBest(score);
}

function nextPuzzle() {
  puzzleIdx = (puzzleIdx + 1) % PUZZLES.length;
  loadPuzzle();
}

function saveBest(score) {
  const key = PUZZLES[puzzleIdx].id;
  const prev = bestScores[key] || 0;
  if (score > prev) bestScores[key] = score;
  showBest();
}

function showBest() {
  const key = PUZZLES[puzzleIdx].id;
  const prev = bestScores[key];
  bestEl.textContent = 'Best: ' + (prev ? prev : '--');
}

// Event Bindings
document.getElementById('restartBtn').onclick = loadPuzzle;
document.getElementById('shuffleBtn').onclick = () => {
  shufflePieces();
  renderBoard();
  moves = 0;
  draggedSlotIdx = null;
  updateStats();
};
document.getElementById('nextBtn').onclick = nextPuzzle;
document.getElementById('playAgainBtn').onclick = nextPuzzle;

loadPuzzle();