"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import playersData from "../data/afl_players26.json";

type RawPlayer = Record<string, unknown>;

type Player = {
  id: string;
  name: string;
  team: string;
  state: string;
  pos: string;
  initials: string;
  age: number | null;
  number: number | null;
  disposals: number | null;
  goals: number | null;
};

type CategoryFamily =
  | "stats"
  | "position"
  | "jersey"
  | "team_bucket"
  | "name"
  | "main"
  | "age_bucket";

type CategoryDef = {
  id: string;
  family: CategoryFamily;
  title: string;
  playerIds: string[];
};

type Category = {
  id: string;
  family: CategoryFamily;
  title: string;
  difficulty: 0 | 1 | 2 | 3;
  playerIds: string[];
};

type Puzzle = {
  dateKey: string;
  categories: Category[];
  cards: Player[];
};

type SolvedGroup = {
  category: Category;
  players: Player[];
};

type SavedDailyState = {
  solvedCategoryIds: string[];
  mistakesLeft: number;
  message: string;
  gameOver: boolean;
};

type FeedbackState = "idle" | "correct" | "wrong";

const MAX_MISTAKES = 4;

const DIFFICULTY_STYLES = [
  { bg: "#f9df6d", border: "#d7b93f", text: "#1f1730" },
  { bg: "#a0c35a", border: "#7da040", text: "#1f1730" },
  { bg: "#b0c4ef", border: "#8ca5da", text: "#1f1730" },
  { bg: "#ba81c5", border: "#9163a0", text: "#ffffff" },
] as const;

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function createSeededRandom(seed: string) {
  const seedFn = hashString(seed);
  let a = seedFn();
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const random = createSeededRandom(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleFourSeeded<T>(arr: T[], seed: string): T[] {
  return seededShuffle(arr, seed).slice(0, 4);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toUpperString(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v).trim())
      .filter(Boolean)
      .join("/")
      .toUpperCase();
  }
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[\s/-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normaliseTeam(team: string): string {
  const map: Record<string, string> = {
    "ADELAIDE CROWS": "Adelaide",
    ADELAIDE: "Adelaide",
    "BRISBANE LIONS": "Brisbane",
    BRISBANE: "Brisbane",
    CARLTON: "Carlton",
    COLLINGWOOD: "Collingwood",
    ESSENDON: "Essendon",
    FREMANTLE: "Fremantle",
    GEELONG: "Geelong",
    "GEELONG CATS": "Geelong",
    "GOLD COAST": "Gold Coast",
    "GOLD COAST SUNS": "Gold Coast",
    GWS: "GWS",
    "GREATER WESTERN SYDNEY": "GWS",
    HAWTHORN: "Hawthorn",
    MELBOURNE: "Melbourne",
    "NORTH MELBOURNE": "North Melbourne",
    KANGAROOS: "North Melbourne",
    "PORT ADELAIDE": "Port Adelaide",
    RICHMOND: "Richmond",
    "ST KILDA": "St Kilda",
    SYDNEY: "Sydney",
    "SYDNEY SWANS": "Sydney",
    "WEST COAST": "West Coast",
    "WEST COAST EAGLES": "West Coast",
    "WESTERN BULLDOGS": "Western Bulldogs",
    BULLDOGS: "Western Bulldogs",
  };
  return map[team] ?? toTitleCase(team);
}

function normalisePos(pos: string): string {
  const p = pos.toUpperCase();
  if (p.includes("R")) return "Ruck";
  if (p.includes("F")) return "Forward";
  if (p.includes("B") || p.includes("D")) return "Defender";
  if (p.includes("M") || p.includes("W") || p.includes("C")) return "Midfielder";
  return toTitleCase(pos);
}

function getName(p: RawPlayer): string {
  return String(p.name ?? p.player ?? p.full_name ?? p.fullName ?? "").trim();
}

function getInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0]?.toUpperCase() ?? "";
  const last = parts[parts.length - 1]?.[0]?.toUpperCase() ?? "";
  return parts.length >= 2 ? `${first}${last}` : first;
}

function getLetterCount(name: string) {
  return name.replace(/[^A-Za-z]/g, "").length;
}

function parsePlayers(raw: RawPlayer[]): Player[] {
  return raw
    .map((p, index) => {
      const name = getName(p);
      const team = normaliseTeam(toUpperString(p.team ?? p.club ?? p.Team ?? ""));
      const pos = normalisePos(
        toUpperString(p.pos ?? p.position ?? p.Pos ?? p.Position ?? "")
      );

      return {
        id: String(p.id ?? `${name}-${team}-${index}`),
        name,
        team,
        state: toTitleCase(String(p.state ?? p.State ?? p.home_state ?? "").trim()),
        pos,
        initials: getInitials(name),
        age: toNumber(p.age),
        number: toNumber(p.number ?? p.jumper ?? p.guernsey),
        disposals: toNumber(p.disposals),
        goals: toNumber(p.goals),
      };
    })
    .filter((p) => p.name && p.team);
}

function uniquePlayers(players: Player[]) {
  const seen = new Set<string>();
  return players.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function groupBy<T>(items: T[], getKey: (item: T) => string | null) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function addSampledFixedCategory(
  defs: CategoryDef[],
  family: CategoryFamily,
  id: string,
  title: string,
  players: Player[],
  dateKey: string,
  attempt: number
) {
  const unique = uniquePlayers(players);
  if (unique.length < 4) return;
  defs.push({
    id,
    family,
    title,
    playerIds: sampleFourSeeded(
      unique.map((p) => p.id),
      `${dateKey}-${attempt}-${id}`
    ),
  });
}

function buildCandidateCategoryDefs(
  players: Player[],
  dateKey: string,
  attempt: number
): CategoryDef[] {
  const defs: CategoryDef[] = [];

  const byTeam = groupBy(players, (p) => (p.team ? p.team : null));
  const byPos = groupBy(players, (p) => (p.pos ? p.pos : null));
  const byAge = groupBy(players, (p) =>
    typeof p.age === "number" ? String(p.age) : null
  );
  const byNumber = groupBy(players, (p) =>
    typeof p.number === "number" ? String(p.number) : null
  );
  const byInitials = groupBy(players, (p) => (p.initials ? p.initials : null));

  addSampledFixedCategory(
    defs,
    "stats",
    "goals-10plus",
    "10+ Goals (2026)",
    players.filter((p) => (p.goals ?? 0) >= 10),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "stats",
    "disposals-30plus",
    "30+ Disposal Avg (2026)",
    players.filter((p) => (p.disposals ?? 0) >= 30),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "stats",
    "disposals-25plus",
    "25+ Disposal Avg (2026)",
    players.filter((p) => (p.disposals ?? 0) >= 25),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "position",
    "forwards",
    "Forwards",
    players.filter((p) => p.pos === "Forward"),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "position",
    "midfielders",
    "Midfielders",
    players.filter((p) => p.pos === "Midfielder"),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "position",
    "defenders",
    "Defenders",
    players.filter((p) => p.pos === "Defender"),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "position",
    "ruckmen",
    "Ruckmen",
    players.filter((p) => p.pos === "Ruck"),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "jersey",
    "jersey-40plus",
    "Jersey Number 40+",
    players.filter((p) => (p.number ?? -1) >= 40),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "jersey",
    "jersey-single-digit",
    "Single Digit Jersey Number",
    players.filter((p) => typeof p.number === "number" && p.number >= 1 && p.number <= 9),
    dateKey,
    attempt
  );

  for (const [number, grouped] of byNumber.entries()) {
    if (grouped.length < 4) continue;
    defs.push({
      id: `same-number-${number}`,
      family: "jersey",
      title: `Same Jersey Numbers (${number})`,
      playerIds: sampleFourSeeded(
        grouped.map((p) => p.id),
        `${dateKey}-${attempt}-same-number-${number}`
      ),
    });
  }

  addSampledFixedCategory(
    defs,
    "team_bucket",
    "team-yellow",
    "Team with Yellow",
    players.filter((p) =>
      ["Richmond", "Hawthorn", "West Coast", "Adelaide"].includes(p.team)
    ),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "team_bucket",
    "team-queensland",
    "Team in Queensland",
    players.filter((p) => ["Brisbane", "Gold Coast"].includes(p.team)),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "team_bucket",
    "team-adelaide",
    "Team in Adelaide",
    players.filter((p) => ["Adelaide", "Port Adelaide"].includes(p.team)),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "team_bucket",
    "team-perth",
    "Team in Perth",
    players.filter((p) => ["West Coast", "Fremantle"].includes(p.team)),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "team_bucket",
    "team-nsw",
    "Team in New South Wales",
    players.filter((p) => ["Sydney", "GWS"].includes(p.team)),
    dateKey,
    attempt
  );

  for (const [initials, grouped] of byInitials.entries()) {
    if (grouped.length < 4) continue;
    defs.push({
      id: `same-initials-${initials}`,
      family: "name",
      title: `Same Initials (${initials})`,
      playerIds: sampleFourSeeded(
        grouped.map((p) => p.id),
        `${dateKey}-${attempt}-same-initials-${initials}`
      ),
    });
  }

  addSampledFixedCategory(
    defs,
    "name",
    "name-under-10",
    "Full Name has under 10 letters",
    players.filter((p) => getLetterCount(p.name) < 10),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "name",
    "name-over-15",
    "Full Name has more than 15 letters",
    players.filter((p) => getLetterCount(p.name) > 15),
    dateKey,
    attempt
  );

  for (const [team, grouped] of byTeam.entries()) {
    if (grouped.length < 4) continue;
    defs.push({
      id: `same-team-${team}`,
      family: "main",
      title: `Same Team (${team})`,
      playerIds: sampleFourSeeded(
        grouped.map((p) => p.id),
        `${dateKey}-${attempt}-same-team-${team}`
      ),
    });
  }

  for (const [pos, grouped] of byPos.entries()) {
    if (grouped.length < 4) continue;
    defs.push({
      id: `same-position-${pos}`,
      family: "main",
      title: `Same Position (${pos})`,
      playerIds: sampleFourSeeded(
        grouped.map((p) => p.id),
        `${dateKey}-${attempt}-same-position-${pos}`
      ),
    });
  }

  for (const [age, grouped] of byAge.entries()) {
    if (grouped.length < 4) continue;
    defs.push({
      id: `same-age-${age}`,
      family: "main",
      title: `Same Age (${age})`,
      playerIds: sampleFourSeeded(
        grouped.map((p) => p.id),
        `${dateKey}-${attempt}-same-age-${age}`
      ),
    });
  }

  addSampledFixedCategory(
    defs,
    "age_bucket",
    "older-than-30",
    "Older than 30",
    players.filter((p) => (p.age ?? -1) > 30),
    dateKey,
    attempt
  );

  addSampledFixedCategory(
    defs,
    "age_bucket",
    "younger-than-20",
    "Younger than 20",
    players.filter((p) => (p.age ?? 999) < 20),
    dateKey,
    attempt
  );

  return defs;
}

function categoriesOverlap(a: { playerIds: string[] }, b: { playerIds: string[] }) {
  const ids = new Set(a.playerIds);
  return b.playerIds.some((id) => ids.has(id));
}

function countOverlap(selectedIds: string[], categoryIds: string[]) {
  const actual = new Set(categoryIds);
  let matches = 0;
  for (const id of selectedIds) {
    if (actual.has(id)) matches += 1;
  }
  return matches;
}

function generateDailyPuzzle(players: Player[], dateKey: string): Puzzle | null {
  for (let attempt = 0; attempt < 800; attempt += 1) {
    const defs = buildCandidateCategoryDefs(players, dateKey, attempt);
    if (defs.length < 4) continue;

    const shuffledDefs = seededShuffle(defs, `${dateKey}-defs-${attempt}`);
    const chosen: CategoryDef[] = [];
    const usedFamilies = new Set<CategoryFamily>();

    for (const def of shuffledDefs) {
      if (usedFamilies.has(def.family)) continue;
      if (chosen.some((existing) => categoriesOverlap(existing, def))) continue;
      chosen.push(def);
      usedFamilies.add(def.family);
      if (chosen.length === 4) break;
    }

    if (chosen.length !== 4) continue;

    const allIds = chosen.flatMap((c) => c.playerIds);
    if (new Set(allIds).size !== 16) continue;

    const difficultyOrder = seededShuffle(
      [0, 1, 2, 3] as Array<0 | 1 | 2 | 3>,
      `${dateKey}-difficulty-${attempt}`
    );

    const categories: Category[] = chosen
      .map((cat, index) => ({
        ...cat,
        difficulty: difficultyOrder[index],
      }))
      .sort((a, b) => a.difficulty - b.difficulty);

    const cards = seededShuffle(
      allIds.map((id) => players.find((p) => p.id === id)!).filter(Boolean),
      `${dateKey}-cards-${attempt}`
    );

    return {
      dateKey,
      categories,
      cards,
    };
  }

  return null;
}

export default function ConnectionsPage() {
  const players = useMemo(() => parsePlayers(playersData as RawPlayer[]), []);
  const todayKey = useMemo(() => getTodayKey(), []);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [solvedCategoryIds, setSolvedCategoryIds] = useState<string[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState(MAX_MISTAKES);
  const [message, setMessage] = useState("Select 4 players that belong together.");
  const [shake, setShake] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [boardPop, setBoardPop] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");
  const feedbackTimeoutRef = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);

  const storageKey = `connections-daily-${todayKey}`;

  const clearFeedbackTimer = () => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const triggerFeedback = (type: FeedbackState) => {
    clearFeedbackTimer();
    setFeedbackState(type);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedbackState("idle");
      feedbackTimeoutRef.current = null;
    }, 850);
  };

  const saveState = useCallback(
    (nextState: SavedDailyState) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(storageKey, JSON.stringify(nextState));
    },
    [storageKey]
  );

  useEffect(() => {
    const nextPuzzle = generateDailyPuzzle(players, todayKey);
    setPuzzle(nextPuzzle);

    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as SavedDailyState;
          setSolvedCategoryIds(saved.solvedCategoryIds ?? []);
          setMistakesLeft(saved.mistakesLeft ?? MAX_MISTAKES);
          setMessage(saved.message ?? "Select 4 players that belong together.");
          setGameOver(Boolean(saved.gameOver));
        } catch {
          // ignore bad localStorage
        }
      }
    }

    requestAnimationFrame(() => {
      setBoardPop(true);
    });

    return () => {
      if (typeof window !== "undefined") {
        clearFeedbackTimer();
      }
    };
  }, [players, todayKey, storageKey]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      return;
    }
    setBoardPop(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setBoardPop(true));
    });
  }, [solvedCategoryIds.length]);

  const solvedGroups = useMemo<SolvedGroup[]>(() => {
    if (!puzzle) return [];
    return solvedCategoryIds
      .map((categoryId) => {
        const category = puzzle.categories.find((c) => c.id === categoryId);
        if (!category) return null;
        return {
          category,
          players: category.playerIds
            .map((id) => puzzle.cards.find((card) => card.id === id)!)
            .filter(Boolean),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.category.difficulty - b!.category.difficulty) as SolvedGroup[];
  }, [puzzle, solvedCategoryIds]);

  const solvedIdSet = useMemo(() => {
    const ids = new Set<string>();
    for (const group of solvedGroups) {
      for (const player of group.players) ids.add(player.id);
    }
    return ids;
  }, [solvedGroups]);

  const unsolvedCards = useMemo(() => {
    if (!puzzle) return [];
    return puzzle.cards.filter((card) => !solvedIdSet.has(card.id));
  }, [puzzle, solvedIdSet]);

  function persist(
    nextSolvedCategoryIds: string[],
    nextMistakesLeft: number,
    nextMessage: string,
    nextGameOver: boolean
  ) {
    saveState({
      solvedCategoryIds: nextSolvedCategoryIds,
      mistakesLeft: nextMistakesLeft,
      message: nextMessage,
      gameOver: nextGameOver,
    });
  }

  function toggleCard(playerId: string) {
    if (gameOver || solvedIdSet.has(playerId)) return;

    setSelectedIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 4) return prev;
      return [...prev, playerId];
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function shuffleBoard() {
    if (!puzzle || gameOver) return;

    setPuzzle((prev) =>
      prev
        ? {
            ...prev,
            cards: [
              ...solvedGroups.flatMap((g) => g.players),
              ...seededShuffle(
                prev.cards.filter((card) => !solvedIdSet.has(card.id)),
                `${todayKey}-reshuffle-${solvedCategoryIds.join("|")}-${selectedIds.join("|")}`
              ),
            ],
          }
        : prev
    );
  }

  function revealAll() {
    if (!puzzle) return;
    const allSolvedIds = puzzle.categories.map((category) => category.id);
    const nextMessage = "Daily puzzle finished.";
    setSolvedCategoryIds(allSolvedIds);
    setSelectedIds([]);
    setGameOver(true);
    setMessage(nextMessage);
    persist(allSolvedIds, 0, nextMessage, true);
  }

  function submitSelection() {
    if (!puzzle || selectedIds.length !== 4 || gameOver) return;

    const match = puzzle.categories.find((category) => {
      const selected = [...selectedIds].sort().join("|");
      const actual = [...category.playerIds].sort().join("|");
      return selected === actual;
    });

    if (match) {
      const nextSolvedIds = Array.from(new Set([...solvedCategoryIds, match.id]));
      const isComplete = nextSolvedIds.length === 4;
      const nextMessage = isComplete
        ? "Perfect — you solved today’s puzzle."
        : "Correct!";

      setSolvedCategoryIds(nextSolvedIds);
      setSelectedIds([]);
      setGameOver(isComplete);
      setMessage(nextMessage);
      triggerFeedback("correct");
      persist(nextSolvedIds, mistakesLeft, nextMessage, isComplete);
      return;
    }

    let bestOverlap = 0;
    for (const category of puzzle.categories) {
      if (solvedCategoryIds.includes(category.id)) continue;
      bestOverlap = Math.max(bestOverlap, countOverlap(selectedIds, category.playerIds));
    }

    const nextMistakes = mistakesLeft - 1;

    let nextMessage = "Not quite right.";
    if (bestOverlap === 3) {
      nextMessage = "1 off.";
    } else if (bestOverlap === 2) {
      nextMessage = "2 off.";
    } else if (nextMistakes <= 0) {
      nextMessage = "No mistakes left.";
    }

    setMistakesLeft(nextMistakes);
    setMessage(nextMessage);
    setShake(true);
    triggerFeedback("wrong");
    window.setTimeout(() => setShake(false), 380);

    if (nextMistakes <= 0) {
      revealAll();
    } else {
      persist(solvedCategoryIds, nextMistakes, nextMessage, false);
    }
  }

  if (!puzzle) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <style>{globalKeyframes}</style>
          <div style={styles.headerKicker}>DAILY CONNECTIONS</div>
          <h1 style={styles.title}>Couldn’t build today’s puzzle</h1>
          <p style={styles.subtitle}>Try refreshing the page.</p>
        </div>
      </main>
    );
  }

  const solvedCount = solvedGroups.length;
  const selectedCount = selectedIds.length;

  return (
    <main
      style={{
        ...styles.page,
        ...(feedbackState === "correct" ? styles.pageCorrectFlash : {}),
        ...(feedbackState === "wrong" ? styles.pageWrongFlash : {}),
      }}
    >
      <style>{globalKeyframes}</style>

      <div style={styles.container}>
        <div style={styles.headerKicker}>DAILY CONNECTIONS</div>
        <h1 style={styles.title}>Find 4 groups of 4 AFL players</h1>
        <p style={styles.subtitle}>
          One puzzle per day. Come back tomorrow for a new one.
        </p>

        <div style={styles.metaRow}>
          <div style={styles.metaBox}>Date: {todayKey}</div>
          <div style={styles.metaBox}>Mistakes left: {mistakesLeft}</div>
          <div style={styles.metaBox}>Groups solved: {solvedCount}/4</div>
          <div style={styles.metaBox}>Selected: {selectedCount}/4</div>
        </div>

        {solvedGroups.length > 0 && (
          <div style={styles.solvedStack}>
            {solvedGroups.map((group, index) => {
              const theme = DIFFICULTY_STYLES[group.category.difficulty];
              return (
                <div
                  key={group.category.id}
                  style={{
                    ...styles.solvedGroup,
                    ...styles.fadeUp,
                    animationDelay: `${index * 0.06}s`,
                    background: theme.bg,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  <div style={styles.solvedTitle}>{group.category.title}</div>
                  <div style={styles.solvedPlayers}>
                    {group.players.map((player) => player.name).join(" · ")}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            ...styles.grid,
            ...(shake ? styles.gridShake : {}),
            ...(boardPop ? styles.boardPop : {}),
          }}
        >
          {unsolvedCards.map((player, index) => {
            const selected = selectedIds.includes(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => toggleCard(player.id)}
                style={{
                  ...styles.card,
                  ...styles.fadeUp,
                  animationDelay: `${index * 0.025}s`,
                  ...(selected ? styles.cardSelected : {}),
                }}
              >
                <span style={styles.cardText}>{player.name}</span>
              </button>
            );
          })}
        </div>

        <div style={styles.statusRow}>
          <div
            style={{
              ...styles.statusText,
              ...(feedbackState === "correct" ? styles.statusCorrect : {}),
              ...(feedbackState === "wrong" ? styles.statusWrong : {}),
            }}
          >
            {message}
          </div>
        </div>

        <div style={styles.controls}>
          <button type="button" onClick={shuffleBoard} style={styles.secondaryButton}>
            Shuffle
          </button>
          <button type="button" onClick={clearSelection} style={styles.secondaryButton}>
            Clear
          </button>
          <button
            type="button"
            onClick={submitSelection}
            style={{
              ...styles.primaryButton,
              opacity: selectedIds.length === 4 && !gameOver ? 1 : 0.55,
            }}
            disabled={selectedIds.length !== 4 || gameOver}
          >
            Submit
          </button>
        </div>
      </div>
    </main>
  );
}

const globalKeyframes = `
@keyframes fadeUpIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes boardPopIn {
  from {
    opacity: 0.75;
    transform: scale(0.992);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes gridShake {
  0% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
  100% { transform: translateX(0); }
}

@keyframes greenFlash {
  0% { box-shadow: inset 0 0 0 0 rgba(49, 163, 84, 0.00); }
  15% { box-shadow: inset 0 0 0 9999px rgba(49, 163, 84, 0.18); }
  100% { box-shadow: inset 0 0 0 9999px rgba(49, 163, 84, 0.00); }
}

@keyframes redFlash {
  0% { box-shadow: inset 0 0 0 0 rgba(220, 38, 38, 0.00); }
  15% { box-shadow: inset 0 0 0 9999px rgba(220, 38, 38, 0.16); }
  100% { box-shadow: inset 0 0 0 9999px rgba(220, 38, 38, 0.00); }
}
`;

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4efe3",
    backgroundImage: "radial-gradient(rgba(42,17,75,0.08) 1px, transparent 1px)",
    backgroundSize: "14px 14px",
    padding: "28px 16px 56px",
    color: "#1d0b38",
    fontFamily: "Inter, Arial, sans-serif",
    transition: "background-color 0.2s ease",
  },
  pageCorrectFlash: {
    animation: "greenFlash 0.85s ease",
  },
  pageWrongFlash: {
    animation: "redFlash 0.85s ease",
  },
  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  headerKicker: {
    fontSize: "0.92rem",
    fontWeight: 900,
    letterSpacing: "0.14em",
    color: "#4b5563",
    marginBottom: "10px",
    animation: "fadeUpIn 0.45s ease",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "clamp(2.2rem, 5vw, 4rem)",
    lineHeight: 0.95,
    fontWeight: 1000,
    letterSpacing: "-0.04em",
    animation: "fadeUpIn 0.5s ease",
  },
  subtitle: {
    margin: "0 0 18px",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#5b5568",
    animation: "fadeUpIn 0.55s ease",
  },
  metaRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  metaBox: {
    border: "4px solid #2a114b",
    background: "#fffaf0",
    padding: "12px 14px",
    fontWeight: 900,
    fontSize: "0.98rem",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
    transition: "transform 0.14s ease, box-shadow 0.14s ease",
    animation: "fadeUpIn 0.5s ease",
  },
  solvedStack: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "14px",
  },
  solvedGroup: {
    border: "4px solid",
    padding: "14px 16px",
    textAlign: "center",
    boxShadow: "0 5px 0 rgba(42,17,75,0.10)",
  },
  solvedTitle: {
    fontSize: "1rem",
    fontWeight: 1000,
    marginBottom: "6px",
  },
  solvedPlayers: {
    fontSize: "0.96rem",
    fontWeight: 800,
    lineHeight: 1.45,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: "14px",
  },
  gridShake: {
    animation: "gridShake 0.38s ease",
  },
  boardPop: {
    animation: "boardPopIn 0.24s ease",
  },
  card: {
    minHeight: "94px",
    border: "4px solid #2a114b",
    background: "#fffaf0",
    color: "#1d0b38",
    fontSize: "1rem",
    fontWeight: 1000,
    padding: "12px",
    cursor: "pointer",
    lineHeight: 1.2,
    transition:
      "transform 0.14s ease, background 0.14s ease, box-shadow 0.14s ease, color 0.14s ease",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
    transform: "translateY(0)",
  },
  cardSelected: {
    background: "#2a114b",
    color: "#ffffff",
    transform: "translateY(-2px) scale(1.015)",
    boxShadow: "0 8px 0 rgba(42,17,75,0.16)",
  },
  cardText: {
    display: "block",
    transition: "transform 0.14s ease",
  },
  statusRow: {
    minHeight: "28px",
    marginBottom: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: "1rem",
    fontWeight: 900,
    color: "#2a114b",
    textAlign: "center",
    animation: "fadeUpIn 0.3s ease",
    transition: "transform 0.14s ease, color 0.14s ease",
  },
  statusCorrect: {
    color: "#1f7a34",
    transform: "scale(1.03)",
  },
  statusWrong: {
    color: "#b91c1c",
    transform: "scale(1.03)",
  },
  controls: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  primaryButton: {
    minWidth: "130px",
    height: "56px",
    border: "4px solid #2a114b",
    background: "#2a114b",
    color: "#ffffff",
    fontWeight: 1000,
    fontSize: "1rem",
    cursor: "pointer",
    transition:
      "transform 0.14s ease, box-shadow 0.14s ease, opacity 0.14s ease, filter 0.14s ease",
    boxShadow: "0 4px 0 rgba(42,17,75,0.14)",
  },
  secondaryButton: {
    minWidth: "130px",
    height: "56px",
    border: "4px solid #2a114b",
    background: "#fffaf0",
    color: "#2a114b",
    fontWeight: 1000,
    fontSize: "1rem",
    cursor: "pointer",
    transition:
      "transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease, filter 0.14s ease",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
  fadeUp: {
    animation: "fadeUpIn 0.28s ease both",
  },
};