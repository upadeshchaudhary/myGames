let solution = [];
let puzzle = [];
let given = [];
let notes = [];
let selected = null;
let notesMode = false;
let mistakes = 0;
const MAX_MISTAKES = 3;
let history = [];
let timerId = null;
let seconds = 0;
let removeCount = 40;

let score = 0;
let hintsUsed = 0;
let maxHints = 3;
let pendingPenalty = 0;
let startPuzzle = [];
let paused = false;

const POINTS_CORRECT = 10;
const POINTS_HINT = -35;
const HINTS_BY_DIFFICULTY = { 30: 5, 40: 3, 50: 2, 58: 1 };
const PENALTY_PERCENT_BY_DIFFICULTY = { 30: 0.10, 40: 0.20, 50: 0.30, 58: 0.30 };
const TIME_PENALTY_INTERVAL = 10; // seconds
const TIME_PENALTY_AMOUNT = 1;

const boardEl = document.getElementById('board');
const msgEl = document.getElementById('message');
const timerEl = document.getElementById('timer');
const mistakesEl = document.getElementById('mistakes');
const scoreEl = document.getElementById('score');
const hintCountEl = document.getElementById('hintCount');
const hintBtn = document.getElementById('hintBtn');
const numpadEl = document.getElementById('numpad');
const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlayTitle');
const overlayMsgEl = document.getElementById('overlayMsg');
const pauseBtn = document.getElementById('pauseBtn');
const pausedOverlayEl = document.getElementById('pausedOverlay');

function emptyGrid() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const br = row - (row % 3), bc = col - (col % 3);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[br + r][bc + c] === num) return false;
    }
  }
  return true;
}

function fillGrid(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        for (const num of shuffled([1,2,3,4,5,6,7,8,9])) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generatePuzzle(count) {
  const grid = emptyGrid();
  fillGrid(grid);
  solution = grid.map(r => r.slice());
  puzzle = grid.map(r => r.slice());

  const cells = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;
  for (const idx of cells) {
    if (removed >= count) break;
    const row = Math.floor(idx / 9), col = idx % 9;
    puzzle[row][col] = 0;
    removed++;
  }
  given = puzzle.map(r => r.map(v => v !== 0));
  notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
}

function buildNumpad() {
  numpadEl.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => applyNumber(n));
    numpadEl.appendChild(btn);
  }
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;

      const val = puzzle[row][col];
      if (given[row][col]) {
        cell.classList.add('given');
        cell.textContent = val;
      } else if (val) {
        cell.classList.add(val === solution[row][col] ? 'user-val' : 'wrong-val');
        cell.textContent = val;
      } else if (notes[row][col].size) {
        const noteGrid = document.createElement('div');
        noteGrid.className = 'notes';
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement('span');
          span.textContent = notes[row][col].has(n) ? n : '';
          noteGrid.appendChild(span);
        }
        cell.appendChild(noteGrid);
      }

      cell.addEventListener('click', () => selectCell(row, col));
      boardEl.appendChild(cell);
    }
  }
  applyHighlights();
}

function applyHighlights() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(c => c.classList.remove('peer', 'same-num', 'selected'));
  if (!selected) return;
  const { row, col } = selected;
  const val = puzzle[row][col];

  cells.forEach(c => {
    const r = +c.dataset.row, cl = +c.dataset.col;
    const sameRow = r === row, sameCol = cl === col;
    const sameBox = Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(cl / 3) === Math.floor(col / 3);
    if (sameRow || sameCol || sameBox) c.classList.add('peer');
    if (val && puzzle[r][cl] === val) c.classList.add('same-num');
    if (r === row && cl === col) c.classList.add('selected');
  });
}

function selectCell(row, col) {
  if (paused) return;
  selected = { row, col };
  applyHighlights();
}

function pushHistory() {
  history.push({
    puzzle: puzzle.map(r => r.slice()),
    notes: notes.map(r => r.map(s => new Set(s))),
    mistakes,
    score,
    hintsUsed,
    pendingPenalty
  });
  if (history.length > 50) history.shift();
}

function addScore(amount) {
  score = Math.max(0, score + amount);
  scoreEl.textContent = score;
}

function applyNumber(n) {
  if (paused) return;
  if (!selected) return;
  const { row, col } = selected;
  if (given[row][col]) return;
  if (puzzle[row][col] === n) return; // no-op, blocks repeat-spam exploit

  const wasCorrect = puzzle[row][col] === solution[row][col];
  pushHistory();

  if (notesMode) {
    if (notes[row][col].has(n)) notes[row][col].delete(n);
    else notes[row][col].add(n);
  } else {
    puzzle[row][col] = n;
    notes[row][col].clear();
    if (n !== solution[row][col]) {
      mistakes++;
      pendingPenalty++;
      mistakesEl.textContent = `${mistakes}/${MAX_MISTAKES}`;
      if (mistakes >= MAX_MISTAKES) {
        endGame(false);
      }
    } else if (!wasCorrect) {
      const percent = PENALTY_PERCENT_BY_DIFFICULTY[removeCount] || 0;
      const reduction = Math.min(0.9, pendingPenalty * percent);
      addScore(Math.round(POINTS_CORRECT * (1 - reduction)));
      pendingPenalty = 0;
    }
  }
  renderBoard();
  applyHighlights();
  checkWin();
}

function eraseCell() {
  if (paused) return;
  if (!selected) return;
  const { row, col } = selected;
  if (given[row][col]) return;
  pushHistory();
  puzzle[row][col] = 0;
  notes[row][col].clear();
  renderBoard();
}

function undo() {
  if (paused) return;
  const prev = history.pop();
  if (!prev) return;
  puzzle = prev.puzzle;
  notes = prev.notes;
  mistakes = prev.mistakes;
  score = prev.score;
  hintsUsed = prev.hintsUsed;
  pendingPenalty = prev.pendingPenalty;
  mistakesEl.textContent = `${mistakes}/${MAX_MISTAKES}`;
  scoreEl.textContent = score;
  updateHintUI();
  renderBoard();
}

function updateHintUI() {
  const remaining = maxHints - hintsUsed;
  hintCountEl.textContent = `(${remaining})`;
  hintBtn.disabled = remaining <= 0;
}

function hint() {
  if (paused) return;
  if (!selected) return;
  if (hintsUsed >= maxHints) return;
  const { row, col } = selected;
  if (given[row][col]) return;
  if (puzzle[row][col] === solution[row][col]) return;
  pushHistory();
  puzzle[row][col] = solution[row][col];
  notes[row][col].clear();
  hintsUsed++;
  addScore(POINTS_HINT);
  updateHintUI();
  renderBoard();
  checkWin();
}

function checkWin() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzle[r][c] !== solution[r][c]) return;
    }
  }
  endGame(true);
}

function endGame(won) {
  clearInterval(timerId);
  if (won) {
    const unusedMistakes = MAX_MISTAKES - mistakes;
    const unusedHints = maxHints - hintsUsed;
    addScore(unusedMistakes * 50 + unusedHints * 30);
    msgEl.textContent = `Solved! Score: ${score}`;
    msgEl.className = 'message win';
    overlayTitleEl.textContent = 'You Win!';
    overlayMsgEl.textContent = `Final score: ${score}`;
  } else {
    msgEl.textContent = 'Too many mistakes.';
    msgEl.className = 'message bad';
    overlayTitleEl.textContent = 'Game Over';
    overlayMsgEl.textContent = `3 mistakes reached. Score: ${score}`;
  }
  overlayEl.classList.add('show');
}

function tickTimer() {
  timerId = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
    if (seconds % TIME_PENALTY_INTERVAL === 0) {
      addScore(-TIME_PENALTY_AMOUNT);
    }
  }, 1000);
}

function startTimer() {
  clearInterval(timerId);
  seconds = 0;
  timerEl.textContent = '00:00';
  tickTimer();
}

function pauseGame() {
  if (paused) return;
  paused = true;
  clearInterval(timerId);
  boardEl.classList.add('blurred');
  pausedOverlayEl.classList.add('show');
  pauseBtn.textContent = '▶';
  pauseBtn.title = 'Resume';
  pauseBtn.classList.add('active');
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  boardEl.classList.remove('blurred');
  pausedOverlayEl.classList.remove('show');
  pauseBtn.textContent = '⏸';
  pauseBtn.title = 'Pause';
  pauseBtn.classList.remove('active');
  tickTimer();
}

function resetState() {
  history = [];
  mistakes = 0;
  mistakesEl.textContent = `0/${MAX_MISTAKES}`;
  maxHints = HINTS_BY_DIFFICULTY[removeCount] || 3;
  hintsUsed = 0;
  pendingPenalty = 0;
  updateHintUI();
  score = 0;
  scoreEl.textContent = score;
  selected = null;
  msgEl.textContent = '';
  msgEl.className = 'message';
  overlayEl.classList.remove('show');
  paused = false;
  boardEl.classList.remove('blurred');
  pausedOverlayEl.classList.remove('show');
  pauseBtn.textContent = '⏸';
  pauseBtn.title = 'Pause';
  pauseBtn.classList.remove('active');
}

function newGame() {
  generatePuzzle(removeCount);
  startPuzzle = puzzle.map(r => r.slice());
  resetState();
  renderBoard();
  startTimer();
}

function retryGame() {
  puzzle = startPuzzle.map(r => r.slice());
  notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  resetState();
  renderBoard();
  startTimer();
}

document.getElementById('difficultySelect').addEventListener('change', (e) => {
  removeCount = +e.target.value;
  newGame();
});

document.getElementById('retryBtn').addEventListener('click', retryGame);
document.getElementById('playAgainBtn').addEventListener('click', newGame);

pauseBtn.addEventListener('click', () => {
  if (paused) resumeGame();
  else pauseGame();
});
document.getElementById('resumeBtn').addEventListener('click', resumeGame);

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('eraseBtn').addEventListener('click', eraseCell);
document.getElementById('hintBtn').addEventListener('click', hint);
document.getElementById('newGame').addEventListener('click', newGame);

const notesBtn = document.getElementById('notesBtn');
notesBtn.addEventListener('click', () => {
  notesMode = !notesMode;
  notesBtn.classList.toggle('active', notesMode);
});

document.addEventListener('keydown', (e) => {
  if (paused) return;
  if (e.key >= '1' && e.key <= '9') applyNumber(+e.key);
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') eraseCell();
  else if (selected) {
    const { row, col } = selected;
    if (e.key === 'ArrowUp' && row > 0) selectCell(row - 1, col);
    else if (e.key === 'ArrowDown' && row < 8) selectCell(row + 1, col);
    else if (e.key === 'ArrowLeft' && col > 0) selectCell(row, col - 1);
    else if (e.key === 'ArrowRight' && col < 8) selectCell(row, col + 1);
  }
});

buildNumpad();
newGame();