(function(){
  const SYMBOLS = ["🇳🇵", "🏔️", "🏏", "🛕", "🚌", "🌾", "🎬", "📰"];
  const TOTAL_TIME = 60;
  const START_SCORE = 1000;
  const MATCH_BONUS = 100;
  const MISMATCH_PENALTY = 20;
  const TICK_PENALTY_INTERVAL = 5;
  const TICK_PENALTY = 10;
  const STORAGE_KEY = "memoryFlipBest";

  const boardEl = document.getElementById("board");
  const timeEl = document.getElementById("stat-time");
  const pairsEl = document.getElementById("stat-pairs");
  const movesEl = document.getElementById("stat-moves");
  const scoreEl = document.getElementById("stat-score");
  const bestEl = document.getElementById("stat-best");
  const restartBtn = document.getElementById("restart-btn");
  const modalRestartBtn = document.getElementById("modal-restart-btn");
  const overlay = document.getElementById("modal-overlay");
  const modalHeadline = document.getElementById("modal-headline");
  const modalKicker = document.getElementById("modal-kicker");
  const modalScore = document.getElementById("modal-score");
  const modalMoves = document.getElementById("modal-moves");
  const modalTime = document.getElementById("modal-time");
  const modalBest = document.getElementById("modal-best");
  const modalNewBest = document.getElementById("modal-newbest");

  let cards = [];
  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let matchedPairs = 0;
  let moves = 0;
  let timeRemaining = TOTAL_TIME;
  let timer = null;
  let score = START_SCORE;
  let gameStarted = false;
  let gameFinished = false;
  let bestScore = loadBestScore();

  function loadBestScore(){
    try{
      return parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
    }catch(e){
      return 0;
    }
  }

  function saveBestScore(finalScore){
    if(finalScore > bestScore){
      bestScore = finalScore;
      try{ localStorage.setItem(STORAGE_KEY, bestScore); }catch(e){}
      return true;
    }
    return false;
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function createCards(){
    const doubled = SYMBOLS.concat(SYMBOLS);
    const shuffled = shuffle(doubled);
    return shuffled.map((value, i) => ({
      id: i,
      value: value,
      matched: false,
      flipped: false
    }));
  }

  function renderBoard(){
    boardEl.innerHTML = "";
    cards.forEach(card => {
      const cardEl = document.createElement("div");
      cardEl.className = "card";
      cardEl.dataset.id = card.id;
      cardEl.setAttribute("tabindex", "0");
      cardEl.setAttribute("role", "button");
      cardEl.setAttribute("aria-label", "Hidden headline");

      cardEl.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front">?</div>
          <div class="card-face card-back">${card.value}</div>
        </div>
      `;

      cardEl.addEventListener("click", () => onCardClick(card.id, cardEl));
      cardEl.addEventListener("keydown", (e) => {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          onCardClick(card.id, cardEl);
        }
      });

      boardEl.appendChild(cardEl);
    });
  }

  function onCardClick(id, cardEl){
    if(gameFinished || lockBoard) return;
    const card = cards.find(c => c.id === id);
    if(!card || card.flipped || card.matched) return;

    if(!gameStarted) startTimer();

    flipCard(card, cardEl);

    if(!firstCard){
      firstCard = { card, el: cardEl };
      return;
    }

    secondCard = { card, el: cardEl };
    lockBoard = true;
    moves++;
    updateStats();

    checkMatch();
  }

  function flipCard(card, cardEl){
    card.flipped = true;
    cardEl.classList.add("flipped");
  }

  function checkMatch(){
    const isMatch = firstCard.card.value === secondCard.card.value;
    if(isMatch){
      handleMatch();
    }else{
      handleMismatch();
    }
  }

  function handleMatch(){
    firstCard.card.matched = true;
    secondCard.card.matched = true;
    firstCard.el.classList.add("matched");
    secondCard.el.classList.add("matched");
    matchedPairs++;
    score += MATCH_BONUS;
    updateStats();
    resetTurn();

    if(matchedPairs === SYMBOLS.length){
      endGame(true);
    }
  }

  function handleMismatch(){
    score = Math.max(0, score - MISMATCH_PENALTY);
    updateStats();
    setTimeout(() => {
      firstCard.card.flipped = false;
      secondCard.card.flipped = false;
      firstCard.el.classList.remove("flipped");
      secondCard.el.classList.remove("flipped");
      resetTurn();
    }, 700);
  }

  function resetTurn(){
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }

  function startTimer(){
    gameStarted = true;
    timer = setInterval(updateTimer, 1000);
  }

  function updateTimer(){
    timeRemaining--;
    if(timeRemaining > 0 && timeRemaining % TICK_PENALTY_INTERVAL === 0){
      score = Math.max(0, score - TICK_PENALTY);
    }
    updateStats();
    if(timeRemaining <= 0){
      endGame(false);
    }
  }

  function updateStats(){
    timeEl.textContent = Math.max(0, timeRemaining);
    timeEl.classList.toggle("time-low", timeRemaining <= 10);
    pairsEl.textContent = `${matchedPairs}/${SYMBOLS.length}`;
    movesEl.textContent = moves;
    scoreEl.textContent = score;
    bestEl.textContent = bestScore;
  }

  function endGame(won){
    if(gameFinished) return;
    gameFinished = true;
    clearInterval(timer);

    const timeUsed = TOTAL_TIME - Math.max(0, timeRemaining);
    const isNewBest = saveBestScore(score);

    modalKicker.textContent = won ? "FINAL EDITION" : "TIME'S UP";
    modalHeadline.textContent = won ? "All Stories Matched" : "Edition Closed";
    modalScore.textContent = score;
    modalMoves.textContent = moves;
    modalTime.textContent = `${timeUsed}s`;
    modalBest.textContent = bestScore;
    modalNewBest.style.display = isNewBest ? "inline-block" : "none";

    updateStats();
    overlay.classList.add("show");
  }

  function initializeGame(){
    clearInterval(timer);
    cards = createCards();
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    matchedPairs = 0;
    moves = 0;
    timeRemaining = TOTAL_TIME;
    score = START_SCORE;
    gameStarted = false;
    gameFinished = false;
    overlay.classList.remove("show");
    renderBoard();
    updateStats();
  }

  restartBtn.addEventListener("click", initializeGame);
  modalRestartBtn.addEventListener("click", initializeGame);

  initializeGame();
})();
