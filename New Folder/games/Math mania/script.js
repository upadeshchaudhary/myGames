(function () {
  "use strict";

  var GAME_SECONDS = 60;
  var STORAGE_KEY = "quickmath_best_score";

  var score = 0;
  var correctAnswers = 0;
  var wrongAnswers = 0;
  var currentAnswer = 0;
  var timeRemaining = GAME_SECONDS;
  var timer = null;
  var gameFinished = false;

  var panelStart = document.getElementById("panel-start");
  var panelGame = document.getElementById("panel-game");
  var panelResult = document.getElementById("panel-result");

  var btnStart = document.getElementById("btn-start");
  var btnAgain = document.getElementById("btn-again");
  var choicesEl = document.getElementById("choices");
  var choiceButtons = choicesEl.querySelectorAll(".choice-btn");

  var questionEl = document.getElementById("question");
  var feedbackEl = document.getElementById("feedback");
  var scoreEl = document.getElementById("score");
  var timeLeftEl = document.getElementById("time-left");
  var timebarEl = document.getElementById("timebar");
  var bestScoreEl = document.getElementById("best-score");

  var finalScoreEl = document.getElementById("final-score");
  var resultCorrectEl = document.getElementById("result-correct");
  var resultWrongEl = document.getElementById("result-wrong");
  var newBestMsgEl = document.getElementById("new-best-msg");

  function getBestScore() {
    var stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  function setBestScore(value) {
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randInt(0, i);
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function buildOptions(answer) {
    var options = [answer];
    var spread = Math.max(3, Math.round(Math.abs(answer) * 0.2) + 1);
    while (options.length < 4) {
      var offset = randInt(-spread, spread);
      var candidate = answer + offset;
      if (offset === 0 || candidate < 0) continue;
      if (options.indexOf(candidate) !== -1) continue;
      options.push(candidate);
    }
    return shuffle(options);
  }

  function generateQuestion() {
    var operations = ["+", "-", "×", "÷"];
    var op = operations[randInt(0, 3)];
    var a, b, text, answer;

    if (op === "+") {
      a = randInt(1, 50);
      b = randInt(1, 50);
      answer = a + b;
      text = a + " + " + b;
    } else if (op === "-") {
      a = randInt(1, 50);
      b = randInt(1, 50);
      if (b > a) { var tmp = a; a = b; b = tmp; }
      answer = a - b;
      text = a + " − " + b;
    } else if (op === "×") {
      a = randInt(1, 10);
      b = randInt(1, 10);
      answer = a * b;
      text = a + " × " + b;
    } else {
      answer = randInt(1, 10);
      b = randInt(2, 10);
      a = answer * b;
      text = a + " ÷ " + b;
    }

    currentAnswer = answer;
    questionEl.textContent = text + " = ?";
    renderChoices(buildOptions(answer));
  }

  function renderChoices(options) {
    for (var i = 0; i < choiceButtons.length; i++) {
      var btn = choiceButtons[i];
      btn.textContent = String(options[i]);
      btn.dataset.value = String(options[i]);
      btn.disabled = false;
      btn.className = "choice-btn";
    }
  }

  function updateStats() {
    scoreEl.textContent = String(score);
    timeLeftEl.textContent = String(timeRemaining);
  }

  function showFeedback(isCorrect) {
    feedbackEl.textContent = isCorrect ? "Correct!" : "Answer: " + currentAnswer;
    feedbackEl.className = "feedback " + (isCorrect ? "correct" : "wrong");
  }

  function checkAnswer(submitted, btn) {
    if (gameFinished) return;

    var isCorrect = submitted === currentAnswer;

    for (var i = 0; i < choiceButtons.length; i++) {
      choiceButtons[i].disabled = true;
    }

    if (isCorrect) {
      score += 1;
      correctAnswers += 1;
      btn.classList.add("correct");
    } else {
      wrongAnswers += 1;
      btn.classList.add("wrong");
      for (var j = 0; j < choiceButtons.length; j++) {
        if (parseInt(choiceButtons[j].dataset.value, 10) === currentAnswer) {
          choiceButtons[j].classList.add("reveal");
        }
      }
    }

    showFeedback(isCorrect);
    updateStats();

    window.setTimeout(function () {
      feedbackEl.textContent = "";
      feedbackEl.className = "feedback";
      generateQuestion();
    }, 500);
  }

  function startTimer() {
    timer = window.setInterval(function () {
      timeRemaining -= 1;
      updateStats();
      timebarEl.style.width = (timeRemaining / GAME_SECONDS * 100) + "%";
      if (timeRemaining <= 10) {
        timebarEl.style.background = "var(--red)";
      }
      if (timeRemaining <= 0) {
        endGame();
      }
    }, 1000);
  }

  function startGame() {
    score = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    timeRemaining = GAME_SECONDS;
    gameFinished = false;

    timebarEl.style.width = "100%";
    timebarEl.style.background = "var(--amber)";

    panelStart.classList.add("hidden");
    panelResult.classList.add("hidden");
    panelGame.classList.remove("hidden");

    updateStats();
    generateQuestion();

    startTimer();
  }

  function endGame() {
    gameFinished = true;
    window.clearInterval(timer);

    var best = getBestScore();
    var isNewBest = score > best;
    if (isNewBest) {
      setBestScore(score);
      best = score;
    }

    finalScoreEl.textContent = String(score);
    resultCorrectEl.textContent = String(correctAnswers);
    resultWrongEl.textContent = String(wrongAnswers);
    bestScoreEl.textContent = String(best);
    newBestMsgEl.classList.toggle("hidden", !isNewBest);

    panelGame.classList.add("hidden");
    panelResult.classList.remove("hidden");
  }

  btnStart.addEventListener("click", startGame);
  btnAgain.addEventListener("click", startGame);

  choicesEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".choice-btn");
    if (!btn || btn.disabled) return;
    checkAnswer(parseInt(btn.dataset.value, 10), btn);
  });

  bestScoreEl.textContent = String(getBestScore());
})();
