"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import playersRaw from "@/app/data/afl_players26.json";

type RawPlayer = Record<string, unknown>;
type Difficulty = "easy" | "medium" | "hard" | "extreme";
type GameMode = "guess-number" | "guess-player";
type FlashColor = "green" | "red" | null;

type Player = {
  id: string;
  name: string;
  team: string;
  position: string;
  number: number;
  disposals: number;
  goals: number;
};

type SavedRun = {
  streak: number;
  bestStreak: number;
  usedIds: string[];
  currentPlayerId: string | null;
  over: boolean;
  gaveUp: boolean;
  seed: string;
  difficulty: Difficulty;
  selectedTeam: string;
  mode: GameMode;
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

function createSeed(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pickNextPlayer(players: Player[], usedIds: string[], seed: string): Player | null {
  const remaining = players.filter((player) => !usedIds.includes(player.id));
  if (remaining.length === 0) return null;
  const index = hashString(`${seed}-${usedIds.length}`) % remaining.length;
  return remaining[index];
}

function applyDifficultyFilter(players: Player[], difficulty: Difficulty): Player[] {
  switch (difficulty) {
    case "easy":
      return players.filter((player) => player.disposals >= 24 || player.goals >= 12);
    case "medium":
      return players.filter((player) => player.disposals >= 12 || player.goals >= 8);
    case "hard":
      return players;
    case "extreme":
      return players.filter((player) => player.disposals < 7);
    default:
      return players;
  }
}

export default function JumperStreakPage() {
  const allPlayers = useMemo<Player[]>(() => {
    const rawArray = Array.isArray(playersRaw) ? (playersRaw as RawPlayer[]) : [];

    return rawArray
      .map((player, index) => {
        const name = getFirstString(player, ["name", "player_name", "player", "full_name"]);
        const team = getFirstString(player, ["team", "club"]);
        const position = getFirstString(player, ["position", "pos"]);
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
          "average_disposals",
          "disposals_average",
          "disposals_avg",
        ]);
        const goals = getFirstNumber(player, [
          "goals",
          "avg_goals",
          "average_goals",
          "goals_average",
          "goals_avg",
        ]);

        return {
          id: `${normalizeName(name)}-${index}`,
          name,
          team,
          position,
          number,
          disposals,
          goals,
        };
      })
      .filter((player) => player.name && player.team && player.number > 0);
  }, []);

  const allTeams = useMemo(() => {
    return [...new Set(allPlayers.map((p) => p.team))].sort((a, b) => a.localeCompare(b));
  }, [allPlayers]);

  const storageKey = "afl-jumper-streak-clean-v1";

  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [selectedTeam, setSelectedTeam] = useState("ALL");
  const [mode, setMode] = useState<GameMode>("guess-number");
  const [inputValue, setInputValue] = useState("");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [seed, setSeed] = useState(() => createSeed("jumper-streak"));
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState("");
  const [shakeInput, setShakeInput] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [flashColor, setFlashColor] = useState<FlashColor>(null);

  const [isCycling, setIsCycling] = useState(false);
  const [displayTeam, setDisplayTeam] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);

  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const currentPlayerRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  const cycleIntervalRef = useRef<number | null>(null);
  const cycleFinishRef = useRef<number | null>(null);

  const effectiveDifficulty: Difficulty = selectedTeam === "ALL" ? difficulty : "hard";

  const availablePlayers = useMemo(() => {
    let pool = allPlayers;

    if (selectedTeam !== "ALL") {
      pool = pool.filter((player) => player.team === selectedTeam);
    }

    return applyDifficultyFilter(pool, effectiveDifficulty);
  }, [allPlayers, selectedTeam, effectiveDifficulty]);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const player of availablePlayers) {
      map.set(player.id, player);
    }
    return map;
  }, [availablePlayers]);

  const currentPlayer = currentPlayerId ? playersById.get(currentPlayerId) ?? null : null;
  const runEnded = over || gaveUp;

  const filteredPlayerOptions = useMemo(() => {
    if (mode !== "guess-player" || runEnded) return [];

    const query = normalizeName(inputValue);
    if (!query) return [];

    const pool =
      selectedTeam === "ALL"
        ? allPlayers
        : allPlayers.filter((player) => player.team === selectedTeam);

    const startsWith = pool.filter((p) => normalizeName(p.name).startsWith(query));
    const includes = pool.filter(
      (p) =>
        !startsWith.some((s) => s.id === p.id) &&
        normalizeName(p.name).includes(query)
    );

    return [...startsWith, ...includes].slice(0, 8);
  }, [mode, inputValue, allPlayers, selectedTeam, runEnded]);

  function clearCycleTimers() {
    if (cycleIntervalRef.current) {
      window.clearInterval(cycleIntervalRef.current);
      cycleIntervalRef.current = null;
    }
    if (cycleFinishRef.current) {
      window.clearTimeout(cycleFinishRef.current);
      cycleFinishRef.current = null;
    }
  }

  function triggerFlash(color: FlashColor) {
    if (!color) return;
    setFlashColor(color);

    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }

    flashTimerRef.current = window.setTimeout(() => {
      setFlashColor(null);
      flashTimerRef.current = null;
    }, 950);
  }

  function startRevealCycle(targetPlayer: Player) {
    clearCycleTimers();

    const cyclePool =
      availablePlayers.length > 0
        ? availablePlayers
        : allPlayers.length > 0
          ? allPlayers
          : [targetPlayer];

    let tick = 0;
    setIsCycling(true);

    cycleIntervalRef.current = window.setInterval(() => {
      tick += 1;
      const randomPlayer =
        cyclePool[(tick + Math.floor(Math.random() * cyclePool.length)) % cyclePool.length];

      setDisplayTeam(randomPlayer.team);
      setDisplayName(randomPlayer.name);
      setDisplayNumber(randomPlayer.number);
    }, 45);

    cycleFinishRef.current = window.setTimeout(() => {
      clearCycleTimers();
      setDisplayTeam(targetPlayer.team);
      setDisplayName(targetPlayer.name);
      setDisplayNumber(targetPlayer.number);
      setIsCycling(false);
    }, 430);
  }

  function getDefaultRun(
    runSeed: string,
    runDifficulty: Difficulty,
    runSelectedTeam: string,
    runMode: GameMode
  ): SavedRun {
    const effectiveRunDifficulty: Difficulty =
      runSelectedTeam === "ALL" ? runDifficulty : "hard";

    let filteredPlayers =
      runSelectedTeam === "ALL"
        ? allPlayers
        : allPlayers.filter((player) => player.team === runSelectedTeam);

    filteredPlayers = applyDifficultyFilter(filteredPlayers, effectiveRunDifficulty);

    const firstPlayer = pickNextPlayer(filteredPlayers, [], runSeed);

    return {
      streak: 0,
      bestStreak: 0,
      usedIds: firstPlayer ? [firstPlayer.id] : [],
      currentPlayerId: firstPlayer?.id ?? null,
      over: false,
      gaveUp: false,
      seed: runSeed,
      difficulty: effectiveRunDifficulty,
      selectedTeam: runSelectedTeam,
      mode: runMode,
    };
  }

  function applyRun(run: SavedRun) {
    const safeDifficulty: Difficulty =
      run.selectedTeam === "ALL" ? run.difficulty : "hard";

    setStreak(run.streak);
    setBestStreak(run.bestStreak);
    setUsedIds(run.usedIds);
    setCurrentPlayerId(run.currentPlayerId);
    setOver(run.over);
    setGaveUp(run.gaveUp);
    setSeed(run.seed);
    setDifficulty(safeDifficulty);
    setSelectedTeam(run.selectedTeam || "ALL");
    setMode(run.mode || "guess-number");
    setInputValue("");
    setShowModal(false);
    setLastSubmittedAnswer("");
    setShowDropdown(false);
    setHighlightedIndex(0);
  }

  function startFreshRun(
    nextDifficulty: Difficulty = difficulty,
    nextTeam: string = selectedTeam,
    nextMode: GameMode = mode,
    preserveBest = true
  ) {
    const actualDifficulty: Difficulty = nextTeam === "ALL" ? nextDifficulty : "hard";
    const newSeed = createSeed("jumper-streak");
    const run = getDefaultRun(newSeed, actualDifficulty, nextTeam, nextMode);

    if (preserveBest) {
      run.bestStreak = bestStreak;
    }

    applyRun(run);
    localStorage.setItem(storageKey, JSON.stringify(run));
  }

  useEffect(() => {
    if (allPlayers.length === 0) return;

    const raw = localStorage.getItem(storageKey);

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SavedRun;
        const safeTeam =
          parsed.selectedTeam === "ALL" || allTeams.includes(parsed.selectedTeam)
            ? parsed.selectedTeam
            : "ALL";

        applyRun({
          ...parsed,
          difficulty: safeTeam === "ALL" ? parsed.difficulty ?? "easy" : "hard",
          selectedTeam: safeTeam,
          mode: parsed.mode ?? "guess-number",
        });
      } catch {
        applyRun(getDefaultRun(createSeed("jumper-streak"), "easy", "ALL", "guess-number"));
      }
    } else {
      applyRun(getDefaultRun(createSeed("jumper-streak"), "easy", "ALL", "guess-number"));
    }

    setLoaded(true);
  }, [allPlayers, allTeams]);

  useEffect(() => {
    if (!loaded) return;

    const payload: SavedRun = {
      streak,
      bestStreak,
      usedIds,
      currentPlayerId,
      over,
      gaveUp,
      seed,
      difficulty: effectiveDifficulty,
      selectedTeam,
      mode,
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    loaded,
    streak,
    bestStreak,
    usedIds,
    currentPlayerId,
    over,
    gaveUp,
    seed,
    effectiveDifficulty,
    selectedTeam,
    mode,
  ]);

  useEffect(() => {
    if (!loaded) return;

    if (availablePlayers.length === 0) {
      setCurrentPlayerId(null);
      setUsedIds([]);
      setStreak(0);
      setOver(false);
      setGaveUp(false);
      setDisplayTeam("");
      setDisplayName("");
      setDisplayNumber(null);
      return;
    }

    if (!currentPlayerId || !playersById.has(currentPlayerId)) {
      const firstPlayer = pickNextPlayer(availablePlayers, [], seed);
      setUsedIds(firstPlayer ? [firstPlayer.id] : []);
      setCurrentPlayerId(firstPlayer?.id ?? null);
      setStreak(0);
      setOver(false);
      setGaveUp(false);
    }
  }, [availablePlayers, currentPlayerId, playersById, loaded, seed]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue, mode]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!inputWrapRef.current) return;
      if (!inputWrapRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!runEnded && currentPlayer && !showModal && !isCycling) {
      const timer = window.setTimeout(() => {
        answerInputRef.current?.focus();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [currentPlayerId, runEnded, mode, selectedTeam, effectiveDifficulty, showModal, isCycling]);

  useEffect(() => {
    if (!loaded) return;

    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      currentPlayerRef.current = currentPlayerId;

      if (currentPlayer) {
        setDisplayTeam(currentPlayer.team);
        setDisplayName(currentPlayer.name);
        setDisplayNumber(currentPlayer.number);
      }
      return;
    }

    if (!currentPlayerId || currentPlayerId === currentPlayerRef.current || !currentPlayer) return;

    startRevealCycle(currentPlayer);
    currentPlayerRef.current = currentPlayerId;
  }, [currentPlayerId, currentPlayer, loaded, availablePlayers, allPlayers]);

  useEffect(() => {
    return () => {
      clearCycleTimers();
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  function handleDifficultyChange(nextDifficulty: Difficulty) {
    if (selectedTeam !== "ALL") return;
    setDifficulty(nextDifficulty);
    startFreshRun(nextDifficulty, selectedTeam, mode, true);
  }

  function handleTeamChange(nextTeam: string) {
    const nextDifficulty = nextTeam === "ALL" ? difficulty : "hard";
    setSelectedTeam(nextTeam);
    if (nextTeam !== "ALL") {
      setDifficulty("hard");
    }
    startFreshRun(nextDifficulty, nextTeam, mode, true);
  }

  function handleModeChange(nextMode: GameMode) {
    startFreshRun(difficulty, selectedTeam, nextMode, true);
    setMode(nextMode);
  }

  function endRun(wasGiveUp: boolean, submittedAnswer?: string) {
    setOver(!wasGiveUp);
    setGaveUp(wasGiveUp);
    setBestStreak((prev) => Math.max(prev, streak));
    setLastSubmittedAnswer(submittedAnswer ?? "");
    setShowModal(true);
    setShowDropdown(false);
  }

  function isCorrectAnswer(answer: string) {
    if (!currentPlayer) return false;

    if (mode === "guess-number") {
      const guess = Number(answer.trim());
      return Number.isFinite(guess) && guess === currentPlayer.number;
    }

    return normalizeName(answer) === normalizeName(currentPlayer.name);
  }

  function handleSubmit(forcedAnswer?: string) {
    if (!currentPlayer || isCycling) return;

    if (runEnded) {
      startFreshRun(difficulty, selectedTeam, mode, true);
      return;
    }

    const cleaned = (forcedAnswer ?? inputValue).trim();

    if (!cleaned) {
      setShakeInput(true);
      window.setTimeout(() => setShakeInput(false), 320);
      answerInputRef.current?.focus();
      return;
    }

    if (!isCorrectAnswer(cleaned)) {
      triggerFlash("red");
      endRun(false, cleaned);
      return;
    }

    triggerFlash("green");

    const nextStreak = streak + 1;
    const nextBest = Math.max(bestStreak, nextStreak);
    const nextUsedIds = [...usedIds];
    const nextPlayer = pickNextPlayer(availablePlayers, nextUsedIds, seed);

    setStreak(nextStreak);
    setBestStreak(nextBest);
    setInputValue("");
    setLastSubmittedAnswer(cleaned);
    setShowDropdown(false);

    if (!nextPlayer) {
      setOver(true);
      setShowModal(true);
      return;
    }

    setUsedIds([...nextUsedIds, nextPlayer.id]);
    setCurrentPlayerId(nextPlayer.id);
  }

  function handleGiveUp() {
    if (!currentPlayer || runEnded) {
      startFreshRun(difficulty, selectedTeam, mode, true);
      return;
    }

    endRun(true);
  }

  function selectPlayerOption(player: Player) {
    setInputValue(player.name);
    setShowDropdown(false);
    handleSubmit(player.name);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mode === "guess-player" && showDropdown && filteredPlayerOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev >= filteredPlayerOptions.length - 1 ? 0 : prev + 1
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev <= 0 ? filteredPlayerOptions.length - 1 : prev - 1
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const option = filteredPlayerOptions[highlightedIndex];
        if (option) {
          selectPlayerOption(option);
          return;
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  function getClueTextFor(team: string, position: string) {
    if (!team && !position) return "";

    switch (effectiveDifficulty) {
      case "easy":
        return `${team} • ${position || "AFL Player"}`;
      case "medium":
        return team;
      case "hard":
        return position || "AFL Player";
      case "extreme":
        return "Mystery player";
      default:
        return "";
    }
  }

  function getInputPlaceholder() {
    if (runEnded) return "Game over";
    return mode === "guess-number" ? "Type jumper number" : "Type player's name";
  }

  function getInputLabel() {
    return mode === "guess-number" ? "Guess the jumper number" : "Guess the player name";
  }

  const shownTeam = isCycling ? displayTeam : currentPlayer?.team ?? "";
  const shownName = isCycling ? displayName : currentPlayer?.name ?? "";
  const shownNumber = isCycling ? displayNumber : currentPlayer?.number ?? null;
  const shownPosition = isCycling
    ? allPlayers.find((p) => p.name === displayName && p.team === displayTeam)?.position ?? ""
    : currentPlayer?.position ?? "";

  function renderRightPanel() {
    if (!shownName && shownNumber == null) {
      return (
        <div
          style={{
            width: "100%",
            textAlign: "center",
            fontFamily: "Arial Black, Impact, sans-serif",
            fontSize: "clamp(72px, 20vw, 420px)",
            lineHeight: "0.82",
            fontWeight: 900,
            color: "#111",
          }}
        >
          ?
        </div>
      );
    }

    if (mode === "guess-number") {
      const [firstName, ...rest] = shownName.split(" ");
      const lastName = rest.join(" ");

      return (
        <div
          style={{
            width: "100%",
            textAlign: "center",
            fontFamily: "Arial Black, Impact, sans-serif",
            lineHeight: "0.9",
            fontWeight: 900,
            color: "#111",
            textTransform: "uppercase",
            padding: "0 12px",
          }}
        >
          <div
            style={{
              fontSize: "clamp(2rem, 5vw, 70px)",
              minHeight: "1em",
              wordBreak: "break-word",
            }}
          >
            {firstName}
          </div>
          <div
            style={{
              fontSize: "clamp(2rem, 5vw, 70px)",
              minHeight: "1em",
              wordBreak: "break-word",
            }}
          >
            {lastName}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          width: "100%",
          textAlign: "center",
          fontFamily: "Arial Black, Impact, sans-serif",
          fontSize: "clamp(72px, 20vw, 420px)",
          lineHeight: "0.82",
          fontWeight: 900,
          color: "#111",
        }}
      >
        {shownNumber ?? "?"}
      </div>
    );
  }

  return (
    <main
      className={`game-page ${
        flashColor === "green" ? "flash-green" : flashColor === "red" ? "flash-red" : ""
      }`}
    >
      <section className="top-bar">
        <div className="control-group">
          <label htmlFor="mode">Mode</label>
          <select
            id="mode"
            className="simple-select"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value as GameMode)}
          >
            <option value="guess-number">Guess Number</option>
            <option value="guess-player">Guess Player</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="team">Team</label>
          <select
            id="team"
            className="simple-select"
            value={selectedTeam}
            onChange={(e) => handleTeamChange(e.target.value)}
          >
            <option value="ALL">All</option>
            {allTeams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="difficulty">Difficulty</label>
          <select
            id="difficulty"
            className="simple-select"
            value={effectiveDifficulty}
            onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
            disabled={selectedTeam !== "ALL"}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="extreme">Extreme</option>
          </select>
        </div>
      </section>

      <section className="input-row">
        <label className="sr-only" htmlFor="answer-input">
          {getInputLabel()}
        </label>

        <div className="input-dropdown-wrap" ref={inputWrapRef}>
          <div className="input-submit-row">
            <input
              ref={answerInputRef}
              id="answer-input"
              className={`answer-input ${shakeInput ? "shake" : ""}`}
              inputMode={mode === "guess-number" ? "numeric" : "text"}
              placeholder={getInputPlaceholder()}
              value={inputValue}
              onChange={(e) => {
                if (mode === "guess-number") {
                  const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
                  setInputValue(cleaned);
                  return;
                }

                const value = e.target.value;
                setInputValue(value);
                setShowDropdown(Boolean(normalizeName(value)));
              }}
              onFocus={() => {
                if (mode === "guess-player" && !runEnded && normalizeName(inputValue)) {
                  setShowDropdown(true);
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={runEnded || !currentPlayer || isCycling}
              autoComplete="off"
              autoFocus
            />

            <button
              type="button"
              className="submit-button"
              onClick={() => handleSubmit()}
              disabled={runEnded || !currentPlayer || isCycling}
            >
              Submit
            </button>
          </div>

          {mode === "guess-player" && showDropdown && filteredPlayerOptions.length > 0 && (
            <div className="player-dropdown">
              {filteredPlayerOptions.map((player, index) => (
                <button
                  key={player.id}
                  type="button"
                  className={`player-option ${
                    index === highlightedIndex ? "player-option-active" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPlayerOption(player);
                  }}
                >
                  <img
                    src={getTeamIconPath(player.team)}
                    alt={player.team}
                    className="player-option-icon"
                  />
                  <div className="player-option-text">
                    <span className="player-option-name">{player.name}</span>
                    <span className="player-option-team">{player.team}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="main-game">
        <div className={`left-panel ${isCycling ? "reel-active" : ""}`}>
          {shownTeam ? (
            <>
              <img src={getTeamIconPath(shownTeam)} alt={shownTeam} className="team-logo" />
              <p className="clue-text">{getClueTextFor(shownTeam, shownPosition)}</p>
            </>
          ) : (
            <div className="empty-state">No players available</div>
          )}
        </div>

        <div className={`right-display ${isCycling ? "reel-active" : ""}`}>
          {renderRightPanel()}
        </div>
      </section>

      <section className="status-row">
        <p className="status-text">Streak: {streak}</p>
        <p className="status-text">Best: {bestStreak}</p>
      </section>

      <section className="button-row">
        {!runEnded ? (
          <button
            className="main-button give-up-button"
            onClick={handleGiveUp}
            disabled={!currentPlayer || isCycling}
            type="button"
          >
            Give Up
          </button>
        ) : (
          <button
            className="main-button give-up-button"
            onClick={() => startFreshRun(difficulty, selectedTeam, mode, true)}
            disabled={!currentPlayer}
            type="button"
          >
            New Game
          </button>
        )}
      </section>

      {showModal && currentPlayer && (
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
              <img
                src={getTeamIconPath(currentPlayer.team)}
                alt={currentPlayer.team}
                className="modal-logo"
              />
            </div>

            <div className="modal-bottom">
              <p className="modal-sub">{gaveUp ? "You gave up" : "Incorrect"}</p>
              <h2 className="modal-title">{currentPlayer.name}</h2>
              <p className="modal-number">#{currentPlayer.number}</p>

              <p className="modal-text">
                {gaveUp ? (
                  <>
                    Your streak ended at <span>{streak}</span>.
                  </>
                ) : mode === "guess-number" ? (
                  <>
                    You entered <span>{lastSubmittedAnswer}</span>. The correct jumper
                    number was <span>#{currentPlayer.number}</span>.
                  </>
                ) : (
                  <>
                    You entered <span>{lastSubmittedAnswer}</span>. The correct player
                    was <span>{currentPlayer.name}</span>.
                  </>
                )}
              </p>

              <p className="modal-text secondary">
                Best streak: <span>{Math.max(bestStreak, streak)}</span>
              </p>

              <button
                className="modal-button"
                type="button"
                onClick={() => startFreshRun(difficulty, selectedTeam, mode, true)}
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .game-page {
          padding: 24px 20px 36px;
          transition: background-color 0.2s ease;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .flash-green {
          background: #22c55e;
        }

        .flash-red {
          background: #ef4444;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .top-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 18px;
          width: 100%;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          color: #271248;
          min-width: 0;
        }

        .control-group label {
          flex: 0 0 auto;
        }

        .simple-select {
          padding: 10px 12px;
          border: 3px solid #271248;
          border-radius: 10px;
          background: #fffaf0;
          color: #1c1230;
          font-weight: 800;
          font-size: 1rem;
          outline: none;
          min-width: 0;
          max-width: 100%;
        }

        .simple-select:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: #ece7da;
        }

        .input-row {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
          width: 100%;
        }

        .input-dropdown-wrap {
          position: relative;
          width: min(460px, 92%);
          max-width: 100%;
        }

        .input-submit-row {
          display: flex;
          gap: 10px;
          align-items: stretch;
        }

        .answer-input {
          width: 100%;
          padding: 14px 16px;
          border: 3px solid #271248;
          border-radius: 10px;
          background: #fffaf0;
          color: #1c1230;
          font-size: 1.1rem;
          font-weight: 700;
          outline: none;
          transition: transform 0.18s ease;
          box-sizing: border-box;
          flex: 1;
          min-width: 0;
        }

        .submit-button {
          padding: 0 18px;
          border: 3px solid #271248;
          border-radius: 10px;
          background: #f5ddd8;
          color: #271248;
          font-size: 1rem;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.14s ease, opacity 0.14s ease;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .player-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #f1ebdc;
          border: 3px solid #271248;
          border-radius: 12px;
          overflow: hidden;
          z-index: 50;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          max-height: 340px;
          overflow-y: auto;
        }

        .player-option {
          width: 100%;
          border: 0;
          border-bottom: 1px solid rgba(39, 18, 72, 0.12);
          background: transparent;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          text-align: left;
          cursor: pointer;
        }

        .player-option:last-child {
          border-bottom: 0;
        }

        .player-option:hover,
        .player-option-active {
          background: #e5dcc7;
        }

        .player-option-icon {
          width: 34px;
          height: 34px;
          object-fit: contain;
          flex: 0 0 34px;
        }

        .player-option-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .player-option-name {
          font-size: 1rem;
          font-weight: 900;
          color: #23153e;
          line-height: 1.1;
        }

        .player-option-team {
          font-size: 0.92rem;
          color: #5c5370;
          line-height: 1.1;
          margin-top: 3px;
        }

        .main-game {
          display: grid;
          grid-template-columns: minmax(280px, 1fr) minmax(320px, 1fr);
          gap: 24px;
          align-items: stretch;
          min-height: 72vh;
          margin-bottom: 14px;
          width: 100%;
        }

        .left-panel {
          min-width: 0;
          min-height: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          will-change: opacity, filter, transform;
        }

        .right-display {
          will-change: opacity, filter, transform;
          width: 100%;
          min-width: 0;
          min-height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex: 1;
        }

        .reel-active {
          animation: reelPulse 0.14s linear infinite;
        }

        .team-logo {
          width: min(100%, 520px);
          max-width: 100%;
          max-height: 520px;
          object-fit: contain;
        }

        .clue-text {
          margin: 16px 0 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #271248;
          text-align: center;
          line-height: 1.25;
          padding: 0 8px;
        }

        .status-row {
          display: flex;
          justify-content: center;
          gap: 28px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .status-text {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 900;
          color: #271248;
        }

        .button-row {
          display: flex;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
          min-height: 52px;
        }

        .main-button {
          min-width: 150px;
          padding: 13px 22px;
          border: 3px solid #271248;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform 0.14s ease,
            opacity 0.14s ease,
            background 0.14s ease;
        }

        .main-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .main-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .give-up-button {
          background: #f5ddd8;
          color: #271248;
        }

        .empty-state {
          font-size: 1.2rem;
          font-weight: 800;
          color: #271248;
          text-align: center;
        }

        .shake {
          animation: shake 0.32s ease;
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
          width: min(100%, 620px);
          background: #efe8d8;
          border: 4px solid #271248;
          box-shadow: 8px 8px 0 #271248;
          position: relative;
          border-radius: 16px;
          overflow: hidden;
        }

        .modal-close {
          position: absolute;
          top: 12px;
          right: 14px;
          border: 0;
          background: transparent;
          color: #6c6c6c;
          font-size: 2rem;
          font-weight: 900;
          cursor: pointer;
          line-height: 1;
        }

        .modal-top {
          padding: 30px 24px 20px;
          border-bottom: 4px solid #271248;
          display: flex;
          justify-content: center;
        }

        .modal-logo {
          width: 110px;
          height: 110px;
          object-fit: contain;
        }

        .modal-bottom {
          padding: 30px 24px 34px;
          text-align: center;
        }

        .modal-sub {
          margin: 0 0 12px;
          font-size: 1rem;
          font-weight: 900;
          color: #271248;
        }

        .modal-title {
          margin: 0;
          font-size: clamp(1.8rem, 6vw, 3rem);
          line-height: 1;
          font-weight: 1000;
          color: #1e1238;
          word-break: break-word;
        }

        .modal-number {
          margin: 12px 0 10px;
          font-size: clamp(1.4rem, 4vw, 2rem);
          font-weight: 1000;
          color: #271248;
        }

        .modal-text {
          margin: 10px 0 0;
          font-size: 1rem;
          line-height: 1.45;
          color: #2c2142;
          font-weight: 700;
        }

        .modal-text span {
          font-weight: 1000;
          color: #1a1230;
        }

        .modal-text.secondary {
          margin-top: 14px;
        }

        .modal-button {
          margin-top: 22px;
          min-width: 180px;
          padding: 14px 24px;
          border: 3px solid #271248;
          border-radius: 12px;
          background: #f5ddd8;
          color: #271248;
          font-size: 1rem;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.14s ease, opacity 0.14s ease;
        }

        .modal-button:hover {
          transform: translateY(-2px);
        }

        @keyframes shake {
          0% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-6px);
          }
          40% {
            transform: translateX(6px);
          }
          60% {
            transform: translateX(-4px);
          }
          80% {
            transform: translateX(4px);
          }
          100% {
            transform: translateX(0);
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

        @keyframes reelPulse {
          0% {
            opacity: 0.65;
            filter: blur(1px);
            transform: translateY(-2px);
          }
          50% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(2px);
          }
          100% {
            opacity: 0.72;
            filter: blur(1px);
            transform: translateY(-1px);
          }
        }

        @media (max-width: 900px) {
          .main-game {
            grid-template-columns: 1fr;
            gap: 16px;
            min-height: auto;
          }

          .left-panel,
          .right-display {
            min-height: auto;
          }

          .left-panel {
            padding-top: 8px;
          }

          .team-logo {
            width: min(78vw, 360px);
            max-height: 260px;
          }

          .right-display {
            min-height: 180px;
            padding: 8px 0;
          }
        }

        @media (max-width: 640px) {
          .game-page {
            padding: 16px 12px 26px;
          }

          .top-bar {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            margin-bottom: 14px;
          }

          .control-group {
            width: 100%;
            display: grid;
            grid-template-columns: 88px minmax(0, 1fr);
            align-items: center;
            gap: 10px;
          }

          .simple-select {
            width: 100%;
            min-width: 0;
            font-size: 16px;
          }

          .input-row {
            margin-bottom: 14px;
          }

          .input-dropdown-wrap {
            width: 100%;
          }

          .input-submit-row {
            flex-direction: column;
          }

          .answer-input {
            font-size: 16px;
            padding: 13px 14px;
          }

          .submit-button {
            width: 100%;
            min-height: 52px;
          }

          .player-dropdown {
            max-height: 240px;
          }

          .player-option {
            padding: 10px 12px;
          }

          .player-option-name {
            font-size: 0.95rem;
          }

          .player-option-team {
            font-size: 0.85rem;
          }

          .main-game {
            gap: 10px;
            margin-bottom: 12px;
          }

          .left-panel {
            min-height: auto;
          }

          .team-logo {
            width: min(72vw, 300px);
            max-height: 200px;
          }

          .clue-text {
            margin-top: 10px;
            font-size: 0.98rem;
          }

          .right-display {
            min-height: 120px;
          }

          .status-row {
            gap: 16px;
            margin-bottom: 14px;
          }

          .status-text {
            font-size: 1rem;
          }

          .button-row {
            width: 100%;
          }

          .main-button,
          .modal-button {
            width: 100%;
          }

          .modal-overlay {
            padding: 12px;
          }

          .modal-box {
            box-shadow: 6px 6px 0 #271248;
          }

          .modal-top {
            padding: 22px 18px 16px;
          }

          .modal-bottom {
            padding: 22px 18px 24px;
          }

          .modal-logo {
            width: 88px;
            height: 88px;
          }
        }

        @media (max-width: 420px) {
          .game-page {
            padding: 14px 10px 24px;
          }

          .control-group {
            grid-template-columns: 78px minmax(0, 1fr);
            gap: 8px;
          }

          .control-group label {
            font-size: 0.98rem;
          }

          .simple-select {
            padding: 10px 10px;
          }

          .answer-input {
            padding: 12px 12px;
          }

          .team-logo {
            width: min(68vw, 260px);
            max-height: 170px;
          }

          .clue-text {
            font-size: 0.92rem;
          }

          .status-text {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </main>
  );
}