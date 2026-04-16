"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import playersRaw from "@/app/data/afl_players26.json";

type RawPlayer = Record<string, unknown>;

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

type SavedGame = {
  guesses?: string[];
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
    if (Number.isFinite(num)) return num;
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

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getNameEmojis(name: string): string[] {
  const lower = normalizeName(name);

  const customMap: Record<string, string[]> = {
    "ben king": ["👑"],
    "brayden cook": ["🍳"],
    "mason wood": ["🌲"],
    "cooper bell": ["🔔"],
    "seth campbell": ["🏕️", "🔔"],
    "campbell chesser": ["🏕️", "🔔", "♟️er"],
    "zac fisher": ["🐟"],
    "connor stone": ["💎"],
    "brandon starcevich": ["🌟", "cev", "🦟"],
    "hunter clark": ["🏹", "Cl", "⛵"],
    "tyler brockman": ["B", "🗿", "👨"],
    "sandy brock": ["🏖️", "B", "🗿"],
    "hugh boxshall": ["📦", "🏛️"],
    "jack whitlock": ["⚪", "🔒", "⚡"],
    "matt whitlock": ["⚪", "🔒", "🦘"],
    "harry sheezel": ["🧀", "🤒"],
    "alex neal bullen": ["🐂", "en"],
    "luke trainor": ["T", "🌧️", "or"],
    "caleb windsor": ["💨", "🩹"],
    "marcus windhager": ["💨", "🌾", "⚙️"],
    "tom liberatore": ["🏛️", "📚", "🐀", "ore"],
    "paddy cross": ["❌"],
    "jacob van rooyen": ["🚐", "🦘", "💴"],
    "tim taranto": ["Tar", "🐜", "O"],
    "patrick lipinski": ["💋", "in", "🎿"],
    "sam switkowski": ["🍬", "🐄", "🎿"],
    "lachlan blakiston": ["⬛", "💋", "⚖️"],
    "adam saad": ["☹️"],
    "calsher dear": ["🦌"],
    "cam rayner": ["🌧️", "er"],
    "dan houston": ["🏠", "🔟"],
    "dane rampe": ["🐏", "🅿️"],
    "toby bedford": ["🛏️", "🚗"],
    "toby greene": ["🟢", "e"],
    "toby pink": ["🦩"],
    "trent rivers": ["🌊"],
    "tristan xerri": ["🍒"],
    "ty gallop": ["🐎"],
    "will day": ["☀️", "📅"],
    "willem drew": ["✏️"],
    "zak butters": ["🧈"],
    "connor rozee": ["🌹", "ee"],
    "aaron cadman": ["🐱", "👨"],
    "aaron naughton": ["👨‍🚀", "on"],
    "angus sheldrick": ["🐚", "🧱"],
    "bayley fritsch": ["F", "💰"],
    "ben keays": ["🔑"],
    "brody mihocek": ["👤", "O", "✔️"],
    "caleb serong": ["🌊", "❌"],
    "jack viney": ["🌿"],
    "jackson archer": ["🏹", "🎯"],
    "jacob hopper": ["🐸", "🦗", "🐇", "🦘"],
    "jai newcombe": ["New", "🍯"],
    "jack ginnivan": ["🥃", "i", "🚐"],
    "jeremy cameron": ["📷", "on", "🎯"],
    "jake bowey": ["🎀", "ey"],
    "jordon sweet": ["🍬"],
  };

  return customMap[lower] ?? ["❓"];
}

function buildEmojiClues(player: Player): string[] {
  const nameEmojis = getNameEmojis(player.name);

  if (nameEmojis.length === 0) {
    return ["❓", "🏉"];
  }

  return nameEmojis;
}

export default function EmojiPage() {
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

  const emojiPlayers = useMemo(() => {
    return players.filter((player) => {
      const emojis = getNameEmojis(player.name);
      return emojis.length > 0 && emojis[0] !== "❓";
    });
  }, [players]);

  const playersByNormalizedName = useMemo(() => {
    const map = new Map<string, Player>();
    for (const player of players) {
      map.set(normalizeName(player.name), player);
    }
    return map;
  }, [players]);

  const storageKey = "afl-emoji-unlimited-only";

  const [inputValue, setInputValue] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [won, setWon] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [unlimitedSeed, setUnlimitedSeed] = useState<string>("initial-seed");
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const secretPlayer = useMemo(() => {
    if (emojiPlayers.length === 0) return null;
    const index = hashString(unlimitedSeed) % emojiPlayers.length;
    return emojiPlayers[index];
  }, [emojiPlayers, unlimitedSeed]);

  const emojiClues = useMemo(() => {
    if (!secretPlayer) return [];
    return buildEmojiClues(secretPlayer);
  }, [secretPlayer]);

  useEffect(() => {
    const savedRaw = localStorage.getItem(storageKey);

    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw) as SavedGame;
        setGuesses(Array.isArray(parsed.guesses) ? parsed.guesses : []);
        setWon(Boolean(parsed.won));
        setGaveUp(Boolean(parsed.gaveUp));

        if (parsed.secretId) {
          setUnlimitedSeed(parsed.secretId);
        } else {
          setUnlimitedSeed(`unlimited-${Date.now()}`);
        }
      } catch {
        setGuesses([]);
        setWon(false);
        setGaveUp(false);
        setUnlimitedSeed(`unlimited-${Date.now()}`);
      }
    } else {
      setUnlimitedSeed(`unlimited-${Date.now()}`);
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        guesses,
        won,
        gaveUp,
        secretId: unlimitedSeed,
      } satisfies SavedGame)
    );
  }, [guesses, won, gaveUp, unlimitedSeed, loaded]);

  const filteredSuggestions = useMemo(() => {
    const query = normalizeName(inputValue);
    const alreadyGuessed = new Set(guesses.map((guess) => normalizeName(guess)));

    const filtered = !query
      ? players.slice(0, 8)
      : players.filter((player) => normalizeName(player.name).includes(query));

    return filtered
      .filter((player) => !alreadyGuessed.has(normalizeName(player.name)))
      .slice(0, 8);
  }, [inputValue, players, guesses]);

  const gameEnded = won || gaveUp;

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

  function handleNewGame() {
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
      storageKey,
      JSON.stringify({
        guesses: [],
        won: false,
        gaveUp: false,
        secretId: newSeed,
      } satisfies SavedGame)
    );
  }

  function submitGuess(selectedName?: string) {
    if (gameEnded) {
      handleNewGame();
      return;
    }

    if (!secretPlayer) return;

    const normalized = normalizeName(selectedName ?? inputValue);
    const guessedPlayer = playersByNormalizedName.get(normalized);

    if (!guessedPlayer) return;
    if (guesses.some((guess) => normalizeName(guess) === normalized)) return;

    const nextGuesses = [...guesses, guessedPlayer.name];
    setGuesses(nextGuesses);
    setInputValue("");
    setShowSuggestions(false);

    if (guessedPlayer.id === secretPlayer.id) {
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
    if (gameEnded) {
      handleNewGame();
      return;
    }

    if (!secretPlayer) return;

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
          <p className="kicker">Emoji</p>
          <h1>Guess the AFL player from emojis</h1>
          <p className="hero-text"></p>
        </div>
      </section>

      <section className="emoji-clue-panel">
        <div className="emoji-clue-title">Emoji Clues</div>
        <div className="emoji-clue-row">
          {emojiClues.map((emoji, index) => (
            <div
              key={`${emoji}-${index}`}
              className="emoji-chip"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {emoji}
            </div>
          ))}
        </div>
      </section>

      <section
        className={`guess-row emoji-actions-row ${gameEnded ? "game-ended" : ""}`}
      >
        <div style={{ position: "relative" }}>
          <div className="guess-input-wrap emoji-input-wrap">
            <span className="guess-icon">😀</span>
            <input
              ref={inputRef}
              className="guess-input"
              placeholder={
                won ? "Correct" : gaveUp ? "You gave up" : "Enter a player..."
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
            <div className={`emoji-suggestions ${showSuggestions ? "open" : "closing"}`}>
              {filteredSuggestions.map((player, index) => {
                const isActive = index === highlightedIndex;
                return (
                  <button
                    key={player.id}
                    type="button"
                    className={`emoji-suggestion ${isActive ? "active" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSuggestionPick(player)}
                    style={{ animationDelay: `${index * 28}ms` }}
                  >
                    <div className="emoji-suggestion-left">
                      <img
                        src={getTeamIconPath(player.team)}
                        alt={player.team}
                        className="emoji-team-icon"
                      />
                      <div className="emoji-suggestion-text">
                        <span className="emoji-suggestion-name">{player.name}</span>
                        <span className="emoji-suggestion-meta">
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
            gameEnded ? "new-game-button-inline" : ""
          }`}
          onClick={() => submitGuess()}
          disabled={!secretPlayer}
          type="button"
        >
          {gameEnded ? "New Game" : "Guess"}
        </button>

        {!gameEnded && (
          <button
            className="ui-button large give-up-button"
            onClick={handleGiveUp}
            disabled={!secretPlayer}
            type="button"
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
              <span>Use the emojis to find the AFL player.</span>
            </div>
          </div>
        ) : (
          guesses.map((guessName, index) => {
            const guessPlayer = playersByNormalizedName.get(normalizeName(guessName));
            if (!guessPlayer || !secretPlayer) return null;

            const isCorrect = guessPlayer.id === secretPlayer.id;

            return (
              <div
                key={`${guessName}-${index}`}
                className="stack-row emoji-result-row"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  padding: 0,
                }}
              >
                <div className="emoji-result-content">
                  <div className="emoji-result-player">
                    <img
                      src={getTeamIconPath(guessPlayer.team)}
                      alt={guessPlayer.team}
                      className="emoji-team-icon"
                    />
                    <span className="emoji-result-name">{guessPlayer.name}</span>
                  </div>

                  <div className="emoji-tags">
                    <span className={`emoji-tag ${isCorrect ? "correct" : "wrong"}`}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
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
                onClick={handleNewGame}
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .emoji-clue-panel {
          margin-bottom: 18px;
          border: 4px solid #271248;
          background: #fffaf0;
          box-shadow: 0 4px 0 #271248;
          border-radius: 8px;
          padding: 18px;
        }

        .emoji-clue-title {
          font-size: 0.9rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #271248;
          margin-bottom: 14px;
        }

        .emoji-clue-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .emoji-chip {
          width: 62px;
          height: 62px;
          border: 4px solid #271248;
          background: #efe8d8;
          box-shadow: 4px 4px 0 #271248;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          animation: chipIn 0.24s ease both;
        }

        .emoji-actions-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: start;
        }

        .emoji-actions-row.game-ended {
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

        .emoji-input-wrap {
          min-width: 0;
        }

        .emoji-suggestions {
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

        .emoji-suggestions.open {
          animation: dropdownIn 0.18s ease-out;
        }

        .emoji-suggestions.closing {
          animation: dropdownOut 0.16s ease-in forwards;
          pointer-events: none;
        }

        .emoji-suggestion {
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

        .emoji-suggestion + .emoji-suggestion {
          border-top: 2px solid rgba(39, 18, 72, 0.12);
        }

        .emoji-suggestion:hover,
        .emoji-suggestion.active {
          background: #efe5cf;
          transform: translateX(3px);
        }

        .emoji-suggestion-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .emoji-team-icon {
          width: 28px;
          height: 28px;
          object-fit: contain;
          flex: 0 0 28px;
        }

        .emoji-suggestion-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .emoji-suggestion-name {
          font-size: 1rem;
          font-weight: 800;
          color: #1c1230;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .emoji-suggestion-meta {
          font-size: 0.84rem;
          color: #5a5067;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .emoji-result-row {
          transition: transform 0.14s ease;
        }

        .emoji-result-row:hover {
          transform: translateY(-1px);
        }

        .emoji-result-content {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 16px;
          font-weight: 800;
          flex-wrap: wrap;
        }

        .emoji-result-player {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .emoji-result-name {
          font-size: 1.02rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .emoji-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .emoji-tag {
          min-width: 90px;
          text-align: center;
          border: 3px solid #271248;
          padding: 7px 12px;
          font-size: 0.82rem;
          font-weight: 900;
          box-shadow: 3px 3px 0 #271248;
        }

        .emoji-tag.correct {
          background: #d8e7a8;
        }

        .emoji-tag.wrong {
          background: #f0c7bf;
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

        @keyframes chipIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 900px) {
          .emoji-actions-row {
            grid-template-columns: 1fr;
          }

          .emoji-actions-row.game-ended {
            grid-template-columns: 1fr;
          }

          .emoji-suggestion {
            padding: 11px 12px;
          }

          .emoji-team-icon {
            width: 24px;
            height: 24px;
            flex-basis: 24px;
          }

          .emoji-result-name {
            font-size: 0.97rem;
          }

          .emoji-chip {
            width: 54px;
            height: 54px;
            font-size: 1.5rem;
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