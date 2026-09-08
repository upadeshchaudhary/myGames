(function () {
  "use strict";

  var GAME_SECONDS = 60;
  var STORAGE_KEY = "quickmath_best_score";

  var score = 0;
  var correctAnswers = 0;
  var wrongAnswers = 0;
  var combo = 0;
  var bestCombo = 0;
  var currentAnswer = 0;
  var questionShownAt = 0;
  var questionAnswered = false;
  var inputBlockedUntil = 0;
  var previousQuestions = [];
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
  var difficultyEl = document.getElementById("difficulty");
  var comboEl = document.getElementById("combo");
  var mistakesEl = document.getElementById("mistakes");
  var timebarEl = document.getElementById("timebar");
  var bestScoreEl = document.getElementById("best-score");

  var finalScoreEl = document.getElementById("final-score");
  var resultCorrectEl = document.getElementById("result-correct");
  var resultWrongEl = document.getElementById("result-wrong");
  var resultComboEl = document.getElementById("result-combo");
  var resultAccuracyEl = document.getElementById("result-accuracy");
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
    var offsets = [-1, 1, -2, 2, -3, 3, -5, 5];
    var offsetIndex = randInt(0, offsets.length - 1);
    while (options.length < 4) {
      var offset = offsets[offsetIndex % offsets.length];
      offsetIndex += 1;
      var candidate = answer + offset;
      if (offset === 0 || candidate < 0) continue;
      if (options.indexOf(candidate) !== -1) continue;
      options.push(candidate);
    }
    return shuffle(options);
  }

  function getDifficulty() {
    var elapsed = GAME_SECONDS - timeRemaining;

    if (elapsed < 15) return "Easy";
    if (elapsed < 30) return correctAnswers >= 4 ? "Medium" : "Easy";
    if (elapsed < 45) return correctAnswers >= 9 ? "Hard" : "Medium";
    if (elapsed < 60) return correctAnswers >= 12 ? "Hard" : "Medium";
    return "Hard";
  }

  function getDifficultyLevel() {
    var elapsed = GAME_SECONDS - timeRemaining;
    if (elapsed < 15) return 1;
    if (elapsed < 30) return correctAnswers >= 4 ? 3 : 2;
    if (elapsed < 45) return correctAnswers >= 9 ? 5 : 4;
    return correctAnswers >= 12 ? 5 : 4;
  }

  function getNumber(min, max) {
    return randInt(min, max);
  }

  function makeQuestion(mode) {
    var a, b, c, answer;
    if (mode === "Easy") {
      var easyOperation = randInt(0, 3);
      if (easyOperation === 0) {
        a = getNumber(2, 50); b = getNumber(2, 50); return { text: a + " + " + b, answer: a + b };
      }
      if (easyOperation === 1) {
        a = getNumber(2, 50); b = getNumber(2, a); return { text: a + " − " + b, answer: a - b };
      }
      if (easyOperation === 2) {
        a = getNumber(2, 12); b = getNumber(2, 12); return { text: a + " × " + b, answer: a * b };
      }
      b = getNumber(2, 12); c = getNumber(2, 12); return { text: (b * c) + " ÷ " + b, answer: c };
    }

    if (mode === "Medium") {
      if (getDifficultyLevel() === 2) {
        var mediumBasicOperation = randInt(0, 3);
        if (mediumBasicOperation === 0) {
          a = getNumber(5, 100); b = getNumber(5, 100); return { text: a + " + " + b, answer: a + b };
        }
        if (mediumBasicOperation === 1) {
          a = getNumber(5, 100); b = getNumber(5, a); return { text: a + " − " + b, answer: a - b };
        }
        if (mediumBasicOperation === 2) {
          a = getNumber(5, 15); b = getNumber(5, 15); return { text: a + " × " + b, answer: a * b };
        }
        b = getNumber(2, 10); c = getNumber(2, 12); return { text: (b * c) + " ÷ " + b, answer: c };
      }
      var mediumPattern = randInt(0, 3);
      if (mediumPattern === 0) {
        a = getNumber(5, 50); b = getNumber(5, 15); c = getNumber(2, 5); return { text: a + " + " + b + " × " + c, answer: a + b * c };
      }
      if (mediumPattern === 1) {
        b = getNumber(2, 10); c = getNumber(2, 12); a = b * c; var addend = getNumber(5, 30); return { text: a + " ÷ " + b + " + " + addend, answer: c + addend };
      }
      if (mediumPattern === 2) {
        a = getNumber(20, 100); b = getNumber(5, 50); c = getNumber(5, 30); if (b > a) { var swap = a; a = b; b = swap; } return { text: a + " − " + b + " + " + c, answer: a - b + c };
      }
      a = getNumber(5, 15); b = getNumber(5, 15); c = getNumber(5, a * b); return { text: a + " × " + b + " − " + c, answer: a * b - c };
    }

    var hardPattern = getDifficultyLevel() === 4 ? randInt(1, 2) : randInt(0, 4);
    if (hardPattern === 0) {
      a = getNumber(10, 30); b = getNumber(5, 20); c = getNumber(2, 5); return { text: "(" + a + " + " + b + ") × " + c, answer: (a + b) * c };
    }
    if (hardPattern === 1) {
      b = getNumber(2, 10); c = getNumber(5, 30); a = b * getNumber(2, 12); return { text: a + " ÷ " + b + " + " + c, answer: a / b + c };
    }
    if (hardPattern === 2) {
      a = getNumber(30, 100); b = getNumber(2, 12); c = getNumber(2, 5); if (b * c > a) b = 2; return { text: a + " − " + b + " × " + c, answer: a - b * c };
    }
    if (hardPattern === 3) {
      c = getNumber(2, 8); b = getNumber(2, 10); a = b * c + getNumber(0, 20); return { text: "(" + a + " − " + (a - b * c) + ") ÷ " + c, answer: b };
    }
    a = getNumber(3, 12); b = getNumber(2, a * a - 1); return { text: a + "² − " + b, answer: a * a - b };
  }

  function generateQuestion() {
    var mode = getDifficulty();
    var question;
    var attempts = 0;
    do {
      question = makeQuestion(mode);
      attempts += 1;
    } while ((question.answer < 0 || !Number.isInteger(question.answer) || question.answer > 1000 || previousQuestions.indexOf(question.text) !== -1) && attempts < 50);

    previousQuestions.push(question.text);
    if (previousQuestions.length > 20) previousQuestions.shift();
    currentAnswer = question.answer;
    questionAnswered = false;
    difficultyEl.textContent = mode;
    questionEl.textContent = question.text + " = ?";
    renderChoices(buildOptions(question.answer));
    questionShownAt = performance.now();
  }

  function getComboBonus() {
    if (combo === 10) return 5;
    if (combo === 5) return 3;
    if (combo === 3) return 2;
    return 0;
  }

  function getAccuracy() {
    var answered = correctAnswers + wrongAnswers;
    return answered ? Math.round(correctAnswers / answered * 100) : 0;
  }

  function disableChoices() {
    for (var i = 0; i < choiceButtons.length; i++) {
      choiceButtons[i].disabled = true;
    }
  }

  function renderChoices(options) {
    var wait = Math.max(0, inputBlockedUntil - performance.now());
    for (var i = 0; i < choiceButtons.length; i++) {
      var btn = choiceButtons[i];
      btn.textContent = String(options[i]);
      btn.dataset.value = String(options[i]);
      btn.disabled = wait > 0;
      btn.className = "choice-btn";
    }
    if (wait > 0) {
      window.setTimeout(function () {
        if (!gameFinished && !questionAnswered) {
          for (var j = 0; j < choiceButtons.length; j++) {
            choiceButtons[j].disabled = false;
          }
        }
      }, wait);
    }
  }

  function updateStats() {
    scoreEl.textContent = String(score);
    timeLeftEl.textContent = String(timeRemaining);
    difficultyEl.textContent = getDifficulty();
    comboEl.textContent = String(combo);
    mistakesEl.textContent = String(wrongAnswers);
  }

  function showFeedback(isCorrect) {
    feedbackEl.textContent = isCorrect ? "Correct!" : "Answer: " + currentAnswer;
    feedbackEl.className = "feedback " + (isCorrect ? "correct" : "wrong");
  }

  function checkAnswer(submitted, btn) {
    if (gameFinished || questionAnswered || performance.now() < inputBlockedUntil) return;
    questionAnswered = true;
    inputBlockedUntil = performance.now() + 250;

    var isCorrect = submitted === currentAnswer;

    disableChoices();

    if (isCorrect) {
      score += 1;
      correctAnswers += 1;
      combo += 1;
      bestCombo = Math.max(bestCombo, combo);
      score += getComboBonus();
      if (performance.now() - questionShownAt < 2000) score += 1;
      btn.classList.add("correct");
    } else {
      combo = 0;
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
      if (gameFinished) return;
      feedbackEl.textContent = "";
      feedbackEl.className = "feedback";
      generateQuestion();
    }, 120);
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
    combo = 0;
    bestCombo = 0;
    questionAnswered = false;
    previousQuestions = [];
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
    questionAnswered = true;
    disableChoices();
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
    resultComboEl.textContent = String(bestCombo);
    resultAccuracyEl.textContent = getAccuracy() + "%";
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
