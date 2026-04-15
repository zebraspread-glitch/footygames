"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import playersData from "../data/afl_players26.json";

const MAX_GUESSES = 6;
const MAX_CLUES = 6;
const STORAGE_KEY = "guess-the-team-state-v6";

type PlayerRecord = {
  id?: string | number;
  name?: string;
  player?: string;
  full_name?: string;
  fullName?: string;
  team?: string;
  club?: string;
  Team?: string;
  pos?: string | string[];
  position?: string | string[];
  Pos?: string | string[];
  Position?: string | string[];
  [key: string]: unknown;
};

type CluePlayer = {
  name: string;
  team: string;
  pos: string;
  initials: string;
};

type TeamPool = {
  all: CluePlayer[];
  fwd: CluePlayer[];
  mid: CluePlayer[];
  def: CluePlayer[];
  ruck: CluePlayer[];
};

type TeamPools = Record<string, TeamPool>;

type RoundData = {
  answer: string;
  orderedClues: CluePlayer[];
};

type FlashState = "idle" | "good" | "bad";
type RoleType = "FWD" | "MID" | "DEF" | "RUCK";

const TEAM_ALIASES: Record<string, string> = {
  "Adelaide Crows": "Adelaide",
  Adelaide: "Adelaide",
  "Brisbane Lions": "Brisbane",
  Brisbane: "Brisbane",
  Carlton: "Carlton",
  Collingwood: "Collingwood",
  Essendon: "Essendon",
  Fremantle: "Fremantle",
  Geelong: "Geelong",
  "Geelong Cats": "Geelong",
  "Gold Coast Suns": "Gold Coast",
  "Gold Coast": "Gold Coast",
  GWS: "GWS",
  "Greater Western Sydney": "GWS",
  Hawthorn: "Hawthorn",
  Melbourne: "Melbourne",
  "North Melbourne": "North Melbourne",
  Kangaroos: "North Melbourne",
  "Port Adelaide": "Port Adelaide",
  Richmond: "Richmond",
  "St Kilda": "St Kilda",
  Sydney: "Sydney",
  "Sydney Swans": "Sydney",
  "West Coast": "West Coast",
  "West Coast Eagles": "West Coast",
  "Western Bulldogs": "Western Bulldogs",
  Bulldogs: "Western Bulldogs",
};

const TEAM_ICONS: Record<string, string> = {
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

function normaliseTeamName(team: string): string {
  if (!team) return "";
  return TEAM_ALIASES[team] || team;
}

function getTeamIcon(team: string): string {
  const normalised = normaliseTeamName(team);
  return TEAM_ICONS[normalised] || "/favicon.ico";
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() || "?";
  return `${parts[0]?.[0] || ""}${parts[parts.length - 1]?.[0] || ""}`.toUpperCase();
}

function getPlayerName(player: PlayerRecord): string {
  return String(player.name || player.player || player.full_name || player.fullName || "").trim();
}

function getPlayerTeam(player: PlayerRecord): string {
  return normaliseTeamName(String(player.team || player.club || player.Team || "").trim());
}

function normalisePosValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(" ")
      .toUpperCase();
  }

  if (typeof value === "string") {
    return value.toUpperCase();
  }

  return "";
}

function getPlayerPos(player: PlayerRecord): string {
  return normalisePosValue(player.pos ?? player.position ?? player.Pos ?? player.Position ?? "");
}

function isForward(pos: string): boolean {
  return pos.includes("F");
}

function isMid(pos: string): boolean {
  return pos.includes("M") || pos.includes("W") || pos.includes("C");
}

function isDefender(pos: string): boolean {
  return pos.includes("B") || pos.includes("D");
}

function isRuck(pos: string): boolean {
  return pos.includes("R");
}

function getRoleType(pos: string): RoleType {
  if (isRuck(pos)) return "RUCK";
  if (isForward(pos)) return "FWD";
  if (isDefender(pos)) return "DEF";
  return "MID";
}

function getRoleColors(role: RoleType) {
  if (role === "FWD") {
    return {
      border: "#3b82f6",
      bg: "#eff6ff",
      pillBg: "#2563eb",
      pillText: "#ffffff",
    };
  }

  if (role === "MID") {
    return {
      border: "#22c55e",
      bg: "#f0fdf4",
      pillBg: "#16a34a",
      pillText: "#ffffff",
    };
  }

  if (role === "DEF") {
    return {
      border: "#a855f7",
      bg: "#faf5ff",
      pillBg: "#9333ea",
      pillText: "#ffffff",
    };
  }

  return {
    border: "#f97316",
    bg: "#fff7ed",
    pillBg: "#ea580c",
    pillText: "#ffffff",
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildTeamPool(allPlayers: PlayerRecord[]): TeamPools {
  const byTeam: TeamPools = {};

  for (const rawPlayer of allPlayers) {
    const name = getPlayerName(rawPlayer);
    const team = getPlayerTeam(rawPlayer);
    const pos = getPlayerPos(rawPlayer);

    if (!name || !team || !pos) continue;

    if (!byTeam[team]) {
      byTeam[team] = {
        all: [],
        fwd: [],
        mid: [],
        def: [],
        ruck: [],
      };
    }

    const player: CluePlayer = {
      name,
      team,
      pos,
      initials: getInitials(name),
    };

    byTeam[team].all.push(player);
    if (isForward(pos)) byTeam[team].fwd.push(player);
    if (isMid(pos)) byTeam[team].mid.push(player);
    if (isDefender(pos)) byTeam[team].def.push(player);
    if (isRuck(pos)) byTeam[team].ruck.push(player);
  }

  return byTeam;
}

function createRound(teamPools: TeamPools): RoundData | null {
  const validTeams = Object.entries(teamPools)
    .filter(([, data]) => {
      const uniqueNames = new Set(data.all.map((p) => p.name));
      return (
        data.fwd.length > 0 &&
        data.mid.length > 0 &&
        data.def.length > 0 &&
        data.ruck.length > 0 &&
        uniqueNames.size >= 8
      );
    })
    .map(([team]) => team);

  if (validTeams.length === 0) return null;

  const team = pickRandom(validTeams);
  const pool = teamPools[team];
  const used = new Set<string>();

  function takeUnique(list: CluePlayer[]): CluePlayer | null {
    const options = shuffle(list).filter((p) => !used.has(p.name));
    if (options.length === 0) return null;
    const player = options[0];
    used.add(player.name);
    return player;
  }

  const starter = takeUnique(pool.all);
  const fwd = takeUnique(pool.fwd);
  const mid = takeUnique(pool.mid);
  const def = takeUnique(pool.def);
  const ruck = takeUnique(pool.ruck);
  const extra = takeUnique(pool.all.filter((p) => !used.has(p.name)));

  const orderedClues = [starter, fwd, mid, def, ruck, extra].filter(Boolean) as CluePlayer[];

  if (orderedClues.length < MAX_CLUES) return null;

  return {
    answer: team,
    orderedClues: orderedClues.slice(0, MAX_CLUES),
  };
}

function getVisibleClues(round: RoundData, guessesUsed: number): CluePlayer[] {
  const clueCount = Math.min(1 + guessesUsed, MAX_CLUES);
  return round.orderedClues.slice(0, clueCount);
}

export default function GuessTheTeamPage() {
  const typedPlayers = playersData as PlayerRecord[];

  const teamPools = useMemo(() => buildTeamPool(typedPlayers), [typedPlayers]);
  const teamList = useMemo(
    () => Object.keys(teamPools).sort((a, b) => a.localeCompare(b)),
    [teamPools]
  );

  const [round, setRound] = useState<RoundData | null>(null);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [flash, setFlash] = useState<FlashState>("idle");
  const [shakeInput, setShakeInput] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  function saveMeta(next: { gamesPlayed?: number }) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      const merged = {
        gamesPlayed: typeof next.gamesPlayed === "number" ? next.gamesPlayed : prev.gamesPlayed || 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  }

  function startNewGame() {
    let nextRound: RoundData | null = null;

    for (let i = 0; i < 20; i += 1) {
      nextRound = createRound(teamPools);
      if (nextRound) break;
    }

    setRound(nextRound);
    setGuess("");
    setGuesses([]);
    setStatus("playing");
    setShowSuggestions(false);
    setDropdownVisible(false);
    setHighlightedIndex(0);
    setFlash("idle");
    setShakeInput(false);
    setModalOpen(false);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.gamesPlayed === "number") setGamesPlayed(parsed.gamesPlayed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (Object.keys(teamPools).length > 0) {
      startNewGame();
    }
  }, [teamPools]);

  const filteredSuggestions = useMemo(() => {
    const query = guess.trim().toLowerCase();
    const alreadyGuessed = new Set(guesses.map((g) => g.toLowerCase()));
    const list = !query ? teamList : teamList.filter((team) => team.toLowerCase().includes(query));
    return list.filter((team) => !alreadyGuessed.has(team.toLowerCase())).slice(0, 18);
  }, [guess, teamList, guesses]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [guess]);

  useEffect(() => {
    if (status === "playing" && showSuggestions && filteredSuggestions.length > 0) {
      setDropdownVisible(true);
      return;
    }

    const timeout = window.setTimeout(() => {
      setDropdownVisible(false);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [showSuggestions, filteredSuggestions.length, status]);

  function triggerBadFeedback() {
    setFlash("bad");
    setShakeInput(true);
    window.setTimeout(() => setShakeInput(false), 350);
    window.setTimeout(() => setFlash("idle"), 500);
  }

  function triggerGoodFeedback() {
    setFlash("good");
    window.setTimeout(() => setFlash("idle"), 700);
  }

  function finishGame(nextStatus: "won" | "lost", nextGuesses: string[]) {
    const nextGames = gamesPlayed + 1;
    setStatus(nextStatus);
    setGamesPlayed(nextGames);
    saveMeta({ gamesPlayed: nextGames });
    setModalOpen(true);

    if (nextStatus === "won") {
      triggerGoodFeedback();
    } else {
      triggerBadFeedback();
    }

    setGuesses(nextGuesses);
    setGuess("");
    setShowSuggestions(false);
  }

  function submitGuess(selectedTeam?: string) {
    if (!round || status !== "playing") return;

    const cleanGuess = normaliseTeamName((selectedTeam ?? guess).trim());
    if (!cleanGuess) return;

    const alreadyGuessed = guesses.some((g) => g.toLowerCase() === cleanGuess.toLowerCase());
    if (alreadyGuessed) {
      setGuess("");
      setShowSuggestions(false);
      triggerBadFeedback();
      return;
    }

    const isCorrect = cleanGuess.toLowerCase() === round.answer.toLowerCase();

    if (isCorrect) {
      const nextGuesses = [cleanGuess, ...guesses];
      finishGame("won", nextGuesses);
      return;
    }

    const nextGuesses = [cleanGuess, ...guesses];

    if (nextGuesses.length >= MAX_GUESSES) {
      finishGame("lost", nextGuesses);
      return;
    }

    setGuesses(nextGuesses);
    setGuess("");
    setShowSuggestions(false);
    triggerBadFeedback();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitGuess();
  }

  function handleSuggestionPick(team: string) {
    setGuess(team);
    setShowSuggestions(false);
    setHighlightedIndex(0);
    submitGuess(team);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.max(filteredSuggestions.length - 1, 0)));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && filteredSuggestions[highlightedIndex]) {
        handleSuggestionPick(filteredSuggestions[highlightedIndex]);
      } else {
        submitGuess();
      }
      return;
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  if (!round) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.loadingBox}>
            <h1 style={styles.loadingTitle}>Guess the AFL team</h1>
            <p style={styles.loadingText}>Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  const shownClues = getVisibleClues(round, guesses.length);
  const remainingGuesses = MAX_GUESSES - guesses.length;
  const gameOver = status === "won" || status === "lost";

  return (
    <main
      style={{
        ...styles.page,
        ...(flash === "good" ? styles.pageGood : {}),
        ...(flash === "bad" ? styles.pageBad : {}),
      }}
    >
      <div style={styles.wrap}>
        <div style={styles.kicker}>GUESS THE TEAM</div>
        <h1 style={styles.title}>Find the hidden AFL team</h1>

        <form onSubmit={handleSubmit} style={styles.searchRow}>
          <div
            style={{
              ...styles.inputOuter,
              ...(shakeInput ? styles.inputOuterShake : {}),
            }}
          >
            <div style={styles.hashBox}>#</div>

            <div style={styles.inputWrap}>
              <input
                ref={inputRef}
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 100);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Enter a team..."
                style={styles.input}
                autoComplete="off"
                disabled={gameOver}
              />

              {guess && !gameOver && (
                <button
                  type="button"
                  onClick={() => {
                    setGuess("");
                    inputRef.current?.focus();
                  }}
                  style={styles.clearButton}
                >
                  ×
                </button>
              )}

              {dropdownVisible && filteredSuggestions.length > 0 && !gameOver && (
                <div className={`team-dropdown ${showSuggestions ? "open" : "closing"}`}>
                  {filteredSuggestions.map((team, index) => {
                    const active = index === highlightedIndex;
                    return (
                      <button
                        key={team}
                        type="button"
                        className={`team-option ${active ? "active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSuggestionPick(team)}
                        style={{ animationDelay: `${index * 16}ms` }}
                      >
                        <div className="team-option-left">
                          <img
                            src={getTeamIcon(team)}
                            alt={team}
                            className="team-option-icon"
                          />
                          <span className="team-option-name">{team}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {!gameOver ? (
            <button style={styles.actionButton} type="submit">
              Guess
            </button>
          ) : (
            <button onClick={startNewGame} style={styles.actionButton} type="button">
              New Game
            </button>
          )}
        </form>

        <section style={styles.infoBar}>
          <span>Guesses: {guesses.length}</span>
          <span>Left: {remainingGuesses}</span>
          <span>Games: {gamesPlayed}</span>
          <span>Clues: {shownClues.length}/6</span>
        </section>

        <section style={styles.cardsBox}>
          <div style={styles.clueGrid}>
            {shownClues.map((player, index) => {
              const role = getRoleType(player.pos);
              const roleColors = getRoleColors(role);

              return (
                <div
                  key={`${player.name}-${index}`}
                  className="clue-card"
                  style={{
                    ...styles.clueCard,
                    background: roleColors.bg,
                    borderColor: roleColors.border,
                  }}
                >
                  <div style={styles.clueTop}>
                    <span
                      style={{
                        ...styles.rolePill,
                        background: roleColors.pillBg,
                        color: roleColors.pillText,
                      }}
                    >
                      {role}
                    </span>
                  </div>

                  <div style={styles.initials}>{player.initials}</div>

                  <div style={styles.clueBottom}>
                    {gameOver ? (
                      <span style={styles.revealedName}>{player.name}</span>
                    ) : (
                      <span style={styles.clueHint}>Player clue</span>
                    )}
                  </div>
                </div>
              );
            })}

            {Array.from({ length: Math.max(0, MAX_CLUES - shownClues.length) }).map((_, index) => (
              <div key={`locked-${index}`} style={styles.lockedCard}>
                <div style={styles.lockedQuestion}>?</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.guessesBox}>
          {guesses.length === 0 ? (
            <div style={styles.emptyGuessRow}>
              <div style={styles.emptyGuessSquare}>-</div>
              <div>
                <div style={styles.emptyGuessTitle}>No guesses yet</div>
                <div style={styles.emptyGuessText}>Start guessing the hidden AFL team.</div>
              </div>
            </div>
          ) : (
            guesses.map((item, index) => {
              const correct = item.toLowerCase() === round.answer.toLowerCase();

              return (
                <div
                  key={`${item}-${index}`}
                  style={{
                    ...styles.guessRow,
                    borderColor: correct ? "#16a34a" : "#dc2626",
                    background: correct ? "#ecfdf5" : "#fef2f2",
                  }}
                >
                  <div style={styles.guessLeft}>
                    {gameOver && (
                      <img
                        src={getTeamIcon(item)}
                        alt={item}
                        style={styles.guessIcon}
                      />
                    )}
                    <span style={styles.guessName}>{item}</span>
                  </div>
                  <span
                    style={{
                      ...styles.guessResult,
                      color: correct ? "#15803d" : "#dc2626",
                    }}
                  >
                    {correct ? "CORRECT" : "WRONG"}
                  </span>
                </div>
              );
            })
          )}
        </section>
      </div>

      {modalOpen && (
        <div style={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setModalOpen(false)} type="button">
              ×
            </button>

            <div style={styles.modalTop}>
              <div style={styles.modalLogoCircle}>
                <img
                  src={getTeamIcon(round.answer)}
                  alt={round.answer}
                  style={styles.modalLogo}
                />
              </div>
            </div>

            <div
              style={{
                ...styles.modalBottom,
                borderBottom: status === "won" ? "10px solid #22c55e" : "10px solid #dc2626",
              }}
            >
              <div style={styles.modalStatus}>
                {status === "won" ? "Correct!" : "Out of guesses!"}
              </div>

              <div style={styles.modalAnswer}>
                {round.answer.toUpperCase()}
              </div>

              <div style={styles.modalSubtext}>
                {status === "won" ? (
                  <>
                    You solved it in <span style={styles.modalHighlightGood}>{guesses.length}</span> guesses
                  </>
                ) : (
                  <>
                    The answer was <span style={styles.modalHighlightBad}>{round.answer}</span>
                  </>
                )}
              </div>

              <button style={styles.modalDoneButton} onClick={() => setModalOpen(false)} type="button">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .team-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          z-index: 20;
          background: #f7f2e8;
          border: 4px solid #2a114b;
          max-height: 240px;
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow: 0 8px 0 rgba(42, 17, 75, 0.12);
          scrollbar-width: thin;
          scrollbar-color: #6b4ba8 #f7f2e8;
        }

        .team-dropdown::-webkit-scrollbar {
          width: 10px;
        }

        .team-dropdown::-webkit-scrollbar-track {
          background: #f7f2e8;
        }

        .team-dropdown::-webkit-scrollbar-thumb {
          background: #6b4ba8;
          border: 2px solid #f7f2e8;
        }

        .team-dropdown.open {
          animation: dropdownIn 0.14s ease-out;
        }

        .team-dropdown.closing {
          animation: dropdownOut 0.1s ease-in forwards;
          pointer-events: none;
        }

        .team-option {
          width: 100%;
          border: 0;
          border-top: 3px solid #2a114b;
          background: #f7f2e8;
          color: #2a114b;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          text-align: left;
          cursor: pointer;
          font-weight: 900;
          transition: background 0.12s ease, transform 0.12s ease;
          opacity: 0;
          transform: translateY(-4px);
          animation: itemIn 0.18s ease forwards;
        }

        .team-option:first-child {
          border-top: none;
        }

        .team-option:hover,
        .team-option.active {
          background: #efe7d7;
        }

        .team-option-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .team-option-icon {
          width: 28px;
          height: 28px;
          object-fit: contain;
          flex: 0 0 28px;
        }

        .team-option-name {
          font-size: 1rem;
          font-weight: 900;
          color: #2a114b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .clue-card {
          opacity: 0;
          transform: translateY(6px);
          animation: clueIn 0.2s ease forwards;
        }

        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes dropdownOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes itemIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes clueIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes inputShake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-4px);
          }
          50% {
            transform: translateX(4px);
          }
          75% {
            transform: translateX(-3px);
          }
        }

        @media (max-width: 900px) {
          .team-option-name {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4efe3",
    backgroundImage: "radial-gradient(rgba(42,17,75,0.08) 1px, transparent 1px)",
    backgroundSize: "14px 14px",
    color: "#2a114b",
    padding: "24px 16px 60px",
    fontFamily: "Inter, Arial, sans-serif",
    transition: "background-color 0.2s ease",
  },
  pageGood: {
    backgroundColor: "#edfdf1",
  },
  pageBad: {
    backgroundColor: "#fff1f1",
  },
  wrap: {
    width: "100%",
    maxWidth: "1160px",
    margin: "0 auto",
  },
  kicker: {
    fontSize: "0.95rem",
    fontWeight: 900,
    letterSpacing: "0.14em",
    color: "#4b5563",
    marginBottom: "10px",
  },
  title: {
    margin: "0 0 20px",
    fontSize: "clamp(2.5rem, 6vw, 4.4rem)",
    lineHeight: 0.95,
    fontWeight: 1000,
    letterSpacing: "-0.04em",
    color: "#1d0b38",
  },
  searchRow: {
    display: "grid",
    gridTemplateColumns: "1fr 170px",
    gap: "14px",
    alignItems: "start",
    marginBottom: "16px",
  },
  inputOuter: {
    minHeight: "74px",
    border: "4px solid #2a114b",
    background: "#f7f2e8",
    display: "grid",
    gridTemplateColumns: "72px 1fr",
  },
  inputOuterShake: {
    animation: "inputShake 0.35s ease",
  },
  hashBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "4px solid #2a114b",
    fontSize: "2rem",
    fontWeight: 1000,
    color: "#1d0b38",
    background: "#fffaf0",
  },
  inputWrap: {
    position: "relative",
    minWidth: 0,
  },
  input: {
    width: "100%",
    height: "100%",
    minHeight: "66px",
    border: "none",
    background: "transparent",
    color: "#2a114b",
    padding: "0 46px 0 18px",
    fontSize: "1.1rem",
    fontWeight: 800,
    outline: "none",
  },
  clearButton: {
    position: "absolute",
    top: "50%",
    right: "12px",
    transform: "translateY(-50%)",
    width: "28px",
    height: "28px",
    border: "none",
    background: "#2a114b",
    color: "#fff",
    borderRadius: "999px",
    fontSize: "1rem",
    fontWeight: 900,
    cursor: "pointer",
  },
  actionButton: {
    minHeight: "74px",
    border: "4px solid #2a114b",
    background: "#fffaf0",
    color: "#2a114b",
    fontWeight: 1000,
    fontSize: "1.1rem",
    cursor: "pointer",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
  infoBar: {
    border: "4px solid #2a114b",
    background: "#ded7c8",
    padding: "14px 18px",
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    fontWeight: 900,
    fontSize: "1rem",
    marginBottom: "16px",
  },
  cardsBox: {
    border: "4px solid #2a114b",
    background: "#f0eadf",
    padding: "18px",
    marginBottom: "16px",
  },
  clueGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "14px",
  },
  clueCard: {
    minHeight: "160px",
    border: "4px solid #2a114b",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  clueTop: {
    display: "flex",
    justifyContent: "flex-end",
  },
  rolePill: {
    fontSize: "0.8rem",
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: "999px",
    letterSpacing: "0.06em",
  },
  initials: {
    textAlign: "center",
    fontSize: "clamp(2.2rem, 6vw, 3.4rem)",
    fontWeight: 1000,
    letterSpacing: "0.06em",
    color: "#1d0b38",
    lineHeight: 1,
  },
  clueBottom: {
    textAlign: "center",
    minHeight: "22px",
  },
  clueHint: {
    fontSize: "0.85rem",
    fontWeight: 800,
    color: "#5b5568",
  },
  revealedName: {
    fontSize: "0.85rem",
    fontWeight: 900,
    color: "#1d0b38",
    lineHeight: 1.2,
  },
  lockedCard: {
    minHeight: "160px",
    border: "4px dashed #b7adcb",
    background: "#f8f4ec",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedQuestion: {
    textAlign: "center",
    fontSize: "3rem",
    fontWeight: 1000,
    color: "#9aa1ad",
    lineHeight: 1,
  },
  guessesBox: {
    border: "4px solid #2a114b",
    background: "#f0eadf",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  emptyGuessRow: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
  },
  emptyGuessSquare: {
    width: "54px",
    height: "54px",
    border: "4px solid #2a114b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.4rem",
    fontWeight: 1000,
    color: "#2a114b",
    background: "#fffaf0",
    flex: "0 0 54px",
  },
  emptyGuessTitle: {
    fontSize: "1rem",
    fontWeight: 1000,
    color: "#1d0b38",
    marginBottom: "4px",
  },
  emptyGuessText: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#5b5568",
  },
  guessRow: {
    border: "4px solid #2a114b",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  guessLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  guessIcon: {
    width: "24px",
    height: "24px",
    objectFit: "contain",
    flex: "0 0 24px",
  },
  guessName: {
    fontSize: "1rem",
    fontWeight: 1000,
    color: "#1d0b38",
  },
  guessResult: {
    fontSize: "0.9rem",
    fontWeight: 1000,
    letterSpacing: "0.08em",
  },
  loadingBox: {
    marginTop: "60px",
    border: "4px solid #2a114b",
    background: "#fffaf0",
    padding: "28px",
  },
  loadingTitle: {
    margin: 0,
    fontSize: "2rem",
    fontWeight: 1000,
    color: "#1d0b38",
  },
  loadingText: {
    marginTop: "10px",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#5b5568",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(24, 14, 44, 0.42)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 200,
  },
  modalCard: {
    width: "100%",
    maxWidth: "680px",
    background: "#e9e1d2",
    border: "5px solid #2a114b",
    boxShadow: "8px 8px 0 rgba(42,17,75,0.20)",
    position: "relative",
    overflow: "hidden",
  },
  modalClose: {
    position: "absolute",
    top: "16px",
    right: "18px",
    width: "34px",
    height: "34px",
    border: "none",
    background: "transparent",
    color: "#6b6b6b",
    fontSize: "2rem",
    lineHeight: 1,
    fontWeight: 900,
    cursor: "pointer",
  },
  modalTop: {
    minHeight: "230px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderBottom: "4px solid #2a114b",
    padding: "28px 24px",
  },
  modalLogoCircle: {
    width: "164px",
    height: "164px",
    borderRadius: "999px",
    border: "4px solid #2a114b",
    background: "#f8f8f8",
    boxShadow: "6px 6px 0 rgba(42,17,75,0.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLogo: {
    width: "92px",
    height: "92px",
    objectFit: "contain",
  },
  modalBottom: {
    padding: "38px 26px 42px",
    textAlign: "center",
  },
  modalStatus: {
    fontSize: "1rem",
    fontWeight: 900,
    color: "#1d0b38",
    marginBottom: "16px",
  },
  modalAnswer: {
    fontSize: "clamp(2.3rem, 7vw, 4.2rem)",
    lineHeight: 0.92,
    fontWeight: 1000,
    color: "#1b123d",
    textTransform: "uppercase",
    letterSpacing: "-0.04em",
    textShadow: "4px 4px 0 rgba(120, 95, 40, 0.20)",
    marginBottom: "20px",
    whiteSpace: "pre-wrap",
  },
  modalSubtext: {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#2a114b",
    marginBottom: "24px",
  },
  modalHighlightGood: {
    color: "#22c55e",
    fontWeight: 1000,
  },
  modalHighlightBad: {
    color: "#dc2626",
    fontWeight: 1000,
  },
  modalDoneButton: {
    minWidth: "140px",
    height: "72px",
    border: "4px solid #2a114b",
    background: "#f2f2f2",
    color: "#2a114b",
    fontWeight: 1000,
    fontSize: "1.1rem",
    cursor: "pointer",
    boxShadow: "4px 4px 0 rgba(42,17,75,0.18)",
  },
};