const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

const HUMAN = "X";
const AI = "O";

const boardEl = document.getElementById("board");
const cells = [...boardEl.querySelectorAll(".cell")];

const statusEl = document.getElementById("status");

const modalOverlay = document.getElementById("modalOverlay");
const modalText = document.getElementById("modalText");
const playAgainBtn = document.getElementById("playAgainBtn");

const resetBtn = document.getElementById("resetBtn");

const playerXEl = document.getElementById("playerX");
const playerOEl = document.getElementById("playerO");

const pills = [...document.querySelectorAll(".pill")];

let board = Array(9).fill(null);

let queues = {
  X: [],
  O: []
};

let current = HUMAN;

let gameOver = false;

let difficulty = "medium";

/* =========================
   RENDER
========================= */

function render() {
  cells.forEach((cell, idx) => {
    const mark = board[idx];

    cell.classList.remove(
      "x",
      "o",
      "winner"
    );

    if (mark) {
      cell.innerHTML = `
        <span class="mark">${mark}</span>
      `;

      cell.classList.add(
        mark.toLowerCase()
      );
    } else {
      cell.innerHTML = "";
    }

    cell.disabled =
      !!mark ||
      gameOver ||
      current === AI;
  });

  playerXEl.classList.toggle(
    "active",
    current === HUMAN
  );

  playerOEl.classList.toggle(
    "active",
    current === AI
  );

  if (!gameOver) {
    statusEl.textContent =
      current === HUMAN
        ? "Your turn"
        : "Computer thinking...";
  }
}

/* =========================
   WIN CHECK
========================= */

function checkWin(player) {
  for (const line of WIN_LINES) {
    if (
      line.every(
        index => board[index] === player
      )
    ) {
      return line;
    }
  }

  return null;
}

/* =========================
   MOVE SYSTEM
========================= */

function applyMove(idx, player) {
  const queue = queues[player];

  /*
    Unlimited Tic-Tac-Toe rule:
    Each player can have a maximum
    of three marks on the board.
  */

  if (queue.length === 3) {
    const removed = queue.shift();

    board[removed] = null;
  }

  board[idx] = player;

  queue.push(idx);
}

function playAt(idx, player) {
  applyMove(idx, player);

  render();

  const cellEl = cells[idx];

  cellEl.classList.add("pop");

  cellEl.addEventListener(
    "animationend",
    () => {
      cellEl.classList.remove("pop");
    },
    {
      once: true
    }
  );

  const winLine = checkWin(player);

  if (winLine) {
    gameOver = true;

    winLine.forEach(index => {
      cells[index].classList.add("winner");
    });

    showBanner(
      player === HUMAN
        ? "You win! 🎉"
        : "Computer wins",
      player !== HUMAN
    );

    render();

    return;
  }

  current =
    current === HUMAN
      ? AI
      : HUMAN;

  render();

  if (
    !gameOver &&
    current === AI
  ) {
    setTimeout(
      computerMove,
      450
    );
  }
}

/* =========================
   HUMAN MOVE
========================= */

function handleClick(event) {
  if (
    gameOver ||
    current !== HUMAN
  ) {
    return;
  }

  const idx = Number(
    event.currentTarget.dataset.idx
  );

  if (board[idx]) {
    return;
  }

  playAt(idx, HUMAN);
}

/* =========================
   COMPUTER AI
========================= */

function emptyCells() {
  const result = [];

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      result.push(i);
    }
  }

  return result;
}

function simulateBoard(
  sourceBoard,
  sourceQueues,
  idx,
  player
) {
  const simulatedBoard =
    sourceBoard.slice();

  const queue =
    sourceQueues[player].slice();

  if (queue.length === 3) {
    const removed = queue.shift();

    simulatedBoard[removed] = null;
  }

  simulatedBoard[idx] = player;

  return simulatedBoard;
}

function boardHasWin(
  simulatedBoard,
  player
) {
  return WIN_LINES.some(line =>
    line.every(
      index =>
        simulatedBoard[index] === player
    )
  );
}

function findWinningMove(player) {
  for (const idx of emptyCells()) {
    const simulated =
      simulateBoard(
        board,
        queues,
        idx,
        player
      );

    if (
      boardHasWin(
        simulated,
        player
      )
    ) {
      return idx;
    }
  }

  return null;
}

/* =========================
   MOVE SCORING
========================= */

function scoreMove(idx) {
  /*
    Center is strongest,
    corners are next,
    edges are weakest.
  */

  if (idx === 4) {
    return 3;
  }

  if (
    [0, 2, 6, 8].includes(idx)
  ) {
    return 2;
  }

  return 1;
}

function randomMove() {
  const options = emptyCells();

  if (!options.length) {
    return null;
  }

  return options[
    Math.floor(
      Math.random() *
      options.length
    )
  ];
}

/* =========================
   SAFE MOVES
========================= */

function safeMoves() {
  return emptyCells().filter(idx => {
    const simulatedBoard =
      simulateBoard(
        board,
        queues,
        idx,
        AI
      );

    const nextQueues = {
      X: queues.X.slice(),
      O: queues.O.slice()
    };

    if (
      nextQueues.O.length === 3
    ) {
      nextQueues.O.shift();
    }

    nextQueues.O.push(idx);

    /*
      Check whether this move
      allows the human to win
      immediately.
    */

    for (let h = 0; h < 9; h++) {
      if (simulatedBoard[h]) {
        continue;
      }

      const afterHuman =
        simulateBoard(
          simulatedBoard,
          nextQueues,
          h,
          HUMAN
        );

      if (
        boardHasWin(
          afterHuman,
          HUMAN
        )
      ) {
        return false;
      }
    }

    return true;
  });
}

/* =========================
   STRATEGIC MOVE
========================= */

function bestStrategicMove(pool) {
  const list =
    pool.length
      ? pool
      : emptyCells();

  if (!list.length) {
    return null;
  }

  let best = list[0];

  let bestScore = -Infinity;

  for (const idx of list) {
    const score =
      scoreMove(idx);

    if (score > bestScore) {
      bestScore = score;
      best = idx;
    }
  }

  return best;
}

/* =========================
   COMPUTER MOVE
========================= */

function computerMove() {
  if (gameOver) {
    return;
  }

  let idx = null;

  /* EASY */

  if (difficulty === "easy") {
    idx = randomMove();
  }

  /* MEDIUM */

  else if (
    difficulty === "medium"
  ) {
    idx =
      findWinningMove(AI);

    if (idx === null) {
      idx =
        findWinningMove(HUMAN);
    }

    if (
      idx === null &&
      Math.random() < 0.5
    ) {
      idx = randomMove();
    }

    if (idx === null) {
      idx =
        bestStrategicMove(
          emptyCells()
        );
    }
  }

  /* HARD */

  else {
    idx =
      findWinningMove(AI);

    if (idx === null) {
      idx =
        findWinningMove(HUMAN);
    }

    if (idx === null) {
      const safe =
        safeMoves();

      idx =
        bestStrategicMove(
          safe
        );
    }
  }

  if (idx !== null) {
    playAt(idx, AI);
  }
}

/* =========================
   RESULT MODAL
========================= */

function showBanner(
  text,
  lose
) {
  modalText.textContent = text;

  modalText.classList.toggle(
    "lose",
    !!lose
  );

  modalOverlay.classList.remove(
    "hidden"
  );
}

function hideBanner() {
  modalOverlay.classList.add(
    "hidden"
  );

  modalText.textContent = "";
}

/* =========================
   RESET GAME
========================= */

function reset() {
  board =
    Array(9).fill(null);

  queues = {
    X: [],
    O: []
  };

  current = HUMAN;

  gameOver = false;

  hideBanner();

  render();
}

/* =========================
   EVENTS
========================= */

cells.forEach(cell => {
  cell.addEventListener(
    "click",
    handleClick
  );
});

resetBtn.addEventListener(
  "click",
  reset
);

playAgainBtn.addEventListener(
  "click",
  reset
);

pills.forEach(pill => {
  pill.addEventListener(
    "click",
    () => {
      difficulty =
        pill.dataset.diff;

      pills.forEach(p => {
        p.classList.toggle(
          "active",
          p === pill
        );
      });

      reset();
    }
  );
});

/* =========================
   START GAME
========================= */

render();