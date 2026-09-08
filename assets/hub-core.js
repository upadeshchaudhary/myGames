(function (global) {
  "use strict";

  var NS = "kantipurGames"; // localStorage key prefix
  var GAMES = ["jigsaw", "quickmath", "memoryflip", "tapmania"];

  var GAME_META = {
    jigsaw: { id: "jigsaw", title: "Daily Jigsaw", emoji: "🧩", url: "games/Jigsaw Puzzle/index.html" },
    quickmath: { id: "quickmath", title: "Quick Math", emoji: "🧮", url: "games/Math mania/index.html" },
    memoryflip: { id: "memoryflip", title: "Memory Flip", emoji: "🃏", url: "games/Memory Flip/index.html" },
    tapmania: { id: "tapmania", title: "Tap Mania", emoji: "👆", url: "games/Tap Mania/index.html" }
  };

  function pad(n) { return String(n).padStart(2, "0"); }

  // Local calendar date, e.g. "2026-09-07" — used as the key for "today".
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function dateFromKey(key) {
    var parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dayIndex() {
    var epoch = new Date(2026, 0, 1); // Jan 1, 2026
    var now = dateFromKey(todayKey());
    var msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((now - epoch) / msPerDay);
  }

  function daysBetween(keyA, keyB) {
    var msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((dateFromKey(keyB) - dateFromKey(keyA)) / msPerDay);
  }

  function seededRandom(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(arr, seed) {
    var a = arr.slice();
    var rand = seededRandom(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function pick(arr, seed) {
    return arr[seed % arr.length];
  }


  function storageGet(key, fallback) {
    try {
      var raw = localStorage.getItem(NS + ":" + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(NS + ":" + key, JSON.stringify(value));
    } catch (e) { /* storage unavailable — fail silently */ }
  }

  function featuredGame() {
    var id = pick(GAMES, dayIndex());
    return GAME_META[id];
  }


  function getStreak() {
    return storageGet("streak", { count: 0, lastDate: null, longest: 0 });
  }


  function recordPlay(gameId) {
    var today = todayKey();
    var streak = getStreak();

    if (streak.lastDate === today) {
    } else if (streak.lastDate && daysBetween(streak.lastDate, today) === 1) {
      streak.count += 1; // played yesterday too — extend streak
    } else {
      streak.count = 1; // gap in play (or first ever play) — restart streak
    }
    streak.lastDate = today;
    streak.longest = Math.max(streak.longest || 0, streak.count);
    storageSet("streak", streak);

    // Track which games were played today, for the hub's "played today" badges
    var playedToday = storageGet("playedToday:" + today, []);
    if (playedToday.indexOf(gameId) === -1) {
      playedToday.push(gameId);
      storageSet("playedToday:" + today, playedToday);
    }

    return streak;
  }

  function playedToday(gameId) {
    var list = storageGet("playedToday:" + todayKey(), []);
    return list.indexOf(gameId) !== -1;
  }


  function bestKey(gameId, variant) {
    return "best:" + gameId + (variant ? ":" + variant : "");
  }

  function getBest(gameId, variant) {
    return storageGet(bestKey(gameId, variant), 0);
  }

  function setBestIfHigher(gameId, score, variant) {
    var best = getBest(gameId, variant);
    if (score > best) {
      storageSet(bestKey(gameId, variant), score);
      return true;
    }
    return false;
  }

  function getTodayScore(gameId, variant) {
    return storageGet("today:" + gameId + (variant ? ":" + variant : "") + ":" + todayKey(), null);
  }

  function setTodayScore(gameId, score, variant) {
    storageSet("today:" + gameId + (variant ? ":" + variant : "") + ":" + todayKey(), score);
  }

  // One call at the end of a game: updates streak, best, and today's score.
  function finishRound(gameId, score, variant) {
    var isNewBest = setBestIfHigher(gameId, score, variant);
    setTodayScore(gameId, score, variant);
    var streak = recordPlay(gameId);
    return { isNewBest: isNewBest, best: getBest(gameId, variant), streak: streak.count };
  }


  var HEADLINE_POOL = [
    { cat: "Politics", text: "Parliament session extended amid budget talks" },
    { cat: "Economy", text: "Remittance inflows rise ahead of festival season" },
    { cat: "Sports", text: "Nepal cricket team wins series decider" },
    { cat: "Technology", text: "Kathmandu startups raise fresh seed funding" },
    { cat: "World", text: "SAARC ministers meet to discuss trade corridor" },
    { cat: "Entertainment", text: "New Nepali film tops opening weekend" },
    { cat: "Weather", text: "Monsoon withdrawal expected by next week" },
    { cat: "Business", text: "Stock index closes higher on banking gains" },
    { cat: "Health", text: "Health ministry expands rural vaccination drive" },
    { cat: "Education", text: "SEE results to be published this month" },
    { cat: "Tourism", text: "Trekking permits rise ahead of autumn season" },
    { cat: "Infrastructure", text: "Ring road expansion enters next phase" }
  ];

  var PHOTO_POOL = [
    { id: 1, title: "Mount Everest", credit: "Kantipur Archive", img: "https://picsum.photos/seed/everest/800/800" },
    { id: 2, title: "Kathmandu Durbar Square", credit: "Kantipur Archive", img: "https://picsum.photos/seed/kathmandu/800/800" },
    { id: 3, title: "Pokhara & Phewa Lake", credit: "Kantipur Archive", img: "https://picsum.photos/seed/pokhara/800/800" },
    { id: 4, title: "Pashupatinath", credit: "Kantipur Archive", img: "https://picsum.photos/seed/pashupatinath/800/800" },
    { id: 5, title: "Mustang Valley", credit: "Kantipur Archive", img: "https://picsum.photos/seed/mustang/800/800" },
    { id: 6, title: "Bhaktapur Old Town", credit: "Kantipur Archive", img: "https://picsum.photos/seed/bhaktapur/800/800" },
    { id: 7, title: "Chitwan National Park", credit: "Kantipur Archive", img: "https://picsum.photos/seed/chitwan/800/800" }
  ];

 
  var NEPAL_NUMBER_FACTS = [
    { q: "Height of Mount Everest (meters)?", a: 8849, choices: [8611, 8849, 8091, 7800] },
    { q: "Number of provinces in Nepal?", a: 7, choices: [5, 6, 7, 8] },
    { q: "Year Nepal became a federal republic?", a: 2008, choices: [1996, 2006, 2008, 2015] },
    { q: "Number of UNESCO World Heritage Sites in the Kathmandu Valley?", a: 7, choices: [4, 5, 7, 9] },
    { q: "Approx. length of the Ring Road, Kathmandu (km)?", a: 27, choices: [17, 27, 37, 47] },
    { q: "Number of districts in Nepal?", a: 77, choices: [65, 75, 77, 82] }
  ];

  var TAP_CHALLENGE_POOL = [
    { label: "Beat 60 taps", target: 60 },
    { label: "Beat 70 taps", target: 70 },
    { label: "Beat 55 taps", target: 55 },
    { label: "Beat 65 taps", target: 65 },
    { label: "Beat 75 taps", target: 75 }
  ];

  function dailyHeadlines(count) {
    count = count || 8;
    var shuffled = seededShuffle(HEADLINE_POOL, dayIndex());
    var picked = [];
    for (var i = 0; i < count; i++) {
      picked.push(shuffled[i % shuffled.length]);
    }
    return picked;
  }

  function dailyPhoto() {
    return pick(PHOTO_POOL, dayIndex());
  }

  function allPhotos() {
    return PHOTO_POOL;
  }

  function dailyNepalFact() {
    return pick(NEPAL_NUMBER_FACTS, dayIndex());
  }

  function dailyTapChallenge() {
    return pick(TAP_CHALLENGE_POOL, dayIndex());
  }

  function editionNumber() {
    // "Today's Edition #N" — starts at #1 on the epoch date
    return dayIndex() + 1;
  }


  function shareScore(text, opts) {
    opts = opts || {};
    if (navigator.share) {
      navigator.share({ text: text, title: opts.title || "Kantipur Games" }).catch(function () {});
      return "native";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (opts.onCopy) opts.onCopy();
      }).catch(function () {});
      return "clipboard";
    }
    return "unsupported";
  }


  function renderStreakBadge(container, streakCount) {
    if (!container) return;
    container.innerHTML =
      '<span class="kg-streak">🔥 <b>' + streakCount + '</b> day' + (streakCount === 1 ? '' : 's') + ' streak</span>';
  }

  function attachShareButton(button, textFn) {
    if (!button) return;
    button.addEventListener("click", function () {
      var text = typeof textFn === "function" ? textFn() : String(textFn);
      var mode = shareScore(text, {
        onCopy: function () {
          var original = button.textContent;
          button.textContent = "Copied!";
          setTimeout(function () { button.textContent = original; }, 1500);
        }
      });
      if (mode === "clipboard") {
        // onCopy handles the label swap
      }
    });
  }


  global.KantipurGames = global.KG = {
    GAMES: GAMES,
    GAME_META: GAME_META,

    todayKey: todayKey,
    dayIndex: dayIndex,
    editionNumber: editionNumber,

    featuredGame: featuredGame,

    getStreak: getStreak,
    recordPlay: recordPlay,
    playedToday: playedToday,

    getBest: getBest,
    setBestIfHigher: setBestIfHigher,
    getTodayScore: getTodayScore,
    setTodayScore: setTodayScore,
    finishRound: finishRound,

    dailyHeadlines: dailyHeadlines,
    dailyPhoto: dailyPhoto,
    allPhotos: allPhotos,
    dailyNepalFact: dailyNepalFact,
    dailyTapChallenge: dailyTapChallenge,

    seededShuffle: seededShuffle,
    seededRandom: seededRandom,

    shareScore: shareScore,
    renderStreakBadge: renderStreakBadge,
    attachShareButton: attachShareButton
  };

})(window);
