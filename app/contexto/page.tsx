"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import playersRaw from "@/app/data/afl_players26.json";

type RawPlayer = Record<string, unknown>;

type Mode = "daily" | "unlimited";

type Player = {
  id: string;
  name: string;
  team: string;
  position: string;
  state: string;
  age: number;
  number: number;
  disposals: number;
  goals: number;
};

type GuessResult = {
  id: string;
  name: string;
  team: string;
  rank: number;
  closeness: number;
};

type SavedGame = {
  guesses?: GuessResult[];
  won?: boolean;
  gaveUp?: boolean;
  secretId?: string;
};

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getFirstString(obj: RawPlayer, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    const str = asString(value);
    if (str) return str;
  }
  return "";
}

function getFirstNumber(obj: RawPlayer, keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    const num = asNumber(value);
    if (Number.isFinite(num) && num !== 0) return num;
  }
  return 0;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeamName(team: string): string {
  return team
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTeamIconPath(team: string): string {
  const normalized = normalizeTeamName(team);

  const teamMap: Record<string, string> = {
    adelaide: "/team-icons/adelaide.png",
    "adelaide crows": "/team-icons/adelaide.png",

    brisbane: "/team-icons/brisbane.png",
    "brisbane lions": "/team-icons/brisbane.png",

    carlton: "/team-icons/carlton.png",
    blues: "/team-icons/carlton.png",

    collingwood: "/team-icons/collingwood.png",
    magpies: "/team-icons/collingwood.png",

    essendon: "/team-icons/essendon.png",
    bombers: "/team-icons/essendon.png",

    fremantle: "/team-icons/fremantle.png",
    dockers: "/team-icons/fremantle.png",

    geelong: "/team-icons/geelong.png",
    "geelong cats": "/team-icons/geelong.png",
    cats: "/team-icons/geelong.png",

    goldcoast: "/team-icons/goldcoast.png",
    "gold coast": "/team-icons/goldcoast.png",
    "gold coast suns": "/team-icons/goldcoast.png",
    suns: "/team-icons/goldcoast.png",

    gws: "/team-icons/gws.png",
    giants: "/team-icons/gws.png",
    "greater western sydney": "/team-icons/gws.png",
    "greater western sydney giants": "/team-icons/gws.png",

    hawthorn: "/team-icons/hawthorn.png",
    hawks: "/team-icons/hawthorn.png",

    melbourne: "/team-icons/melbourne.png",
    demons: "/team-icons/melbourne.png",

    northmelbourne: "/team-icons/northmelbourne.png",
    "north melbourne": "/team-icons/northmelbourne.png",
    kangaroos: "/team-icons/northmelbourne.png",

    portadelaide: "/team-icons/portadelaide.png",
    "port adelaide": "/team-icons/portadelaide.png",
    power: "/team-icons/portadelaide.png",

    richmond: "/team-icons/richmond.png",
    tigers: "/team-icons/richmond.png",

    stkilda: "/team-icons/stkilda.png",
    "st kilda": "/team-icons/stkilda.png",
    saints: "/team-icons/stkilda.png",

    sydney: "/team-icons/sydney.png",
    swans: "/team-icons/sydney.png",

    westcoast: "/team-icons/westcoast.png",
    "west coast": "/team-icons/westcoast.png",
    eagles: "/team-icons/westcoast.png",

    westernbulldogs: "/team-icons/westernbulldogs.png",
    "western bulldogs": "/team-icons/westernbulldogs.png",
    bulldogs: "/team-icons/westernbulldogs.png",
  };

  if (teamMap[normalized]) return teamMap[normalized];

  const compact = normalized.replace(/\s+/g, "");
  if (teamMap[compact]) return teamMap[compact];

  return "/team-icons/afl.png";
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function similarityToTarget(
  guess: Player,
  target: Player,
  ranges: {
    age: number;
    number: number;
    disposals: number;
    goals: number;
  }
) {
  let score = 0;

  // Team still matters a bit, but much less than before.
  if (guess.team && guess.team === target.team) score += 8;
  if (guess.position && guess.position === target.position) score += 24;
  if (guess.state && guess.state === target.state) score += 10;

  const ageScore =
    ranges.age === 0
      ? 16
      : 16 * (1 - Math.min(Math.abs(guess.age - target.age) / ranges.age, 1));

  const numberScore =
    ranges.number === 0
      ? 16
      : 16 *
        (1 - Math.min(Math.abs(guess.number - target.number) / ranges.number, 1));

  const disposalsScore =
    ranges.disposals === 0
      ? 18
      : 18 *
        (1 -
          Math.min(
            Math.abs(guess.disposals - target.disposals) / ranges.disposals,
            1
          ));

  const goalsScore =
    ranges.goals === 0
      ? 14
      : 14 * (1 - Math.min(Math.abs(guess.goals - target.goals) / ranges.goals, 1));

  score += ageScore + numberScore + disposalsScore + goalsScore;

  return Math.round(score * 100) / 100;
}

export default function ContextoPage() {
  const players = useMemo<Player[]>(() => {
    const rawArray = Array.isArray(playersRaw) ? (playersRaw as RawPlayer[]) : [];

    return rawArray
      .map((player, index) => {
        const name = getFirstString(player, [
          "name",
          "player_name",
          "player",
          "full_name",
        ]);

        const team = getFirstString(player, ["team", "club"]);
        const position = getFirstString(player, ["position", "pos"]);
        const state = getFirstString(player, ["state"]);
        const age = getFirstNumber(player, ["age"]);
        const number = getFirstNumber(player, [
          "number",
          "jumper",
          "guernsey",
          "guernsey_number",
          "jumper_number",
        ]);
        const disposals = getFirstNumber(player, [
          "disposals",
          "avg_disposals",
          "disposals_average",
        ]);
        const goals = getFirstNumber(player, ["goals", "avg_goals"]);

        return {
          id: `${normalizeName(name)}-${index}`,
          name,
          team,
          position,
          state,
          age,
          number,
          disposals,
          goals,
        };
      })
      .filter((player) => player.name.length > 0);
  }, []);

  const playersByNormalizedName = useMemo(() => {
    const map = new Map<string, Player>();
    for (const player of players) {
      map.set(normalizeName(player.name), player);
    }
    return map;
  }, [players]);

  const ranges = useMemo(() => {
    const ages = players.map((p) => p.age);
    const numbers = players.map((p) => p.number);
    const disposals = players.map((p) => p.disposals);
    const goals = players.map((p) => p.goals);

    return {
      age: Math.max(...ages, 0) - Math.min(...ages, 0),
      number: Math.max(...numbers, 0) - Math.min(...numbers, 0),
      disposals: Math.max(...disposals, 0) - Math.min(...disposals, 0),
      goals: Math.max(...goals, 0) - Math.min(...goals, 0),
    };
  }, [players]);

  const todayKey = getTodayKey();
  const dailyStorageKey = `afl-contexto-daily-${todayKey}`;
  const unlimitedStorageKey = "afl-contexto-unlimited";
  const modeStorageKey = "afl-contexto-mode";

  const [mode, setMode] = useState<Mode>("daily");
  const [inputValue, setInputValue] = useState("");
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [won, setWon] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [unlimitedSeed, setUnlimitedSeed] = useState<string>("initial-seed");
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const dailySecretPlayer = useMemo(() => {
    if (players.length === 0) return null;
    const index = hashString(todayKey) % players.length;
    return players[index];
  }, [players, todayKey]);

  const unlimitedSecretPlayer = useMemo(() => {
    if (players.length === 0) return null;
    const index = hashString(unlimitedSeed) % players.length;
    return players[index];
  }, [players, unlimitedSeed]);

  const secretPlayer = mode === "daily" ? dailySecretPlayer : unlimitedSecretPlayer;

  const rankedList = useMemo(() => {
    if (!secretPlayer) return [];
    return [...players]
      .map((player) => ({
        player,
        score: similarityToTarget(player, secretPlayer, ranges),
      }))
      .sort((a, b) => b.score - a.score);
  }, [players, secretPlayer, ranges]);

  const rankMap = useMemo(() => {
    const map = new Map<string, { rank: number; closeness: number }>();
    rankedList.forEach((entry, index) => {
      map.set(entry.player.id, {
        rank: index + 1,
        closeness: entry.score,
      });
    });
    return map;
  }, [rankedList]);

  useEffect(() => {
    const savedMode = localStorage.getItem(modeStorageKey);
    if (savedMode === "daily" || savedMode === "unlimited") {
      setMode(savedMode);
    }

    const savedDailyRaw = localStorage.getItem(dailyStorageKey);
    const savedUnlimitedRaw = localStorage.getItem(unlimitedStorageKey);

    if (savedUnlimitedRaw) {
      try {
        const savedUnlimited = JSON.parse(savedUnlimitedRaw) as SavedGame;
        if (savedUnlimited.secretId) {
          setUnlimitedSeed(savedUnlimited.secretId);
        } else {
          setUnlimitedSeed(`unlimited-${Date.now()}`);
        }
      } catch {
        setUnlimitedSeed(`unlimited-${Date.now()}`);
      }
    } else {
      setUnlimitedSeed(`unlimited-${Date.now()}`);
    }

    if (savedMode === "unlimited" && savedUnlimitedRaw) {
      try {
        const parsed = JSON.parse(savedUnlimitedRaw) as SavedGame;
        setGuesses(Array.isArray(parsed.guesses) ? parsed.guesses : []);
        setWon(Boolean(parsed.won));
        setGaveUp(Boolean(parsed.gaveUp));
      } catch {
        setGuesses([]);
        setWon(false);
        setGaveUp(false);
      }
    } else if (savedDailyRaw) {
      try {
        const parsed = JSON.parse(savedDailyRaw) as SavedGame;
        setGuesses(Array.isArray(parsed.guesses) ? parsed.guesses : []);
        setWon(Boolean(parsed.won));
        setGaveUp(Boolean(parsed.gaveUp));
      } catch {
        setGuesses([]);
        setWon(false);
        setGaveUp(false);
      }
    }

    setLoaded(true);
  }, [dailyStorageKey]);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(modeStorageKey, mode);

    if (mode === "daily") {
      const raw = localStorage.getItem(dailyStorageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as SavedGame;
          setGuesses(Array.isArray(parsed.guesses) ? parsed.guesses : []);
          setWon(Boolean(parsed.won));
          setGaveUp(Boolean(parsed.gaveUp));
        } catch {
          setGuesses([]);
          setWon(false);
          setGaveUp(false);
        }
      } else {
        setGuesses([]);
        setWon(false);
        setGaveUp(false);
      }
    } else {
      const raw = localStorage.getItem(unlimitedStorageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as SavedGame;
          if (parsed.secretId && parsed.secretId !== unlimitedSeed) {
            setUnlimitedSeed(parsed.secretId);
            return;
          }
          setGuesses(Array.isArray(parsed.guesses) ? parsed.guesses : []);
          setWon(Boolean(parsed.won));
          setGaveUp(Boolean(parsed.gaveUp));
        } catch {
          setGuesses([]);
          setWon(false);
          setGaveUp(false);
        }
      } else {
        setGuesses([]);
        setWon(false);
        setGaveUp(false);
      }
    }

    setInputValue("");
    setShowSuggestions(false);
    setShowModal(false);
  }, [mode, loaded, dailyStorageKey, unlimitedSeed]);

  useEffect(() => {
    if (!loaded) return;

    if (mode === "daily") {
      localStorage.setItem(
        dailyStorageKey,
        JSON.stringify({
          guesses,
          won,
          gaveUp,
          secretId: dailySecretPlayer?.id,
        } satisfies SavedGame)
      );
    } else {
      localStorage.setItem(
        unlimitedStorageKey,
        JSON.stringify({
          guesses,
          won,
          gaveUp,
          secretId: unlimitedSeed,
        } satisfies SavedGame)
      );
    }
  }, [
    guesses,
    won,
    gaveUp,
    mode,
    loaded,
    dailyStorageKey,
    unlimitedStorageKey,
    dailySecretPlayer?.id,
    unlimitedSeed,
  ]);

  const filteredSuggestions = useMemo(() => {
    const query = normalizeName(inputValue);

    const alreadyGuessed = new Set(
      guesses.map((guess) => normalizeName(guess.name))
    );

    const filtered = !query
      ? players.slice(0, 8)
      : players.filter((player) => normalizeName(player.name).includes(query));

    return filtered
      .filter((player) => !alreadyGuessed.has(normalizeName(player.name)))
      .slice(0, 8);
  }, [inputValue, players, guesses]);

  const unlimitedGameEnded = mode === "unlimited" && (won || gaveUp);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  useEffect(() => {
    if (!won && !gaveUp && showSuggestions && filteredSuggestions.length > 0) {
      setDropdownVisible(true);
      return;
    }

    const timeout = window.setTimeout(() => {
      setDropdownVisible(false);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [showSuggestions, filteredSuggestions.length, won, gaveUp]);

  function handleNewUnlimitedGame() {
    const newSeed = `unlimited-${Date.now()}-${Math.random()}`;
    setUnlimitedSeed(newSeed);
    setGuesses([]);
    setWon(false);
    setGaveUp(false);
    setInputValue("");
    setShowSuggestions(false);
    setHighlightedIndex(0);
    setShowModal(false);

    localStorage.setItem(
      unlimitedStorageKey,
      JSON.stringify({
        guesses: [],
        won: false,
        gaveUp: false,
        secretId: newSeed,
      } satisfies SavedGame)
    );
  }

  function submitGuess(selectedName?: string) {
    if (unlimitedGameEnded) {
      handleNewUnlimitedGame();
      return;
    }

    if (!secretPlayer || won || gaveUp) return;

    const normalized = normalizeName(selectedName ?? inputValue);
    const guessedPlayer = playersByNormalizedName.get(normalized);

    if (!guessedPlayer) {
      return;
    }

    if (guesses.some((guess) => normalizeName(guess.name) === normalized)) {
      return;
    }

    const ranking = rankMap.get(guessedPlayer.id);
    if (!ranking) {
      return;
    }

    const nextGuess: GuessResult = {
      id: guessedPlayer.id,
      name: guessedPlayer.name,
      team: guessedPlayer.team,
      rank: ranking.rank,
      closeness: ranking.closeness,
    };

    const nextGuesses = [...guesses, nextGuess].sort((a, b) => a.rank - b.rank);
    setGuesses(nextGuesses);
    setInputValue("");
    setShowSuggestions(false);

    if (guessedPlayer.id === secretPlayer.id || ranking.rank === 1) {
      setWon(true);
      setShowModal(true);
    }
  }

  function handleSuggestionPick(player: Player) {
    setInputValue(player.name);
    setShowSuggestions(false);
    setHighlightedIndex(0);
    submitGuess(player.name);
  }

  function handleGiveUp() {
    if (unlimitedGameEnded) {
      handleNewUnlimitedGame();
      return;
    }

    if (!secretPlayer || won || gaveUp) return;
    setGaveUp(true);
    setShowSuggestions(false);
    setInputValue("");
    setShowModal(true);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions && e.key === "Enter") {
      e.preventDefault();
      submitGuess();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, Math.max(filteredSuggestions.length - 1, 0))
      );
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

  return (
    <main className="game-page">
      <section className="game-header">
        <div>
          <p className="kicker">Contexto</p>
          <h1>Find the hidden AFL player</h1>
          <p className="hero-text"></p>
        </div>
      </section>

      <section className="mode-toggle-row">
        <button
          className={`ui-button mode-toggle-button ${mode === "daily" ? "mode-active" : ""}`}
          onClick={() => setMode("daily")}
          type="button"
        >
          Daily
        </button>
        <button
          className={`ui-button mode-toggle-button ${mode === "unlimited" ? "mode-active" : ""}`}
          onClick={() => setMode("unlimited")}
          type="button"
        >
          Unlimited
        </button>
      </section>

      <section
        className={`guess-row contexto-actions-row ${
          unlimitedGameEnded ? "unlimited-ended" : ""
        }`}
      >
        <div style={{ position: "relative" }}>
          <div className="guess-input-wrap contexto-input-wrap">
            <span className="guess-icon">#</span>
            <input
              ref={inputRef}
              className="guess-input"
              placeholder={
                won
                  ? mode === "daily"
                    ? "You solved today's player"
                    : "Game complete"
                  : gaveUp
                  ? "You gave up"
                  : "Enter a player..."
              }
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 140);
              }}
              onKeyDown={handleInputKeyDown}
              disabled={won || gaveUp || !secretPlayer}
              autoComplete="off"
            />
          </div>

          {dropdownVisible && filteredSuggestions.length > 0 && !won && !gaveUp && (
            <div
              className={`contexto-suggestions ${
                showSuggestions ? "open" : "closing"
              }`}
            >
              {filteredSuggestions.map((player, index) => {
                const isActive = index === highlightedIndex;
                return (
                  <button
                    key={player.id}
                    type="button"
                    className={`contexto-suggestion ${isActive ? "active" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSuggestionPick(player)}
                    style={{ animationDelay: `${index * 28}ms` }}
                  >
                    <div className="contexto-suggestion-left">
                      <img
                        src={getTeamIconPath(player.team)}
                        alt={player.team}
                        className="contexto-team-icon"
                      />
                      <div className="contexto-suggestion-text">
                        <span className="contexto-suggestion-name">
                          {player.name}
                        </span>
                        <span className="contexto-suggestion-meta">
                          {player.team}
                          {player.position ? ` • ${player.position}` : ""}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          className={`ui-button large animated-button ${
            unlimitedGameEnded ? "new-game-button-inline" : ""
          }`}
          onClick={() => submitGuess()}
          disabled={mode === "daily" ? won || gaveUp || !secretPlayer : !secretPlayer}
        >
          {unlimitedGameEnded ? "New Game" : "Guess"}
        </button>

        {!unlimitedGameEnded && (
          <button
            className="ui-button large give-up-button"
            onClick={handleGiveUp}
            disabled={won || gaveUp || !secretPlayer}
          >
            Give Up
          </button>
        )}
      </section>

      <div
        className="info-card"
        style={{
          marginBottom: "18px",
          padding: "14px 18px",
        }}
      >
        <strong style={{ display: "block", marginBottom: "0" }}>
          Guesses: {guesses.length}
        </strong>
      </div>

      <section className="stack-list">
        {guesses.length === 0 ? (
          <div className="stack-row">
            <div className="stack-rank">-</div>
            <div className="stack-content">
              <strong>No guesses yet</strong>
              <span>
                {mode === "daily"
                  ? "Start guessing today’s AFL player."
                  : "Start guessing the current unlimited AFL player."}
              </span>
            </div>
          </div>
        ) : (
          guesses.map((guess) => {
            const barWidth =
              guess.rank === 1
                ? 100
                : clamp(100 - (guess.rank / players.length) * 100, 6, 96);

            return (
              <div
                key={guess.id}
                className="stack-row contexto-result-row"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${barWidth}%`,
                    background:
                      guess.rank === 1
                        ? "#a8d8d3"
                        : guess.rank <= 25
                        ? "#d8e7a8"
                        : guess.rank <= 100
                        ? "#ead28a"
                        : "#f0c7bf",
                    opacity: 0.95,
                    transition: "width 260ms ease",
                  }}
                />

                <div className="contexto-result-content">
                  <div className="contexto-result-left">
                    <img
                      src={getTeamIconPath(guess.team)}
                      alt={guess.team}
                      className="contexto-team-icon"
                    />
                    <span className="contexto-result-name">{guess.name}</span>
                  </div>

                  <span className="contexto-result-rank">{guess.rank}</span>
                </div>
              </div>
            );
          })
        )}
      </section>

      {showModal && secretPlayer && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
              type="button"
            >
              ✕
            </button>

            <div className="modal-top">
              <div className="modal-icon">
                <img
                  src={getTeamIconPath(secretPlayer.team)}
                  alt={secretPlayer.team}
                />
              </div>
            </div>

            <div className="modal-bottom">
              <p className="modal-sub">{won ? "Correct!" : "Answer"}</p>

              <h2 className="modal-title">{secretPlayer.name.toUpperCase()}</h2>

              <p className="modal-text">
                {won ? (
                  <>
                    You solved it in <span>{guesses.length}</span> guesses
                  </>
                ) : (
                  "Better luck next time"
                )}
              </p>

              <button
                className="modal-button"
                type="button"
                onClick={() => {
                  if (mode === "unlimited") {
                    handleNewUnlimitedGame();
                  } else {
                    setShowModal(false);
                  }
                }}
              >
                {mode === "unlimited" ? "New Game" : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mode-toggle-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .mode-toggle-button {
          transition:
            transform 0.14s ease,
            box-shadow 0.14s ease,
            background 0.14s ease,
            color 0.14s ease;
        }

        .mode-toggle-button:hover {
          transform: translateY(-2px);
        }

        .mode-active {
          background: #271248;
          color: #fffaf0;
        }

        .contexto-actions-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: start;
        }

        .contexto-actions-row.unlimited-ended {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .animated-button,
        .give-up-button {
          transition:
            transform 0.14s ease,
            box-shadow 0.14s ease,
            background 0.14s ease,
            opacity 0.14s ease;
        }

        .animated-button:hover:not(:disabled),
        .give-up-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .animated-button:active:not(:disabled),
        .give-up-button:active:not(:disabled) {
          transform: translateY(1px) scale(0.985);
          box-shadow: 0 2px 0 #271248;
        }

        .animated-button:disabled,
        .give-up-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .give-up-button {
          background: #f4d7d2;
        }

        .give-up-button:hover:not(:disabled) {
          background: #efc6bf;
        }

        .new-game-button-inline {
          background: #d8e7a8;
        }

        .new-game-button-inline:hover:not(:disabled) {
          background: #cddd95;
        }

        .contexto-input-wrap {
          min-width: 0;
        }

        .contexto-suggestions {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          right: 0;
          z-index: 40;
          border: 4px solid #271248;
          background: #fffaf0;
          box-shadow: 0 4px 0 #271248;
          border-radius: 8px;
          overflow: hidden;
          transform-origin: top;
        }

        .contexto-suggestions.open {
          animation: dropdownIn 0.18s ease-out;
        }

        .contexto-suggestions.closing {
          animation: dropdownOut 0.16s ease-in forwards;
          pointer-events: none;
        }

        .contexto-suggestion {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          cursor: pointer;
          transition:
            background 0.14s ease,
            transform 0.14s ease;
          opacity: 0;
          transform: translateY(-6px);
          animation: itemIn 0.22s ease forwards;
        }

        .contexto-suggestion + .contexto-suggestion {
          border-top: 2px solid rgba(39, 18, 72, 0.12);
        }

        .contexto-suggestion:hover,
        .contexto-suggestion.active {
          background: #efe5cf;
          transform: translateX(3px);
        }

        .contexto-suggestion-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .contexto-team-icon {
          width: 28px;
          height: 28px;
          object-fit: contain;
          flex: 0 0 28px;
        }

        .contexto-suggestion-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .contexto-suggestion-name {
          font-size: 1rem;
          font-weight: 800;
          color: #1c1230;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .contexto-suggestion-meta {
          font-size: 0.84rem;
          color: #5a5067;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .contexto-result-row {
          transition: transform 0.14s ease;
        }

        .contexto-result-row:hover {
          transform: translateY(-1px);
        }

        .contexto-result-content {
          position: relative;
          z-index: 1;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 16px;
          font-weight: 800;
        }

        .contexto-result-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .contexto-result-name {
          font-size: 1.05rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .contexto-result-rank {
          font-size: 1.35rem;
          flex: 0 0 auto;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 14, 33, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeIn 0.18s ease;
        }

        .modal-box {
          width: min(100%, 680px);
          background: #efe8d8;
          border: 4px solid #271248;
          box-shadow: 8px 8px 0 #271248;
          position: relative;
          animation: popIn 0.2s ease;
        }

        .modal-close {
          position: absolute;
          top: 14px;
          right: 16px;
          border: 0;
          background: transparent;
          color: #6c6c6c;
          font-size: 2rem;
          font-weight: 900;
          cursor: pointer;
          line-height: 1;
        }

        .modal-top {
          padding: 34px 24px 26px;
          border-bottom: 4px solid #271248;
          display: flex;
          justify-content: center;
        }

        .modal-icon {
          width: 160px;
          height: 160px;
          border-radius: 999px;
          border: 4px solid #271248;
          background: #f8f8f8;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 6px 6px 0 rgba(39, 18, 72, 0.18);
        }

        .modal-icon img {
          width: 85px;
          height: 85px;
          object-fit: contain;
        }

        .modal-bottom {
          padding: 38px 24px 42px;
          text-align: center;
        }

        .modal-sub {
          margin: 0 0 14px;
          font-size: 1.05rem;
          font-weight: 900;
          color: #271248;
        }

        .modal-title {
          margin: 0;
          font-size: clamp(2.2rem, 8vw, 4rem);
          line-height: 0.95;
          font-weight: 1000;
          letter-spacing: -2px;
          color: #1e1238;
          text-shadow: 4px 4px 0 rgba(39, 18, 72, 0.18);
        }

        .modal-text {
          margin: 20px 0 28px;
          font-size: clamp(1.1rem, 4vw, 1.6rem);
          font-weight: 800;
          color: #271248;
        }

        .modal-text span {
          color: #25c274;
          font-weight: 1000;
        }

        .modal-button {
          border: 4px solid #271248;
          background: #f8f8f8;
          color: #271248;
          padding: 14px 34px;
          font-size: 1rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 5px 5px 0 #271248;
          transition: transform 0.14s ease, box-shadow 0.14s ease;
        }

        .modal-button:hover {
          transform: translateY(-2px);
        }

        .modal-button:active {
          transform: translateY(1px);
          box-shadow: 2px 2px 0 #271248;
        }

        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scaleY(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }

        @keyframes dropdownOut {
          from {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
          to {
            opacity: 0;
            transform: translateY(-4px) scaleY(0.97);
          }
        }

        @keyframes itemIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.94);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 900px) {
          .contexto-actions-row {
            grid-template-columns: 1fr;
          }

          .contexto-actions-row.unlimited-ended {
            grid-template-columns: 1fr;
          }

          .contexto-suggestion {
            padding: 11px 12px;
          }

          .contexto-team-icon {
            width: 24px;
            height: 24px;
            flex-basis: 24px;
          }

          .contexto-result-name {
            font-size: 0.98rem;
          }

          .contexto-result-rank {
            font-size: 1.15rem;
          }

          .modal-box {
            width: min(100%, 420px);
          }

          .modal-icon {
            width: 120px;
            height: 120px;
          }

          .modal-icon img {
            width: 64px;
            height: 64px;
          }

          .modal-bottom {
            padding: 28px 18px 30px;
          }

          .modal-title {
            letter-spacing: -1px;
          }
        }
      `}</style>
    </main>
  );
}