"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import playersData from "../data/afl_players26.json";

type RawPlayer = Record<string, unknown>;

type Player = {
  id: string;
  name: string;
  team: string;
  state: string;
  pos: string;
  initials: string;
  firstInitial: string;
  surnameInitial: string;
  age: number | null;
  number: number | null;
  disposals: number | null;
  goals: number | null;
  kicks: number | null;
  handballs: number | null;
  marks: number | null;
  tackles: number | null;
  hitouts: number | null;
  sc_points: number | null;
  bounces: number | null;
  metres_gained: number | null;
};

type CategoryKey =
  | "team"
  | "pos"
  | "state"
  | "age"
  | "initials"
  | "first_initial"
  | "surname_initial"
  | "number"
  | "disposals"
  | "goals"
  | "kicks"
  | "handballs"
  | "marks"
  | "tackles"
  | "hitouts"
  | "sc_points"
  | "bounces"
  | "metres_gained";

type Category = {
  id: string;
  key: CategoryKey;
  value: string | number;
  title: string;
  difficulty: 0 | 1 | 2 | 3;
  playerIds: string[];
};

type Puzzle = {
  categories: Category[];
  cards: Player[];
};

type SolvedGroup = {
  category: Category;
  players: Player[];
};

const MAX_MISTAKES = 4;

const DIFFICULTY_STYLES = [
  {
    bg: "#f9df6d",
    border: "#d7b93f",
    text: "#1f1730",
  },
  {
    bg: "#a0c35a",
    border: "#7da040",
    text: "#1f1730",
  },
  {
    bg: "#b0c4ef",
    border: "#8ca5da",
    text: "#1f1730",
  },
  {
    bg: "#ba81c5",
    border: "#9163a0",
    text: "#ffffff",
  },
] as const;

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  team: "Same team",
  pos: "Same position",
  state: "Same state",
  age: "Same age",
  initials: "Same initials",
  first_initial: "Same first initial",
  surname_initial: "Same surname initial",
  number: "Same jumper number",
  disposals: "Same disposals",
  goals: "Same goals",
  kicks: "Same kicks",
  handballs: "Same handballs",
  marks: "Same marks",
  tackles: "Same tackles",
  hitouts: "Same hitouts",
  sc_points: "Same SC points",
  bounces: "Same bounces",
  metres_gained: "Same metres gained",
};

const CATEGORY_PRIORITY: CategoryKey[] = [
  "team",
  "pos",
  "state",
  "age",
  "initials",
  "first_initial",
  "surname_initial",
  "number",
  "goals",
  "disposals",
  "marks",
  "tackles",
  "kicks",
  "handballs",
  "bounces",
  "hitouts",
  "sc_points",
  "metres_gained",
];

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleFour<T>(arr: T[]): T[] {
  return shuffle(arr).slice(0, 4);
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

function toTitleCase(value: string): string {
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

function getInitialParts(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  const firstInitial = first ? first[0].toUpperCase() : "";
  const surnameInitial = last ? last[0].toUpperCase() : "";
  const initials =
    parts.length >= 2
      ? `${firstInitial}${surnameInitial}`
      : firstInitial || "";
  return { firstInitial, surnameInitial, initials };
}

function parsePlayers(raw: RawPlayer[]): Player[] {
  return raw
    .map((p, index) => {
      const name = getName(p);
      const team = normaliseTeam(
        toUpperString(p.team ?? p.club ?? p.Team ?? "")
      );
      const state = toTitleCase(
        String(p.state ?? p.State ?? p.home_state ?? "").trim()
      );
      const pos = normalisePos(
        toUpperString(p.pos ?? p.position ?? p.Pos ?? p.Position ?? "")
      );
      const { initials, firstInitial, surnameInitial } = getInitialParts(name);

      return {
        id: String(p.id ?? `${name}-${team}-${index}`),
        name,
        team,
        state,
        pos,
        initials,
        firstInitial,
        surnameInitial,
        age: toNumber(p.age),
        number: toNumber(p.number ?? p.jumper ?? p.guernsey),
        disposals: toNumber(p.disposals),
        goals: toNumber(p.goals),
        kicks: toNumber(p.kicks),
        handballs: toNumber(p.handballs),
        marks: toNumber(p.marks),
        tackles: toNumber(p.tackles),
        hitouts: toNumber(p.hitouts),
        sc_points: toNumber(p.sc_points),
        bounces: toNumber(p.bounces),
        metres_gained: toNumber(p.metres_gained),
      };
    })
    .filter((p) => p.name && p.team);
}

function valueForKey(player: Player, key: CategoryKey): string | number | null {
  switch (key) {
    case "first_initial":
      return player.firstInitial || null;
    case "surname_initial":
      return player.surnameInitial || null;
    default:
      return player[key];
  }
}

function createCategoryTitle(key: CategoryKey, value: string | number): string {
  return `${CATEGORY_LABELS[key]}: ${value}`;
}

function isUsefulNumericCategory(key: CategoryKey, value: number) {
  if (
    [
      "disposals",
      "goals",
      "kicks",
      "handballs",
      "marks",
      "tackles",
      "hitouts",
      "sc_points",
      "bounces",
      "metres_gained",
    ].includes(key)
  ) {
    return value > 0;
  }
  return true;
}

function buildCandidateCategories(players: Player[]): Category[] {
  const categories: Category[] = [];

  for (const key of CATEGORY_PRIORITY) {
    const groups = new Map<string, Player[]>();

    for (const player of players) {
      const rawValue = valueForKey(player, key);
      if (rawValue === null || rawValue === "") continue;

      if (typeof rawValue === "number" && !isUsefulNumericCategory(key, rawValue)) {
        continue;
      }

      const valueKey = String(rawValue);
      if (!groups.has(valueKey)) groups.set(valueKey, []);
      groups.get(valueKey)!.push(player);
    }

    for (const [valueKey, groupPlayers] of groups.entries()) {
      const uniqueIds = Array.from(new Set(groupPlayers.map((p) => p.id)));
      if (uniqueIds.length < 4) continue;

      const sampled = sampleFour(
        uniqueIds.map((id) => groupPlayers.find((p) => p.id === id)!)
      );

      const rawValue = valueForKey(sampled[0], key);
      if (rawValue === null || rawValue === "") continue;

      categories.push({
        id: `${key}-${String(rawValue)}`,
        key,
        value: rawValue,
        title: createCategoryTitle(key, rawValue),
        difficulty: 0,
        playerIds: sampled.map((p) => p.id),
      });
    }
  }

  const keyRank = new Map(CATEGORY_PRIORITY.map((key, idx) => [key, idx]));
  return shuffle(categories).sort(
    (a, b) => (keyRank.get(a.key) ?? 999) - (keyRank.get(b.key) ?? 999)
  );
}

function categoriesOverlap(a: Category, b: Category): boolean {
  const ids = new Set(a.playerIds);
  return b.playerIds.some((id) => ids.has(id));
}

function generatePuzzle(players: Player[]): Puzzle | null {
  const candidates = buildCandidateCategories(players);
  if (candidates.length < 4) return null;

  for (let attempt = 0; attempt < 700; attempt += 1) {
    const chosen: Category[] = [];

    for (const candidate of shuffle(candidates)) {
      if (chosen.some((existing) => categoriesOverlap(existing, candidate))) continue;
      chosen.push(candidate);
      if (chosen.length === 4) break;
    }

    if (chosen.length !== 4) continue;

    const allIds = chosen.flatMap((c) => c.playerIds);
    if (new Set(allIds).size !== 16) continue;

    const categoryOrder = shuffle([0, 1, 2, 3]) as Array<0 | 1 | 2 | 3>;
    const finalCategories = chosen.map((cat, idx) => ({
      ...cat,
      difficulty: categoryOrder[idx],
    }));

    const selectedPlayers = allIds.map(
      (id) => players.find((p) => p.id === id)!
    );

    return {
      categories: finalCategories.sort((a, b) => a.difficulty - b.difficulty),
      cards: shuffle(selectedPlayers),
    };
  }

  return null;
}

export default function ConnectionsPage() {
  const players = useMemo(() => parsePlayers(playersData as RawPlayer[]), []);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<SolvedGroup[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState(MAX_MISTAKES);
  const [message, setMessage] = useState("Select 4 players that belong together.");
  const [shake, setShake] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const startNewPuzzle = useCallback(() => {
    let next: Puzzle | null = null;

    for (let i = 0; i < 25; i += 1) {
      next = generatePuzzle(players);
      if (next) break;
    }

    setPuzzle(next);
    setSelectedIds([]);
    setSolvedGroups([]);
    setMistakesLeft(MAX_MISTAKES);
    setMessage("Select 4 players that belong together.");
    setShake(false);
    setGameOver(false);
  }, [players]);

  useEffect(() => {
    startNewPuzzle();
  }, [startNewPuzzle]);

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
              ...shuffle(prev.cards.filter((card) => !solvedIdSet.has(card.id))),
            ],
          }
        : prev
    );
  }

  function revealAll() {
    if (!puzzle) return;

    const allSolved = puzzle.categories.map((category) => ({
      category,
      players: category.playerIds.map(
        (id) => puzzle.cards.find((card) => card.id === id)!
      ),
    }));

    setSolvedGroups(allSolved);
    setSelectedIds([]);
    setGameOver(true);
    setMessage("Puzzle revealed.");
  }

  function submitSelection() {
    if (!puzzle || selectedIds.length !== 4 || gameOver) return;

    const match = puzzle.categories.find((category) => {
      const selected = [...selectedIds].sort().join("|");
      const actual = [...category.playerIds].sort().join("|");
      return selected === actual;
    });

    if (match) {
      const solvedPlayers = match.playerIds.map(
        (id) => puzzle.cards.find((card) => card.id === id)!
      );

      const nextSolved = [...solvedGroups, { category: match, players: solvedPlayers }].sort(
        (a, b) => a.category.difficulty - b.category.difficulty
      );

      setSolvedGroups(nextSolved);
      setSelectedIds([]);

      if (nextSolved.length === 4) {
        setGameOver(true);
        setMessage("Perfect — you solved all 4 groups.");
      } else {
        setMessage("Correct!");
      }
      return;
    }

    const nextMistakes = mistakesLeft - 1;
    setMistakesLeft(nextMistakes);
    setMessage(nextMistakes <= 0 ? "No mistakes left." : "Not quite right.");
    setShake(true);
    setTimeout(() => setShake(false), 350);

    if (nextMistakes <= 0) {
      revealAll();
    }
  }

  if (!puzzle) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.headerKicker}>CONNECTIONS</div>
          <h1 style={styles.title}>Couldn’t build puzzle</h1>
          <p style={styles.subtitle}>Try refreshing or pressing New Game.</p>
          <div style={styles.controls}>
            <button type="button" onClick={startNewPuzzle} style={styles.secondaryButton}>
              New Game
            </button>
          </div>
        </div>
      </main>
    );
  }

  const solvedCount = solvedGroups.length;
  const selectedCount = selectedIds.length;

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerKicker}>CONNECTIONS</div>
        <h1 style={styles.title}>Find 4 groups of 4 AFL players</h1>
        <p style={styles.subtitle}>
          Group the 16 players into 4 connected categories.
        </p>

        <div style={styles.metaRow}>
          <div style={styles.metaBox}>Mistakes left: {mistakesLeft}</div>
          <div style={styles.metaBox}>Groups solved: {solvedCount}/4</div>
          <div style={styles.metaBox}>Selected: {selectedCount}/4</div>
        </div>

        {solvedGroups.length > 0 && (
          <div style={styles.solvedStack}>
            {solvedGroups.map((group) => {
              const theme = DIFFICULTY_STYLES[group.category.difficulty];
              return (
                <div
                  key={group.category.id}
                  style={{
                    ...styles.solvedGroup,
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

        <div style={{ ...styles.grid, ...(shake ? styles.gridShake : {}) }}>
          {unsolvedCards.map((player) => {
            const selected = selectedIds.includes(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => toggleCard(player.id)}
                style={{
                  ...styles.card,
                  ...(selected ? styles.cardSelected : {}),
                }}
              >
                {player.name}
              </button>
            );
          })}
        </div>

        <div style={styles.statusRow}>
          <div style={styles.statusText}>{message}</div>
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
          <button type="button" onClick={startNewPuzzle} style={styles.secondaryButton}>
            New Game
          </button>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4efe3",
    backgroundImage: "radial-gradient(rgba(42,17,75,0.08) 1px, transparent 1px)",
    backgroundSize: "14px 14px",
    padding: "28px 16px 56px",
    color: "#1d0b38",
    fontFamily: "Inter, Arial, sans-serif",
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
  },
  title: {
    margin: "0 0 8px",
    fontSize: "clamp(2.2rem, 5vw, 4rem)",
    lineHeight: 0.95,
    fontWeight: 1000,
    letterSpacing: "-0.04em",
  },
  subtitle: {
    margin: "0 0 18px",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#5b5568",
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
    transform: "translateX(0)",
    animation: "gridShake 0.35s ease",
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
    transition: "transform 0.12s ease, background 0.12s ease, box-shadow 0.12s ease",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
  cardSelected: {
    background: "#2a114b",
    color: "#ffffff",
    transform: "translateY(-2px) scale(1.01)",
    boxShadow: "0 8px 0 rgba(42,17,75,0.16)",
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
    transition: "transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
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
    transition: "transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
};