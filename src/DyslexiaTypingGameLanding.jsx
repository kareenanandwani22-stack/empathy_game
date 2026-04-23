import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./dyslexia-landing-styles.css";


const GAME_DATA = {
  landingTitle: "Train your focus through clue-based reading.",
  landingText:
    "A dyslexia-inspired prosocial game where players type distorted clues and solve a final scene.",
  levels: [
    {
      name: "Level 1 — Mirror",
      effect: "mirror-basic",
      description:
        "Some letters such as b and p may switch visually. Read carefully and type the full paragraph before time runs out.",
      paragraph:
        "The scene opens beneath a fading sky washed in amber and soft rose. A wide open horizon stretches far ahead, broken only by the meeting point of light and distance. The air feels calm, spacious, and touched by the slow ending of the day."
    },
    {
      name: "Level 2 — Distortion",
      effect: "mirror-jumble",
      description:
         "Letters such as b and p may switch visually, while words gradually become more jumbled over time. Stay focused and type as accurately as you can.",
      paragraph:
        "The ground here gives slightly under each step, holding marks only for a short while before they soften again. A salted breeze drifts past as the sound of water returns in repeating waves. Above, occasional birds cut across the open space with sharp distant calls."
    },
    {
      name: "Level 3 — Full Distortion",
      effect: "full",
      description:
        "Letters may switch, words gradually jumble further, and parts of the text may drift up and down. Keep your attention on the paragraph and finish typing before time runs out.",
      paragraph:
        "Nearby, a few people pause quietly to watch the glowing edge of the sun sink lower. Children move close to the shoreline, running in and out while shaping mounds and patterns on the sand. The full scene feels coastal, golden, peaceful, and gently alive."
    }
  ],
  finalQuestion: {
    prompt: "Which scene is best described by all three paragraphs?",
    options: [
      "A quiet beach at sunset",
      "A lakeside boardwalk at dusk",
      "A seaside promenade in the evening",
      "A rooftop terrace overlooking the ocean"
    ],
    answer: "A quiet beach at sunset"
  }
};


function normalise(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function flipBasic(text) {
  const map = {
    b: "d",
    d: "b",
    p: "q",
    q: "p",
  };

  return text
    .split("")
    .map((char) => {
      if (map[char] && Math.random() < 0.5) {
        return map[char];
      }
      return char;
    })
    .join("");
}

function flipAdvanced(text) {
  const map = { b: "p", p: "b", q: "d", d: "q" };

  return text
    .split("")
    .map((char) => {
      if (map[char] && Math.random() < 0.2) {
        return map[char];
      }
      return char;
    })
    .join("");
}


function applyEffects(text, effect) {
  let result = text;

  if (effect === "mirror-basic") {
    result = flipBasic(result);
  }

  if (effect === "mirror-jumble") {
    result = flipBasic(result);
  }

  if (effect === "full") {
    result = flipAdvanced(result);
  }

  return result;
}

function calculateWpm(text, secondsUsed) {
  const trimmed = text.trim();
  if (!trimmed || secondsUsed <= 0) return 0;

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const minutes = secondsUsed / 60;
  return Math.round(words / minutes);
}

export default function DyslexiaTypingGameLanding() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [input, setInput] = useState("");
  const [typingScore, setTypingScore] = useState(0);
  const [message, setMessage] = useState("Press Start Game to begin.");
  const [kerningPulse, setKerningPulse] = useState(false);
  const [driftOffset, setDriftOffset] = useState(0);
  const [distortedText, setDistortedText] = useState("");
  const [phase, setPhase] = useState("landing"); // landing | level | question | result-stats | result-message
  const [selectedOption, setSelectedOption] = useState("");
  const [finalCorrect, setFinalCorrect] = useState(null);
  const [levelWpms, setLevelWpms] = useState([0, 0, 0]);
  const [currentWpm, setCurrentWpm] = useState(0);

  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeoutModalText, setTimeoutModalText] = useState("");

  const latestWpmRef = useRef(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const levelIndexRef = useRef(0);

  const currentLevel = GAME_DATA.levels[levelIndex];
  const targetParagraph = currentLevel?.paragraph ?? "";

  const [showEndingActions, setShowEndingActions] = useState(false);

  const totalScore = useMemo(() => {
    return typingScore + (finalCorrect ? 2 : 0);
  }, [typingScore, finalCorrect]);

  
  useEffect(() => {
    if (phase !== "level") return;

    setDistortedText(targetParagraph);
  }, [levelIndex, phase, targetParagraph]);

  useEffect(() => {
    levelIndexRef.current = levelIndex;
  }, [levelIndex]);

  useEffect(() => {
    if (phase !== "level" || currentLevel.effect !== "full") return;

    const interval = setInterval(() => {
      setDriftOffset((prev) => (prev === 0 ? 4 : prev === 4 ? -4 : 0));
      setKerningPulse((prev) => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, [phase, currentLevel]);

  useEffect(() => {
    if (phase !== "level") return;

    let interval;

    if (currentLevel.effect === "mirror-jumble" || currentLevel.effect === "full") {
      interval = setInterval(() => {
        setDistortedText((prev) => jumbleText(prev));
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [phase, currentLevel]);

  useEffect(() => {
    if (phase === "level" && inputRef.current && !showTimeoutModal) {
      inputRef.current.focus();
    }
  }, [phase, levelIndex, showTimeoutModal,]);

  useEffect(() => {
    if (phase !== "level") return;

    const secondsUsed = Math.max(1, 30 - timeLeft);
    const wpm = calculateWpm(input, secondsUsed);

    setCurrentWpm(wpm);

    // 
    latestWpmRef.current = wpm;

    }, [input, timeLeft, phase]);


  useEffect(() => {
  if (phase !== "result-message") return;

  setShowEndingActions(false);

  const totalDelayMs = 19000;

  const timer = setTimeout(() => {
    setShowEndingActions(true);
  }, totalDelayMs);

  return () => clearTimeout(timer);
}, [phase]);


  function goHome() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase("landing");
    setLevelIndex(0);
    setTimeLeft(30);
    setInput("");
    setShowEndingActions(false);
    setTypingScore(0);
    setMessage("Press Start Game to begin.");
    setKerningPulse(false);
    setDriftOffset(0);
    setSelectedOption("");
    setFinalCorrect(null);
    setLevelWpms([0, 0, 0]);
    setCurrentWpm(0);
    setShowTimeoutModal(false);
    setTimeoutModalText("");
  
  }

  function startGame() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase("level");
    setLevelIndex(0);
    setTimeLeft(30);
    setInput("");
    setTypingScore(0);
    setMessage("Type the full paragraph before time runs out.");
    setKerningPulse(false);
    setDriftOffset(0);
    setSelectedOption("");
    setFinalCorrect(null);
    setLevelWpms([0, 0, 0]);
    setCurrentWpm(0);
    setShowTimeoutModal(false);
    setTimeoutModalText("");
    setDistortedText(GAME_DATA.levels[0].paragraph);
    setShowEndingActions(false);
  }

  function jumbleText(text) {
    const chars = text.split("");

    const swaps = Math.max(1, Math.floor(chars.length / 25));

    for (let i = 0; i < swaps; i++) {
      const index = Math.floor(Math.random() * (chars.length - 1));

      if (
        chars[index] !== " " &&
        chars[index + 1] !== " "
      ) {
        [chars[index], chars[index + 1]] = [chars[index + 1], chars[index]];
      }
    }

    return chars.join("");
  }

  const saveLevelWpm = useCallback((levelToSave, wpmValue = 0) => {
    setLevelWpms((prev) => {
      const updated = [...prev];
      updated[levelToSave] = wpmValue;
      return updated;
    });
  }, []);

  function moveToNextStageAfterTimeout() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setShowTimeoutModal(false);
    setInput("");
    setTimeLeft(30);
    setKerningPulse(false);
    setDriftOffset(0);
    setCurrentWpm(0);

    const nextLevel = levelIndex + 1;

    if (nextLevel < GAME_DATA.levels.length) {
      setLevelIndex(nextLevel);
      setMessage("Moving to the next clue.");
      return;
    }

    setPhase("question");
  }

  const handleTimeUp = useCallback(() => {
    const finalLiveWpm = latestWpmRef.current;
    const currentLevelIndex = levelIndexRef.current;

    saveLevelWpm(currentLevelIndex, finalLiveWpm);
    setTimeoutModalText(
      `Time is up. Your latest WPM for this level was ${finalLiveWpm}.`
    );
    setShowTimeoutModal(true);
  }, [saveLevelWpm]);

  useEffect(() => {
    if (phase !== "level" || showTimeoutModal) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, levelIndex, showTimeoutModal, handleTimeUp]);


  function handleLevelAdvance(success) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    saveLevelWpm(levelIndex, currentWpm);

    if (success) {
      setTypingScore((prev) => prev + 1);
      setMessage("Accurate enough. Moving to the next clue.");
    } else {
      setMessage("The paragraph was not accurate enough. Moving on.");
    }

    setInput("");
    setTimeLeft(30);
    setKerningPulse(false);
    setDriftOffset(0);
    setCurrentWpm(0);

    const nextLevel = levelIndex + 1;

    if (nextLevel < GAME_DATA.levels.length) {
      setLevelIndex(nextLevel);
      return;
    }

    setPhase("question");
  }

  function handleSubmitParagraph(event) {
    event.preventDefault();
    if (phase !== "level" || showTimeoutModal) return;

    const isCorrect = normalise(input) === normalise(targetParagraph);
    handleLevelAdvance(isCorrect);
  }

  function handleFinalSubmit() {
    if (!selectedOption) return;

    const isCorrect = selectedOption === GAME_DATA.finalQuestion.answer;
    setFinalCorrect(isCorrect);
    setShowEndingActions(false);
    setPhase("result-stats");
  }

  function handleGoToFinalMessage() {
    setShowEndingActions(false);
    setPhase("result-message");
  }

  if (phase === "landing") {
    return (
      <div className="landing-page">
        <div className="landing-frame">
          <header className="top-nav">
            <div className="brand-mark">◔</div>

            <div className="nav-actions">
              <button className="nav-text-btn">About</button>
              <button className="nav-dark-btn">Login</button>
            </div>
          </header>

          <main className="hero-section">
            <div className="hero-badges">
              <span className="hero-chip light">Introducing</span>
              <span className="hero-chip dark">Scene Clue Challenge</span>
            </div>

            <h1 className="hero-title">{GAME_DATA.landingTitle}</h1>

            <p className="hero-copy">{GAME_DATA.landingText}</p>

            <div className="hero-console">
              <div className="console-line">
                <span> <p>Your task: Read through the distorted text, stay focused under pressure,
                  and type each paragraph accurately. </p> Hint: Pay attention to what you read.
                </span>
              </div>
              <div className="console-footer">
                <div className="console-icons">
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
                <button className="console-start" onClick={startGame}>
                  Start Game →
                </button>
              </div>
            </div>
          </main>

          <footer className="footer">
            <p>
              Assignment 2 Group Project — proof of submission (and a little bit of empathy).
            </p>
            <p className="footer-sub">
              Built for 02.165TS Empathy: An Interdisciplinary Concept by <strong>Sofeanna Yusof</strong>,{" "}
              <strong>Kareena Nandwani</strong>, <strong>Luvena Liethanti</strong>, and{" "}
              <strong>Rachel Low</strong>.
            </p>
          </footer>
        </div>
      </div>
    );
  }

  if (phase === "question") {
    return (
      <div className="game-shell">
        <div className="final-question-wrapper">
          <div className="results-panel final-question-panel panel-entrance">
            <h2>Final Question</h2>
            <p className="final-question-text">
              {GAME_DATA.finalQuestion.prompt}
            </p>

            <div className="wpm-summary">
              <p><strong>Your WPM by level</strong></p>
              <p>Level 1: {levelWpms[0]} WPM</p>
              <p>Level 2: {levelWpms[1]} WPM</p>
              <p>Level 3: {levelWpms[2]} WPM</p>
            </div>

            <div className="options-grid">
              {GAME_DATA.finalQuestion.options.map((option) => (
                <button
                  key={option}
                  className={`option-btn ${
                    selectedOption === option ? "option-selected" : ""
                  }`}
                  onClick={() => setSelectedOption(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              className="primary-btn"
              onClick={handleFinalSubmit}
              disabled={!selectedOption}
            >
              Submit Answer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result-stats") {
  return (
    <div className="game-shell">
      <div className="results-panel final-question-panel panel-entrance">
        <h2>{finalCorrect ? "Correct!" : "Not quite."}</h2>

        {!finalCorrect && (
          <p>
            The correct answer was:{" "}
            <strong>{GAME_DATA.finalQuestion.answer}</strong>
          </p>
        )}

        {finalCorrect && (
          <p>
            You identified the scene correctly:{" "}
            <strong>{GAME_DATA.finalQuestion.answer}</strong>
          </p>
        )}

        <div className="wpm-summary">
          <p><strong>Your WPM Progress</strong></p>
          <p>Level 1: {levelWpms[0]} WPM</p>
          <p>Level 2: {levelWpms[1]} WPM</p>
          <p>Level 3: {levelWpms[2]} WPM</p>
        </div>

        <p>
          Typing score: <strong>{typingScore}</strong> / 3
        </p>
        <p>
          Final scene score: <strong>{finalCorrect ? 2 : 0}</strong> / 2
        </p>
        <p>
          Total score: <strong>{totalScore}</strong> / 5
        </p>

        <div className="result-actions">
          <button className="primary-btn" onClick={handleGoToFinalMessage}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

  if (phase === "result-message") {
    return (
      <div className="game-shell">
        <div className="results-panel final-question-panel panel-entrance">
          
          <div className="empathy-section">
            {[
              {
                text: "This was just a few moments of your life. For people with dyslexia, this is a lifetime. Around 1 in 10 people worldwide live with dyslexia — that’s over 700 million people. What you experienced as frustration, they experience as everyday reading, writing, and learning. What felt tiring to you for a moment… is their normal. And yet, they’re expected to keep up.",
                delay: "0s"
              },
              {
                text: "But this is not the whole story. Research shows that people with dyslexia often have strengths in creativity, problem-solving, and big-picture thinking.",
                delay: "7s"
              },
              {
                text: "Many have gone on to become entrepreneurs, artists, and leaders, including figures like Richard Branson and Steven Spielberg.",
                delay: "11s"
              },
              {
                text: "Dyslexia isn’t a lack of ability — it’s a different way of thinking. And with the right support, that difference can become a strength.",
                delay: "15s"
              }
            ].map((paragraph, index) => (
              <p
                key={index}
                className="empathy-paragraph"
                style={{ animationDelay: paragraph.delay }}
              >
                {paragraph.text}
              </p>
            ))}
          </div>

          {showEndingActions && (
            <div className="ending-stats-block stats-fade-in">
              <div className="result-actions">
                <button className="primary-btn" onClick={startGame}>
                  Play Again
                </button>
                <button className="secondary-btn" onClick={goHome}>
                  Home
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="game-shell">
      <div className="game-card">
        <div className="status-grid">
          <div className="status-box">
            <span className="label">Current level</span>
            <strong>{currentLevel.name}</strong>
          </div>
          <div className="status-box">
            <span className="label">Clue</span>
            <strong>{levelIndex + 1} / 3</strong>
          </div>
          <div className={`status-box ${timeLeft <= 10 ? "timer-warning" : ""}`}>
            <span className="label">Timer</span>
            <strong>{timeLeft}s</strong>
          </div>
          <div className="status-box">
            <span className="label">Live WPM</span>
            <strong>{currentWpm}</strong>
          </div>
        </div>

        <div className={`timer-progress-container ${timeLeft <= 10 ? "timer-danger" : ""}`}>
          <div 
            className="timer-progress-bar"
            style={{
              width: `${(timeLeft / 30) * 100}%`,
              backgroundColor: timeLeft <= 10 ? "#e63946" : "#4a9eff"
            }}
          />
        </div>

        <div className="instructions-box">
          <p>{currentLevel.description}</p>
        </div>

        <div
          className={`sentence-box ${
            currentLevel.effect === "full" ? "drift-active" : ""
          }`}
          style={{
            letterSpacing:
              currentLevel.effect === "full" && kerningPulse
                ? "0.09em"
                : "0.02em"
          }}
        >
          {currentLevel.effect === "full" ? (
            <div className="drift-word-wrap">
              {applyEffects(distortedText, currentLevel.effect)
                .split(" ")
                .map((word, index) => (
                  <span
                    key={`${word}-${index}`}
                    className="drift-word"
                    style={{
                      transform:
                        index % 3 === 0
                          ? `translateY(${driftOffset}px)`
                          : index % 3 === 1
                          ? `translateY(${-driftOffset}px)`
                          : "translateY(0px)"
                    }}
                  >
                    {word}&nbsp;
                  </span>
                ))}
            </div>
          ) : (
            applyEffects(distortedText, currentLevel.effect)
          )}
        </div>

        <form className="input-panel" onSubmit={handleSubmitParagraph}>
          <label htmlFor="answer">Type the full paragraph here</label>
          <textarea
            id="answer"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            placeholder="Start typing..."
            disabled={showTimeoutModal}
          />
          <button className="primary-btn" type="submit" disabled={showTimeoutModal}>
            Submit Paragraph
          </button>
        </form>

        <p className="message">{message}</p>

        {showTimeoutModal && (
          <div className="modal-overlay">
            <div className="modal-box panel-entrance">
              <h3>Time’s Up</h3>
              <p>{timeoutModalText}</p>
              <button className="primary-btn" onClick={moveToNextStageAfterTimeout}>
                Next Stage
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}