"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import rawPlayers from "@/app/data/afl_players26.json";

const columns = ["Name", "Club", "State", "Pos", "Age", "#", "Disposals", "Goals"];

type RawPlayer = {
  id: string;
  name: string;
  club: string;
  pos: string[];
  age: number;
  number: number;
  disposals: number;
  goals: number;
};

type Player = {
  id: string;
  name: string;
  club: string;
  state: string;
  pos: string[];
  age: number;
  number: number;
  disposals: number;
  goals: number;
};

type CellStatus = "correct" | "close" | "wrong";

const CLUB_ICON_MAP: Record<string, string> = {
  Adelaide: "/team-icons/adelaide.png",
  Brisbane: "/team-icons/brisbane.png",
  Carlton: "/team-icons/carlton.png",
  Collingwood: "/team-icons/collingwood.png",
  Essendon: "/team-icons/essendon.png",
  Fremantle: "/team-icons/fremantle.png",
  Geelong: "/team-icons/geelong.png",
  "Gold Coast": "/team-icons/goldcoast.png",
  GWS: "/team-icons/gws.png",
  Hawthorn: "/team-icons/hawthorn.png",
  Melbourne: "/team-icons/melbourne.png",
  "North Melbourne": "/team-icons/northmelbourne.png",
  "Port Adelaide": "/team-icons/portadelaide.png",
  Richmond: "/team-icons/richmond.png",
  "St Kilda": "/team-icons/stkilda.png",
  Sydney: "/team-icons/sydney.png",
  "West Coast": "/team-icons/westcoast.png",
  "Western Bulldogs": "/team-icons/westernbulldogs.png",
};

const CLUB_STATE_MAP: Record<string, string> = {
  Adelaide: "SA",
  Brisbane: "QLD",
  Carlton: "VIC",
  Collingwood: "VIC",
  Essendon: "VIC",
  Fremantle: "WA",
  Geelong: "VIC",
  "Gold Coast": "QLD",
  GWS: "NSW",
  Hawthorn: "VIC",
  Melbourne: "VIC",
  "North Melbourne": "VIC",
  "Port Adelaide": "SA",
  Richmond: "VIC",
  "St Kilda": "VIC",
  Sydney: "NSW",
  "West Coast": "WA",
  "Western Bulldogs": "VIC",
};

const CLUB_COLOR_GROUPS: Record<string, string[]> = {
  Adelaide: ["red", "blue", "yellow"],
  Brisbane: ["maroon", "blue", "yellow"],
  Carlton: ["navy"],
  Collingwood: ["black", "white"],
  Essendon: ["red", "black"],
  Fremantle: ["purple", "white"],
  Geelong: ["blue", "white"],
  "Gold Coast": ["red", "yellow"],
  GWS: ["orange", "charcoal", "white"],
  Hawthorn: ["brown", "gold"],
  Melbourne: ["red", "blue"],
  "North Melbourne": ["blue", "white"],
  "Port Adelaide": ["teal", "black", "white"],
  Richmond: ["yellow", "black"],
  "St Kilda": ["red", "white", "black"],
  Sydney: ["red", "white"],
  "West Coast": ["blue", "yellow"],
  "Western Bulldogs": ["blue", "red", "white"],
};

const STATE_BORDERS: Record<string, string[]> = {
  WA: ["SA", "NT"],
  NT: ["WA", "SA", "QLD"],
  SA: ["WA", "NT", "QLD", "NSW", "VIC"],
  QLD: ["NT", "SA", "NSW"],
  NSW: ["QLD", "SA", "VIC", "ACT"],
  ACT: ["NSW"],
  VIC: ["SA", "NSW"],
  TAS: [],
};

function getClubIcon(club: string) {
  return CLUB_ICON_MAP[club] || "/team-icons/gws.png";
}

function getStateFromClub(club: string) {
  return CLUB_STATE_MAP[club] || "VIC";
}

function normalize(str: string) {
  return str.toLowerCase().trim();
}

const players: Player[] = (rawPlayers as RawPlayer[])
  .filter(
    (player) =>
      player &&
      player.id &&
      player.name &&
      player.club &&
      Array.isArray(player.pos) &&
      typeof player.age === "number" &&
      typeof player.number === "number" &&
      typeof player.disposals === "number" &&
      typeof player.goals === "number"
  )
  .map((player) => ({
    ...player,
    state: getStateFromClub(player.club),
  }));

function getRandomPlayer(excludeId?: string) {
  const usablePlayers = players.filter((p) => p.disposals > 0 || p.goals > 0);
  const pool = excludeId
    ? usablePlayers.filter((p) => p.id !== excludeId)
    : usablePlayers;

  return pool[Math.floor(Math.random() * pool.length)];
}

function getNumberStatus(guess: number, answer: number, closeRange: number): CellStatus {
  if (guess === answer) return "correct";
  if (Math.abs(guess - answer) <= closeRange) return "close";
  return "wrong";
}

function getTextStatus(guess: string, answer: string): CellStatus {
  return guess === answer ? "correct" : "wrong";
}

function getClubStatus(guess: string, answer: string): CellStatus {
  if (guess === answer) return "correct";

  const guessColors = CLUB_COLOR_GROUPS[guess] || [];
  const answerColors = CLUB_COLOR_GROUPS[answer] || [];

  const sharesColor = guessColors.some((color) => answerColors.includes(color));

  if (sharesColor) return "close";
  return "wrong";
}

function getStateStatus(guess: string, answer: string): CellStatus {
  if (guess === answer) return "correct";
  if ((STATE_BORDERS[guess] || []).includes(answer)) return "close";
  return "wrong";
}

function getPosStatus(guess: string[], answer: string[]): CellStatus {
  const guessSet = new Set(guess);
  const answerSet = new Set(answer);

  const exact =
    guess.length === answer.length &&
    guess.every((value) => answer.includes(value));

  if (exact) return "correct";

  for (const value of guessSet) {
    if (answerSet.has(value)) return "close";
  }

  return "wrong";
}

function getArrow(guess: number, answer: number) {
  if (guess === answer) return "";
  return guess < answer ? " ↑" : " ↓";
}

function cellStyle(status: CellStatus): React.CSSProperties {
  if (status === "correct") {
    return {
      background: "#3aa655",
      color: "white",
      border: "3px solid #1d6b33",
    };
  }

  if (status === "close") {
    return {
      background: "#d8a928",
      color: "white",
      border: "3px solid #9b7410",
    };
  }

  return {
    background: "#5f6470",
    color: "white",
    border: "3px solid #3f434c",
  };
}

function rowCellBaseStyle(): React.CSSProperties {
  return {
    minHeight: 72,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontWeight: 900,
    padding: "10px 8px",
    lineHeight: 1.1,
    wordBreak: "break-word",
    transition:
      "transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease, opacity 0.18s ease",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    animation: "tilePop 0.28s ease",
  };
}

function ClubIcon({
  club,
  size = 26,
}: {
  club: string;
  size?: number;
}) {
  return (
    <div className="club-icon-wrap">
      <Image
        src={getClubIcon(club)}
        alt={club}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
    </div>
  );
}

export default function FootyWhoPage() {
  const [answer, setAnswer] = useState<Player | null>(null);
  const [query, setQuery] = useState("");
  const [guesses, setGuesses] = useState<Player[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (players.length > 0) {
      setAnswer(getRandomPlayer());
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPlayers = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];

    return players
      .filter((player) => normalize(player.name).includes(q))
      .filter((player) => !guesses.some((guess) => guess.id === player.id))
      .slice(0, 8);
  }, [query, guesses]);

  function startNewGame() {
    const next = getRandomPlayer(answer?.id);
    setAnswer(next);
    setQuery("");
    setGuesses([]);
    setIsOpen(false);
    setGameOver(false);
    setWon(false);
    inputRef.current?.focus();
  }

  function submitGuess(player: Player) {
    if (!answer || gameOver) return;
    if (guesses.some((guess) => guess.id === player.id)) return;

    const nextGuesses = [player, ...guesses];
    setGuesses(nextGuesses);
    setQuery("");
    setIsOpen(false);

    if (player.id === answer.id) {
      setWon(true);
      setGameOver(true);
      return;
    }

    if (nextGuesses.length >= 8) {
      setWon(false);
      setGameOver(true);
    }
  }

  function handleGiveUp() {
    if (!answer) return;
    setWon(false);
    setGameOver(true);
    setIsOpen(false);
  }

  function renderFeedbackRow(player: Player, rowIndex: number) {
    if (!answer) return null;

    const nameStatus = getTextStatus(player.name, answer.name);
    const clubStatus = getClubStatus(player.club, answer.club);
    const stateStatus = getStateStatus(player.state, answer.state);
    const posStatus = getPosStatus(player.pos, answer.pos);
    const ageStatus = getNumberStatus(player.age, answer.age, 2);
    const numberStatus = getNumberStatus(player.number, answer.number, 2);
    const disposalsStatus = getNumberStatus(player.disposals, answer.disposals, 3);
    const goalsStatus = getNumberStatus(player.goals, answer.goals, 2);

    const cells = [
      {
        key: "name",
        status: nameStatus,
        content: <span>{player.name}</span>,
      },
      {
        key: "club",
        status: clubStatus,
        content: (
          <div className="club-cell-content">
            <ClubIcon club={player.club} size={28} />
            <span>{player.club}</span>
          </div>
        ),
      },
      {
        key: "state",
        status: stateStatus,
        content: <span>{player.state}</span>,
      },
      {
        key: "pos",
        status: posStatus,
        content: <span>{player.pos.join(", ")}</span>,
      },
      {
        key: "age",
        status: ageStatus,
        content: <span>{`${player.age}${getArrow(player.age, answer.age)}`}</span>,
      },
      {
        key: "number",
        status: numberStatus,
        content: <span>{`${player.number}${getArrow(player.number, answer.number)}`}</span>,
      },
      {
        key: "disposals",
        status: disposalsStatus,
        content: (
          <span>{`${Number(player.disposals).toFixed(
            player.disposals % 1 === 0 ? 0 : 2
          )}${getArrow(player.disposals, answer.disposals)}`}</span>
        ),
      },
      {
        key: "goals",
        status: goalsStatus,
        content: (
          <span>{`${Number(player.goals).toFixed(
            player.goals % 1 === 0 ? 0 : 2
          )}${getArrow(player.goals, answer.goals)}`}</span>
        ),
      },
    ];

    return (
      <div
        key={player.id}
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(180px, 1.35fr) minmax(170px, 1.2fr) minmax(90px, 0.7fr) minmax(120px, 0.9fr) repeat(4, minmax(110px, 1fr))",
          gap: 10,
          marginTop: 12,
          minWidth: 1100,
          animation: `rowSlideIn 0.28s ease ${rowIndex * 0.03}s both`,
        }}
      >
        {cells.map((cell) => (
          <div
            key={`${player.id}-${cell.key}`}
            className="animated-cell"
            style={{
              ...rowCellBaseStyle(),
              ...cellStyle(cell.status),
            }}
          >
            {cell.content}
          </div>
        ))}
      </div>
    );
  }

  if (!answer) {
    return (
      <main className="game-page">
        <section className="info-card">
          <h2>Loading players...</h2>
        </section>
      </main>
    );
  }

  return (
    <main className="game-page">
      <section className="game-header" style={{ animation: "fadeUp 0.35s ease" }}>
        <div>
          <p className="kicker">FootyWho</p>
          <h1>Guess the AFL player</h1>
        </div>

       <div className="header-actions">
  <button
    className="ui-button fancy-btn"
    onClick={() => window.open("https://footywho.com", "_blank")}
  >
    Play Full Version
  </button>

  <button className="ui-button fancy-btn" onClick={() => setShowHelp(true)}>
    Help
  </button>

  {!gameOver ? (
    <button className="ui-button fancy-btn" onClick={handleGiveUp}>
      Give Up
    </button>
  ) : (
    <button className="ui-button fancy-btn" onClick={startNewGame}>
      New Game
    </button>
  )}
</div>
      </section>

      <section className="guess-row solo search-section" style={{ animation: "fadeUp 0.4s ease" }}>
        <div ref={dropdownRef} className="search-area">
          <div className="guess-input-wrap animated-input-wrap">
            <span className="guess-icon">?</span>
            <input
              ref={inputRef}
              className="guess-input animated-input"
              placeholder={gameOver ? "Game finished" : "Guess a player..."}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (!gameOver && query.trim()) setIsOpen(true);
              }}
              readOnly={gameOver}
              autoComplete="off"
            />
          </div>

          {isOpen && !gameOver && filteredPlayers.length > 0 && (
            <div className="dropdown-panel">
              {filteredPlayers.map((player, index) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => submitGuess(player)}
                  className="dropdown-item"
                  style={{
                    animation: `fadeUp 0.18s ease ${index * 0.02}s both`,
                  }}
                >
                  <div className="dropdown-left">
                    <ClubIcon club={player.club} size={28} />
                    <span className="dropdown-name">{player.name}</span>
                  </div>
                  <span className="dropdown-club">
                    {player.club} · {player.state}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="timer-box animated-box guesses-box">
          Guesses: {guesses.length}/8
        </div>
      </section>

      {gameOver && answer && (
        <section
          className="info-card answer-card"
          style={{
            marginBottom: 18,
            background: won ? "#dff5e3" : "#f8dfdf",
            animation: "cardIn 0.28s ease",
          }}
        >
          <span className="small-pill">{won ? "You got it" : "Answer"}</span>
          <h2 className="answer-title">
            <ClubIcon club={answer.club} size={32} />
            <span>{won ? `Correct — ${answer.name}` : answer.name}</span>
          </h2>
          <p style={{ marginBottom: 0 }}>
            {answer.club} · {answer.state} · {answer.pos.join(", ")} · #{answer.number}
          </p>
        </section>
      )}

      <section className="board animated-board">
        <div
          className="board-head"
          style={{
            minWidth: 1100,
            display: "grid",
            gridTemplateColumns:
              "minmax(180px, 1.35fr) minmax(170px, 1.2fr) minmax(90px, 0.7fr) minmax(120px, 0.9fr) repeat(4, minmax(110px, 1fr))",
            gap: 10,
            paddingBottom: 12,
          }}
        >
          {columns.map((col, index) => (
            <div
              key={col}
              className="board-col"
              style={{
                animation: `fadeUp 0.2s ease ${index * 0.02}s both`,
              }}
            >
              {col}
            </div>
          ))}
        </div>

        <div style={{ paddingTop: 8 }}>
          {guesses.length > 0 && guesses.map((guess, index) => renderFeedbackRow(guess, index))}
        </div>
      </section>

      {showHelp && (
        <div onClick={() => setShowHelp(false)} className="overlay">
          <div className="info-card help-modal" onClick={(e) => e.stopPropagation()}>
            <span className="small-pill">How to play</span>
            <h2>FootyWho rules</h2>
            <p>
              Type a player name and pick them from the dropdown. Each guess gives feedback
              on name, club, state, position, age, number, disposals, and goals.
            </p>
            <p>
              Green = exact match. Yellow = close. Club goes yellow if it shares any colours
              with the correct club. State goes yellow if it borders the correct state.
            </p>
            <button className="ui-button fancy-btn" onClick={() => setShowHelp(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes tilePop {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes rowSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes overlayFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalPop {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .search-section {
          position: relative;
          z-index: 30;
        }

        .search-area {
          position: relative;
          width: 100%;
          min-width: 0;
        }

        .guesses-box {
          min-width: 170px;
          font-weight: 900;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          animation: fadeUp 0.45s ease;
          white-space: nowrap;
        }

        .dropdown-panel {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 100%;
          max-width: 780px;
          max-height: 360px;
          overflow-y: auto;
          overflow-x: hidden;
          z-index: 1000;
          background: #f7f1e3;
          border: 4px solid #271248;
          border-radius: 16px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
          animation: fadeUp 0.18s ease;
        }

        .dropdown-item {
          width: 100%;
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          cursor: pointer;
          text-align: left;
          transition: transform 0.16s ease, background-color 0.16s ease;
          border-bottom: 2px solid rgba(39, 18, 72, 0.1);
        }

        .dropdown-item:last-child {
          border-bottom: none;
        }

        .dropdown-item:hover {
          background: #efe8d7;
          transform: translateX(4px);
        }

        .dropdown-item:active {
          transform: scale(0.99);
        }

        .dropdown-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .dropdown-name {
          font-size: 1rem;
          font-weight: 900;
          color: #111;
          line-height: 1.1;
        }

        .dropdown-club {
          font-size: 0.98rem;
          font-weight: 800;
          color: #666;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .club-cell-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }

        .answer-title {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: grid;
          place-items: center;
          z-index: 100;
          padding: 20px;
          animation: overlayFade 0.18s ease;
        }

        .help-modal {
          max-width: 640px;
          width: 100%;
          background: #fffaf0;
          animation: modalPop 0.22s ease;
        }

        .fancy-btn {
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            filter 0.18s ease,
            background-color 0.18s ease;
        }

        .fancy-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
          filter: brightness(1.02);
        }

        .fancy-btn:active {
          transform: translateY(0) scale(0.97);
        }

        .animated-input-wrap {
          position: relative;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          z-index: 1001;
        }

        .animated-input-wrap:focus-within {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
        }

        .animated-input {
          transition: background-color 0.18s ease, color 0.18s ease;
        }

        .animated-cell:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16);
          filter: brightness(1.03);
        }

        .animated-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
        }

        .answer-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .answer-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.14);
        }

        .club-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.18s ease;
          flex-shrink: 0;
        }

        .club-icon-wrap:hover {
          transform: scale(1.08);
        }

        .animated-board {
          overflow-x: auto;
          animation: fadeUp 0.5s ease;
        }

        @media (max-width: 900px) {
          .dropdown-panel {
            max-width: 100%;
          }

          .dropdown-item {
            padding: 12px 14px;
          }

          .dropdown-club {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}