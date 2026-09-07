// ---- Config ----
const GRID = 4;
const TOTAL = GRID * GRID;
const TIME_LIMIT = 180;

// Swap these picsum placeholders for real photos, e.g. images/everest.jpg
const PUZZLES = [
  { id: 1, title: "Mount Everest",           img: "https://picsum.photos/seed/everest/800/800" },
  { id: 2, title: "Kathmandu Durbar Square", img: "https://picsum.photos/seed/kathmandu/800/800" },
  { id: 3, title: "Pokhara & Phewa Lake",    img: "https://picsum.photos/seed/pokhara/800/800" },
  { id: 4, title: "Pashupatinath",           img: "https://picsum.photos/seed/pashupatinath/800/800" },
  { id: 5, title: "Mustang Valley",          img: "https://picsum.photos/seed/mustang/800/800" },
];

// ---- State ----
let pieces = [];        // {id, correctPos, currentPos}
let selectedIdx = null;
let moves = 0;
let timeRemaining = TIME_LIMIT;
let timer = null;
let currentPuzzle = PUZZLES[0];
let finished = false;
const bestScores = {};  // in-memory, resets on reload

const boardEl = document.getElementById('board');
const pickerEl = document.getElementById('picker');
const timeEl = document.getElementById('timeVal');
const moveEl = document.getElementById('moveVal');
const scoreEl = document.getElementById('scoreVal');
const titleEl = document.getElementById('puzzleTitle');
const bestEl = document.getElementById('bestVal');
const overlay = document.getElementById('overlay');

function bestKey(id){ return id; }

function buildPicker(){
  pickerEl.innerHTML = '';
  PUZZLES.forEach(p=>{
    const d = document.createElement('div');
    d.className = 'thumb' + (p.id===currentPuzzle.id ? ' active':'');
    d.style.backgroundImage = `url(${p.img})`;
    d.title = p.title;
    d.onclick = ()=>{ currentPuzzle = p; loadPuzzle(); };
    pickerEl.appendChild(d);
  });
}

function loadPuzzle(){
  clearInterval(timer);
  finished = false;
  moves = 0;
  timeRemaining = TIME_LIMIT;
  selectedIdx = null;
  overlay.classList.remove('show');
  titleEl.textContent = currentPuzzle.title;
  buildPicker();
  createPieces();
  shufflePieces();
  renderBoard();
  updateStats();
  startTimer();
  showBest();
}

function createPieces(){
  pieces = [];
  for(let i=0;i<TOTAL;i++){
    pieces.push({ id:i, correctPos:i, currentPos:i });
  }
}

function shufflePieces(){
  // Fisher-Yates on currentPos, avoid solved state
  let positions = pieces.map(p=>p.currentPos);
  do{
    for(let i=positions.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [positions[i],positions[j]] = [positions[j],positions[i]];
    }
  } while(positions.every((pos,i)=>pos===i));
  pieces.forEach((p,i)=>p.currentPos = positions[i]);
}

function renderBoard(){
  boardEl.innerHTML = '';
  const ordered = [...pieces].sort((a,b)=>a.currentPos-b.currentPos);
  ordered.forEach((piece, slotIdx)=>{
    const el = document.createElement('div');
    el.className = 'piece';
    const row = Math.floor(piece.id/GRID);
    const col = piece.id % GRID;
    el.style.backgroundImage = `url(${currentPuzzle.img})`;
    el.style.backgroundSize = `${GRID*100}% ${GRID*100}%`;
    el.style.backgroundPosition = `${(col/(GRID-1))*100}% ${(row/(GRID-1))*100}%`;
    if(piece.currentPos === piece.correctPos) el.classList.add('correct');
    if(selectedIdx === slotIdx) el.classList.add('selected');
    el.onclick = ()=>selectPiece(slotIdx);
    boardEl.appendChild(el);
  });
}

function selectPiece(slotIdx){
  if(finished) return;
  if(selectedIdx === null){
    selectedIdx = slotIdx;
  } else if(selectedIdx === slotIdx){
    selectedIdx = null;
  } else {
    swapPieces(selectedIdx, slotIdx);
    selectedIdx = null;
    updateMoves();
  }
  renderBoard();
  checkCompletion();
}

function swapPieces(slotA, slotB){
  const ordered = [...pieces].sort((a,b)=>a.currentPos-b.currentPos);
  const pa = ordered[slotA], pb = ordered[slotB];
  const tmp = pa.currentPos;
  pa.currentPos = pb.currentPos;
  pb.currentPos = tmp;
}

function updateMoves(){
  moves++;
  updateStats();
}

function updateStats(){
  const mm = String(Math.floor(timeRemaining/60)).padStart(2,'0');
  const ss = String(timeRemaining%60).padStart(2,'0');
  timeEl.textContent = `${mm}:${ss}`;
  moveEl.textContent = moves;
  scoreEl.textContent = calculateScore();
}

function calculateScore(){
  const elapsed = TIME_LIMIT - timeRemaining;
  let score = 1000 - moves*5 - elapsed*1;
  return Math.max(score, 0);
}

function startTimer(){
  timer = setInterval(()=>{
    timeRemaining--;
    updateStats();
    if(timeRemaining<=0){
      clearInterval(timer);
      endGame(false);
    }
  },1000);
}

function checkCompletion(){
  if(pieces.every(p=>p.currentPos===p.correctPos)){
    clearInterval(timer);
    endGame(true);
  }
}

function endGame(won){
  finished = true;
  const score = won ? calculateScore() : 0;
  document.getElementById('finalScore').textContent = won ? score : '⏰';
  document.getElementById('finalStats').textContent = won
    ? `Moves: ${moves} · Time: ${TIME_LIMIT-timeRemaining}s`
    : `Out of time — moves made: ${moves}`;
  document.getElementById('finalScore').parentElement.querySelector('h2').textContent =
    won ? '🎉 Puzzle Complete!' : '⏰ Time\'s Up!';
  overlay.classList.add('show');
  if(won) saveBest(score);
}

function saveBest(score){
  const key = bestKey(currentPuzzle.id);
  const prev = bestScores[key] || 0;
  if(score > prev) bestScores[key] = score;
  showBest();
}

function showBest(){
  const key = bestKey(currentPuzzle.id);
  const prev = bestScores[key];
  bestEl.textContent = 'Best: ' + (prev ? prev : '--');
}

document.getElementById('restartBtn').onclick = loadPuzzle;
document.getElementById('shuffleBtn').onclick = ()=>{
  shufflePieces(); renderBoard(); moves=0; selectedIdx=null; updateStats();
};
document.getElementById('playAgainBtn').onclick = loadPuzzle;

loadPuzzle();
