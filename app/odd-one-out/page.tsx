"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import playersData from "../data/afl_players26.json";

type RawPlayer = Record<string, unknown>;

type Player = {
  id: string;
  name: string;
  team: string;
  pos: string;
  age: number | null;
  number: number | null;
  disposals: number | null;
  goals: number | null;
  initials: string;
};

type GroupCategory =
  | "team"
  | "position"
  | "age"
  | "initials"
  | "singleDigitNumber"
  | "fortyPlusNumber"
  | "goals10Plus"
  | "disposals25Plus"
  | "disposals30Plus"
  | "firstLetter"
  | "lastLetter"
  | "ageUnder21"
  | "ageOver30"
  | "jumperRange1"
  | "jumperRange2"
  | "jumperRange3"
  | "nonMidfielders";

type RoundData = {
  categoryKey: GroupCategory;
  categoryLabel: string;
  commonValueLabel: string;
  cards: Player[];
  oddOneOutId: string;
};

type SavedGameState = {
  round: number;
  lives: number;
  score: number;
  gameOver: boolean;
  feedback: string;
  selectedId: string | null;
  roundSeed: number;
  roundResolved: boolean;
};

const MAX_LIVES = 3;
const STORAGE_KEY = "odd-one-out-progress-v6";

const TEAM_META: Record<
  string,
  {
    icon: string;
    bg: string;
    text: string;
    border: string;
    accent: string;
  }
> = {
  Adelaide: {
    icon: "/team-icons/adelaide.png",
    bg: "#0d1b3d",
    text: "#ffffff",
    border: "#d61f2c",
    accent: "#f2c14e",
  },
  Brisbane: {
    icon: "/team-icons/brisbane.png",
    bg: "#7b1530",
    text: "#ffffff",
    border: "#0f4fa8",
    accent: "#f2c14e",
  },
  Carlton: {
    icon: "/team-icons/carlton.png",
    bg: "#0a2342",
    text: "#ffffff",
    border: "#d9e6f2",
    accent: "#7fc8ff",
  },
  Collingwood: {
    icon: "/team-icons/collingwood.png",
    bg: "#111111",
    text: "#ffffff",
    border: "#f4f4f4",
    accent: "#cfcfcf",
  },
  Essendon: {
    icon: "/team-icons/essendon.png",
    bg: "#131313",
    text: "#ffffff",
    border: "#d71920",
    accent: "#ff6b6b",
  },
  Fremantle: {
    icon: "/team-icons/fremantle.png",
    bg: "#2a114b",
    text: "#ffffff",
    border: "#b08cff",
    accent: "#d9c2ff",
  },
  Geelong: {
    icon: "/team-icons/geelong.png",
    bg: "#10294b",
    text: "#ffffff",
    border: "#d9dfe8",
    accent: "#88b8ff",
  },
  "Gold Coast": {
    icon: "/team-icons/goldcoast.png",
    bg: "#b21f2d",
    text: "#ffffff",
    border: "#f2c14e",
    accent: "#ffdf8a",
  },
  GWS: {
    icon: "/team-icons/gws.png",
    bg: "#f15a22",
    text: "#111111",
    border: "#2f2f2f",
    accent: "#ffd1bf",
  },
  Hawthorn: {
    icon: "/team-icons/hawthorn.png",
    bg: "#4b2e19",
    text: "#ffffff",
    border: "#f2c14e",
    accent: "#ffdb8a",
  },
  Melbourne: {
    icon: "/team-icons/melbourne.png",
    bg: "#0d1b3d",
    text: "#ffffff",
    border: "#d71920",
    accent: "#7fc8ff",
  },
  "North Melbourne": {
    icon: "/team-icons/northmelbourne.png",
    bg: "#1357a6",
    text: "#ffffff",
    border: "#f4f4f4",
    accent: "#b7d5ff",
  },
  "Port Adelaide": {
    icon: "/team-icons/portadelaide.png",
    bg: "#111111",
    text: "#ffffff",
    border: "#48a6d9",
    accent: "#bfe8ff",
  },
  Richmond: {
    icon: "/team-icons/richmond.png",
    bg: "#121212",
    text: "#ffffff",
    border: "#f2c14e",
    accent: "#ffe28a",
  },
  "St Kilda": {
    icon: "/team-icons/stkilda.png",
    bg: "#1a1a1a",
    text: "#ffffff",
    border: "#d71920",
    accent: "#f4f4f4",
  },
  Sydney: {
    icon: "/team-icons/sydney.png",
    bg: "#b11226",
    text: "#ffffff",
    border: "#f4f4f4",
    accent: "#ffd2d8",
  },
  "West Coast": {
    icon: "/team-icons/westcoast.png",
    bg: "#0d2a5c",
    text: "#ffffff",
    border: "#f2c14e",
    accent: "#ffd86e",
  },
  "Western Bulldogs": {
    icon: "/team-icons/westernbulldogs.png",
    bg: "#114b9b",
    text: "#ffffff",
    border: "#d71920",
    accent: "#d9e8ff",
  },
};

function randomInt(max: number) {
  return Math.floor(Math.random() * max);
}

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
    "ST. KILDA": "St Kilda",
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

function getName(p: RawPlayer) {
  return String(p.name ?? p.player ?? p.full_name ?? p.fullName ?? "").trim();
}

function getInitials(name: string) {
  const suffixes = ["JR", "JNR", "SR", "SNR", "II", "III", "IV", "JUNIOR"];

  const parts = name
    .split(/\s+/)
    .map((p) => p.replace(".", "").toUpperCase())
    .filter(Boolean);

  if (parts.length === 0) return "";

  if (suffixes.includes(parts[parts.length - 1])) {
    parts.pop();
  }

  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";

  return parts.length >= 2 ? `${first}${last}` : first;
}

function getFirstLetter(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function getLastNameLetter(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const last = parts[parts.length - 1].replace(/\./g, "").toUpperCase();
  return last.charAt(0);
}

function dedupePlayers(players: Player[]) {
  const seen = new Set<string>();
  const result: Player[] = [];

  for (const player of players) {
    const key = `${player.name.toLowerCase()}|${player.team.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(player);
  }

  return result;
}

function parsePlayers(raw: RawPlayer[]): Player[] {
  const parsed = raw
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
        pos,
        age: toNumber(p.age),
        number: toNumber(p.number ?? p.jumper ?? p.guernsey),
        disposals: toNumber(p.disposals),
        goals: toNumber(p.goals),
        initials: getInitials(name),
      };
    })
    .filter((p) => p.name && p.team);

  return dedupePlayers(parsed);
}

function uniquePlayers(players: Player[]) {
  return Array.from(new Map(players.map((p) => [p.id, p])).values());
}

function notInIds(players: Player[], ids: string[]) {
  const blocked = new Set(ids);
  return players.filter((p) => !blocked.has(p.id));
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number) {
  const rand = createSeededRandom(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleDistinctSeeded<T>(items: T[], count: number, rand: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function buildRound(players: Player[], seed: number): RoundData | null {
  const rand = createSeededRandom(seed);
  const candidates: RoundData[] = [];

  const byTeam = new Map<string, Player[]>();
  const byPos = new Map<string, Player[]>();
  const byAge = new Map<string, Player[]>();
  const byInitials = new Map<string, Player[]>();
  const byFirstLetter = new Map<string, Player[]>();
  const byLastLetter = new Map<string, Player[]>();

  for (const player of players) {
    if (!byTeam.has(player.team)) byTeam.set(player.team, []);
    byTeam.get(player.team)!.push(player);

    if (!byPos.has(player.pos)) byPos.set(player.pos, []);
    byPos.get(player.pos)!.push(player);

    if (player.age !== null) {
      const key = String(player.age);
      if (!byAge.has(key)) byAge.set(key, []);
      byAge.get(key)!.push(player);
    }

    if (player.initials) {
      if (!byInitials.has(player.initials)) byInitials.set(player.initials, []);
      byInitials.get(player.initials)!.push(player);
    }

    const firstLetter = getFirstLetter(player.name);
    if (firstLetter) {
      if (!byFirstLetter.has(firstLetter)) byFirstLetter.set(firstLetter, []);
      byFirstLetter.get(firstLetter)!.push(player);
    }

    const lastLetter = getLastNameLetter(player.name);
    if (lastLetter) {
      if (!byLastLetter.has(lastLetter)) byLastLetter.set(lastLetter, []);
      byLastLetter.get(lastLetter)!.push(player);
    }
  }

  function addRound(
    categoryKey: GroupCategory,
    categoryLabel: string,
    commonValueLabel: string,
    matchingPlayers: Player[],
    oddPool: Player[]
  ) {
    const uniqueMatching = uniquePlayers(matchingPlayers);
    const uniqueOddPool = uniquePlayers(oddPool);

    if (uniqueMatching.length < 3 || uniqueOddPool.length < 1) return;

    const commonThree = sampleDistinctSeeded(uniqueMatching, 3, rand);
    const commonIds = commonThree.map((p) => p.id);
    const oddChoices = notInIds(uniqueOddPool, commonIds);

    if (oddChoices.length < 1) return;

    const oddOne = sampleDistinctSeeded(oddChoices, 1, rand)[0];
    const finalCards = uniquePlayers([...commonThree, oddOne]);

    if (finalCards.length !== 4) return;

    candidates.push({
      categoryKey,
      categoryLabel,
      commonValueLabel,
      cards: sampleDistinctSeeded(finalCards, finalCards.length, rand),
      oddOneOutId: oddOne.id,
    });
  }

  for (const [team, grouped] of byTeam.entries()) {
    addRound("team", "Same Team", team, grouped, players.filter((p) => p.team !== team));
  }

  for (const [pos, grouped] of byPos.entries()) {
    addRound("position", "Same Position", pos, grouped, players.filter((p) => p.pos !== pos));
  }

  for (const [age, grouped] of byAge.entries()) {
    addRound("age", "Same Age", age, grouped, players.filter((p) => String(p.age) !== age));
  }

  for (const [initials, grouped] of byInitials.entries()) {
    if (rand() > 0.3) continue;
    addRound(
      "initials",
      "Same Initials",
      initials,
      grouped,
      players.filter((p) => p.initials !== initials)
    );
  }

  for (const [letter, grouped] of byFirstLetter.entries()) {
    addRound(
      "firstLetter",
      "Same First Letter",
      letter,
      grouped,
      players.filter((p) => getFirstLetter(p.name) !== letter)
    );
  }

  for (const [letter, grouped] of byLastLetter.entries()) {
    addRound(
      "lastLetter",
      "Same Last Name Letter",
      letter,
      grouped,
      players.filter((p) => getLastNameLetter(p.name) !== letter)
    );
  }

  addRound(
    "singleDigitNumber",
    "Single Digit Jersey Number",
    "Single Digit",
    players.filter((p) => p.number !== null && p.number >= 1 && p.number <= 9),
    players.filter((p) => p.number === null || p.number < 1 || p.number > 9)
  );

  addRound(
    "fortyPlusNumber",
    "Jersey Number 40+",
    "40+",
    players.filter((p) => p.number !== null && p.number >= 40),
    players.filter((p) => p.number === null || p.number < 40)
  );

  addRound(
    "goals10Plus",
    "10+ Goals (2026)",
    "10+ Goals",
    players.filter((p) => (p.goals ?? 0) >= 10),
    players.filter((p) => (p.goals ?? 0) < 10)
  );

  addRound(
    "disposals25Plus",
    "25+ Disposal Avg (2026)",
    "25+ Disposals",
    players.filter((p) => (p.disposals ?? 0) >= 25),
    players.filter((p) => (p.disposals ?? 0) < 25)
  );

  addRound(
    "disposals30Plus",
    "30+ Disposal Avg (2026)",
    "30+ Disposals",
    players.filter((p) => (p.disposals ?? 0) >= 30),
    players.filter((p) => (p.disposals ?? 0) < 30)
  );

  addRound(
    "ageUnder21",
    "Under 21",
    "<21",
    players.filter((p) => p.age !== null && p.age < 21),
    players.filter((p) => p.age === null || p.age >= 21)
  );

  addRound(
    "ageOver30",
    "Age 30+",
    "30+",
    players.filter((p) => p.age !== null && p.age >= 30),
    players.filter((p) => p.age === null || p.age < 30)
  );

  addRound(
    "jumperRange1",
    "Jumper 1–10",
    "1–10",
    players.filter((p) => p.number !== null && p.number >= 1 && p.number <= 10),
    players.filter((p) => p.number === null || p.number < 1 || p.number > 10)
  );

  addRound(
    "jumperRange2",
    "Jumper 11–25",
    "11–25",
    players.filter((p) => p.number !== null && p.number >= 11 && p.number <= 25),
    players.filter((p) => p.number === null || p.number < 11 || p.number > 25)
  );

  addRound(
    "jumperRange3",
    "Jumper 26+",
    "26+",
    players.filter((p) => p.number !== null && p.number >= 26),
    players.filter((p) => p.number === null || p.number < 26)
  );

  addRound(
    "nonMidfielders",
    "Non-Midfielders",
    "Non-Mids",
    players.filter((p) => p.pos !== "Midfielder"),
    players.filter((p) => p.pos === "Midfielder")
  );

  if (candidates.length === 0) return null;

  return sampleDistinctSeeded(candidates, 1, rand)[0];
}

function getTeamMeta(team: string) {
  return (
    TEAM_META[team] ?? {
      icon: "",
      bg: "#1f2937",
      text: "#ffffff",
      border: "#64748b",
      accent: "#cbd5e1",
    }
  );
}

function formatStatValue(player: Player, categoryKey: GroupCategory) {
  switch (categoryKey) {
    case "team":
      return player.team;
    case "position":
      return player.pos;
    case "age":
      return player.age !== null ? String(player.age) : "—";
    case "initials":
      return player.initials || "—";
    case "singleDigitNumber":
    case "fortyPlusNumber":
    case "jumperRange1":
    case "jumperRange2":
    case "jumperRange3":
      return player.number !== null ? String(player.number) : "—";
    case "goals10Plus":
      return player.goals !== null ? String(player.goals) : "—";
    case "disposals25Plus":
    case "disposals30Plus":
      return player.disposals !== null ? player.disposals.toFixed(1) : "—";
    case "firstLetter":
      return getFirstLetter(player.name) || "—";
    case "lastLetter":
      return getLastNameLetter(player.name) || "—";
    case "ageUnder21":
    case "ageOver30":
      return player.age !== null ? String(player.age) : "—";
    case "nonMidfielders":
      return player.pos;
    default:
      return "—";
  }
}

function getStatLabel(categoryKey: GroupCategory) {
  switch (categoryKey) {
    case "team":
      return "TEAM";
    case "position":
      return "POS";
    case "age":
    case "ageUnder21":
    case "ageOver30":
      return "AGE";
    case "initials":
      return "INIT";
    case "firstLetter":
      return "FL";
    case "lastLetter":
      return "LL";
    case "singleDigitNumber":
    case "fortyPlusNumber":
    case "jumperRange1":
    case "jumperRange2":
    case "jumperRange3":
      return "#";
    case "goals10Plus":
      return "GOALS";
    case "disposals25Plus":
    case "disposals30Plus":
      return "DISP";
    case "nonMidfielders":
      return "POS";
    default:
      return "STAT";
  }
}

function getStatFontSize(categoryKey: GroupCategory) {
  switch (categoryKey) {
    case "team":
      return "1.15rem";
    case "position":
    case "nonMidfielders":
      return "1.25rem";
    default:
      return "4.1rem";
  }
}

function getCardStyle(player: Player, selected: boolean, revealed: boolean): CSSProperties {
  const meta = getTeamMeta(player.team);

  return {
    ...styles.cardBase,
    background: meta.bg,
    color: meta.text,
    borderColor: selected ? meta.accent : meta.border,
    boxShadow: selected
      ? `0 0 0 4px ${meta.accent}, 0 18px 34px rgba(0,0,0,0.30), inset 0 0 0 2px rgba(255,255,255,0.18)`
      : `0 10px 24px rgba(0,0,0,0.22), inset 0 0 0 1px ${meta.accent}22`,
    ...(selected ? styles.cardSelected : {}),
    ...(revealed ? styles.cardRevealed : {}),
  };
}

export default function OddOneOutPage() {
  const players = useMemo(() => parsePlayers(playersData as RawPlayer[]), []);
  const [round, setRound] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState("Pick the player that doesn’t belong.");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roundSeed, setRoundSeed] = useState(() => 123456789);
  const [roundResolved, setRoundResolved] = useState(false);
  const [feedbackFlash, setFeedbackFlash] = useState<"idle" | "correct" | "wrong">("idle");
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const [nextPulse, setNextPulse] = useState(false);

  const clickTimeoutRef = useRef<number | null>(null);
  const submitTimeoutRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const nextPulseTimeoutRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  const currentRound = useMemo(() => {
    const base = uniquePlayers([...players].sort((a, b) => a.id.localeCompare(b.id)));
    const seeded = shuffleWithSeed(base, roundSeed);
    return buildRound(seeded, roundSeed);
  }, [players, roundSeed]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        hydratedRef.current = true;
        return;
      }

      const saved = JSON.parse(raw) as SavedGameState;
      setRound(saved.round ?? 1);
      setLives(saved.lives ?? MAX_LIVES);
      setScore(saved.score ?? 0);
      setGameOver(Boolean(saved.gameOver));
      setFeedback(saved.feedback ?? "Pick the player that doesn’t belong.");
      setSelectedId(saved.selectedId ?? null);
      setRoundSeed(saved.roundSeed ?? 123456789);
      setRoundResolved(Boolean(saved.roundResolved));
    } catch {
      //
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || typeof window === "undefined") return;

    const payload: SavedGameState = {
      round,
      lives,
      score,
      gameOver,
      feedback,
      selectedId,
      roundSeed,
      roundResolved,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [round, lives, score, gameOver, feedback, selectedId, roundSeed, roundResolved]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) window.clearTimeout(clickTimeoutRef.current);
      if (submitTimeoutRef.current) window.clearTimeout(submitTimeoutRef.current);
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
      if (nextPulseTimeoutRef.current) window.clearTimeout(nextPulseTimeoutRef.current);
    };
  }, []);

  function triggerFlash(type: "correct" | "wrong") {
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    setFeedbackFlash(type);
    flashTimeoutRef.current = window.setTimeout(() => {
      setFeedbackFlash("idle");
    }, 900);
  }

  function triggerCardClick(id: string) {
    if (clickTimeoutRef.current) window.clearTimeout(clickTimeoutRef.current);
    setClickedId(id);
    clickTimeoutRef.current = window.setTimeout(() => {
      setClickedId(null);
    }, 180);
  }

  function triggerSubmitted(ids: string[]) {
    if (submitTimeoutRef.current) window.clearTimeout(submitTimeoutRef.current);
    setSubmittedIds(ids);
    submitTimeoutRef.current = window.setTimeout(() => {
      setSubmittedIds([]);
    }, 420);
  }

  function triggerNextPulse() {
    if (nextPulseTimeoutRef.current) window.clearTimeout(nextPulseTimeoutRef.current);
    setNextPulse(true);
    nextPulseTimeoutRef.current = window.setTimeout(() => {
      setNextPulse(false);
    }, 260);
  }

  function handleSelect(playerId: string) {
    if (gameOver || roundResolved) return;
    triggerCardClick(playerId);
    setSelectedId(playerId);
  }

  function handleSubmit() {
    if (!currentRound || !selectedId || gameOver || roundResolved) return;

    setRoundResolved(true);
    triggerSubmitted([selectedId]);

    const isCorrect = selectedId === currentRound.oddOneOutId;

    window.setTimeout(() => {
      if (isCorrect) {
        setScore((prev) => prev + 1);
        setFeedback("Correct!");
        triggerFlash("correct");
      } else {
        const correctPlayer = currentRound.cards.find((p) => p.id === currentRound.oddOneOutId);
        const nextLives = lives - 1;
        setLives(nextLives);
        setFeedback(`Wrong — ${correctPlayer?.name ?? "that player"} was the odd one out.`);
        triggerFlash("wrong");
        if (nextLives <= 0) setGameOver(true);
      }
    }, 150);
  }

  function handleNextRound() {
    if (gameOver) return;

    triggerNextPulse();
    setSelectedId(null);
    setSubmittedIds([]);
    setRoundResolved(false);
    setRound((prev) => prev + 1);
    setRoundSeed(Date.now() + Math.floor(Math.random() * 100000));
    setFeedback("Pick the player that doesn’t belong.");
    setFeedbackFlash("idle");
  }

  function handleRestart() {
    setRound(1);
    setLives(MAX_LIVES);
    setScore(0);
    setGameOver(false);
    setSelectedId(null);
    setSubmittedIds([]);
    setRoundResolved(false);
    setRoundSeed(Date.now());
    setFeedback("Pick the player that doesn’t belong.");
    setFeedbackFlash("idle");

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  if (!currentRound) {
    return (
      <main style={styles.page}>
        <style>{globalKeyframes}</style>
        <div style={styles.container}>
          <div style={styles.headerKicker}>ODD ONE OUT</div>
          <h1 style={styles.title}>Couldn’t build round</h1>
          <p style={styles.subtitle}>Try refreshing the page.</p>
        </div>
      </main>
    );
  }

  const canSubmit = Boolean(selectedId) && !gameOver && !roundResolved;
  const showNext = !gameOver && roundResolved;
  const oddPlayerId = currentRound.oddOneOutId;
  const selectedPlayer = currentRound.cards.find((p) => p.id === selectedId) ?? null;

  return (
    <main
      style={{
        ...styles.page,
        ...(feedbackFlash === "correct" ? styles.pageCorrectFlash : {}),
        ...(feedbackFlash === "wrong" ? styles.pageWrongFlash : {}),
      }}
    >
      <style>{globalKeyframes}</style>

      <div style={styles.container}>
        <div style={styles.headerKicker}>ODD ONE OUT</div>
        <h1 style={styles.title}>Show 4 players</h1>
        <p style={styles.subtitle}>Pick the one that doesn’t belong.</p>

        <div style={styles.metaRow}>
          <div style={styles.metaBox}>Round: {round}</div>
          <div style={styles.metaBox}>Score: {score}</div>
          <div style={styles.metaBox}>Lives: {lives}</div>
        </div>

        <div style={styles.promptCard}>
          <div style={styles.promptLabel}>Hidden group</div>
          <div style={styles.promptValue}>3 players belong together. 1 does not.</div>
        </div>

        <div style={styles.selectedBanner}>
          {selectedPlayer ? (
            <>
              <span style={styles.selectedBannerLabel}>Selected:</span> {selectedPlayer.name}
            </>
          ) : (
            <>Tap a card to select it before submitting.</>
          )}
        </div>

        <div style={styles.grid}>
          {currentRound.cards.map((player, index) => {
            const selected = selectedId === player.id;
            const clicked = clickedId === player.id;
            const submitted = submittedIds.includes(player.id);
            const revealedOdd = roundResolved && player.id === oddPlayerId;
            const revealedCorrectCommon = roundResolved && player.id !== oddPlayerId;
            const dimmed = Boolean(selectedId) && !selected && !roundResolved;

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => handleSelect(player.id)}
                disabled={gameOver || roundResolved}
                onMouseEnter={(e) => {
                  if (!selected && !roundResolved) {
                    e.currentTarget.style.transform = dimmed
                      ? "translateY(-2px) scale(1.01)"
                      : "translateY(-3px) scale(1.03)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected && !roundResolved) {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                  }
                }}
                style={{
                  ...getCardStyle(player, selected, roundResolved),
                  ...(clicked ? styles.cardClicked : {}),
                  ...(submitted ? styles.cardSubmitted : {}),
                  ...(revealedOdd ? styles.cardOddReveal : {}),
                  ...(revealedCorrectCommon ? styles.cardCommonReveal : {}),
                  ...(dimmed ? styles.cardDimmed : {}),
                  animationName: "fadeUpIn",
                  animationDuration: "0.28s",
                  animationTimingFunction: "ease",
                  animationFillMode: "both",
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                {selected && !roundResolved && <div style={styles.selectedPill}>SELECTED</div>}

                <div style={styles.cardInner}>
                  <div style={styles.cardLeft}>
                    <div style={styles.cardTopRow}>
                      <div style={styles.iconWrap}>
                        {getTeamMeta(player.team).icon ? (
                          <img
                            src={getTeamMeta(player.team).icon}
                            alt={player.team}
                            style={styles.teamIcon}
                          />
                        ) : (
                          <div style={styles.teamIconFallback} />
                        )}
                      </div>

                      <div style={styles.playerTextWrap}>
                        <div style={styles.cardName}>{player.name}</div>
                        <div style={styles.cardSub}>
                          {player.team} • {player.pos}
                        </div>
                      </div>
                    </div>
                  </div>

                  {roundResolved && (
                    <div style={styles.cardStatWrap}>
                      <div style={styles.cardStatLabel}>{getStatLabel(currentRound.categoryKey)}</div>
                      <div
                        style={{
                          ...styles.cardStatValue,
                          fontSize: getStatFontSize(currentRound.categoryKey),
                        }}
                      >
                        {formatStatValue(player, currentRound.categoryKey)}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div style={styles.statusRow}>
          <div
            style={{
              ...styles.statusText,
              ...(feedbackFlash === "correct" ? styles.statusCorrect : {}),
              ...(feedbackFlash === "wrong" ? styles.statusWrong : {}),
            }}
          >
            {feedback}
          </div>
        </div>

        <div style={styles.controls}>
          {!gameOver && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                ...styles.primaryButton,
                opacity: canSubmit ? 1 : 0.55,
              }}
            >
              Submit
            </button>
          )}

          {showNext && (
            <button
              type="button"
              onClick={handleNextRound}
              style={{
                ...styles.secondaryButton,
                ...(nextPulse ? styles.buttonPulse : {}),
              }}
            >
              Next Round
            </button>
          )}

          {gameOver && (
            <button type="button" onClick={handleRestart} style={styles.primaryButton}>
              Play Again
            </button>
          )}
        </div>

        {roundResolved && (
          <div style={styles.answerCard}>
            <div style={styles.answerLabel}>Matching category</div>
            <div style={styles.answerValue}>
              {currentRound.categoryLabel} ({currentRound.commonValueLabel})
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const globalKeyframes = `
@keyframes fadeUpIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes greenFlash {
  0% { box-shadow: inset 0 0 0 0 rgba(49,163,84,0.00); }
  15% { box-shadow: inset 0 0 0 9999px rgba(49,163,84,0.20); }
  100% { box-shadow: inset 0 0 0 9999px rgba(49,163,84,0.00); }
}

@keyframes redFlash {
  0% { box-shadow: inset 0 0 0 0 rgba(220,38,38,0.00); }
  15% { box-shadow: inset 0 0 0 9999px rgba(220,38,38,0.18); }
  100% { box-shadow: inset 0 0 0 9999px rgba(220,38,38,0.00); }
}

@keyframes cardTap {
  0% { transform: scale(1); }
  35% { transform: scale(0.97); }
  70% { transform: scale(1.04); }
  100% { transform: scale(1); }
}

@keyframes cardSubmitPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.035); }
  100% { transform: scale(1); }
}

@keyframes buttonPulse {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-2px) scale(1.04); }
  100% { transform: translateY(0) scale(1); }
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
    transition: "background 0.2s ease, box-shadow 0.2s ease",
  },
  pageCorrectFlash: {
    animationName: "greenFlash",
    animationDuration: "0.85s",
    animationTimingFunction: "ease",
  },
  pageWrongFlash: {
    animationName: "redFlash",
    animationDuration: "0.85s",
    animationTimingFunction: "ease",
  },
  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
    animationName: "fadeUpIn",
    animationDuration: "0.35s",
    animationTimingFunction: "ease",
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
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
  promptCard: {
    border: "4px solid #2a114b",
    background: "#fffaf0",
    padding: "16px",
    marginBottom: "12px",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
  promptLabel: {
    fontSize: "0.8rem",
    fontWeight: 1000,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#5b5568",
    marginBottom: "6px",
  },
  promptValue: {
    fontSize: "1.1rem",
    fontWeight: 1000,
    color: "#1d0b38",
  },
  selectedBanner: {
    border: "4px solid #2a114b",
    background: "#fffaf0",
    padding: "12px 16px",
    marginBottom: "14px",
    fontWeight: 900,
    fontSize: "0.98rem",
    color: "#2a114b",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
  selectedBannerLabel: {
    color: "#5b5568",
    marginRight: "8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "14px",
  },
  cardBase: {
    position: "relative",
    minHeight: "132px",
    borderWidth: "4px",
    borderStyle: "solid",
    padding: "16px",
    textAlign: "left",
    cursor: "pointer",
    borderRadius: "18px",
    transition:
      "transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease, filter 0.16s ease, border-color 0.16s ease",
  },
  cardSelected: {
    transform: "translateY(-4px) scale(1.04)",
    filter: "brightness(1.08)",
    zIndex: 2,
  },
  cardDimmed: {
    opacity: 0.74,
    transform: "scale(0.985)",
  },
  cardRevealed: {
    cursor: "default",
  },
  cardClicked: {
    animationName: "cardTap",
    animationDuration: "0.22s",
    animationTimingFunction: "ease",
  },
  cardSubmitted: {
    animationName: "cardSubmitPulse",
    animationDuration: "0.4s",
    animationTimingFunction: "ease",
  },
  cardOddReveal: {
    outline: "4px solid #ef4444",
    outlineOffset: "2px",
  },
  cardCommonReveal: {
    outline: "4px solid #22c55e",
    outlineOffset: "2px",
  },
  selectedPill: {
    position: "absolute",
    top: "-10px",
    left: "14px",
    background: "#fffaf0",
    color: "#2a114b",
    border: "3px solid #2a114b",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "0.72rem",
    fontWeight: 1000,
    letterSpacing: "0.08em",
    zIndex: 3,
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
  cardInner: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: "16px",
    height: "100%",
  },
  cardLeft: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
  },
  cardTopRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    width: "100%",
  },
  iconWrap: {
    flexShrink: 0,
    width: "54px",
    height: "54px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  teamIcon: {
    width: "40px",
    height: "40px",
    objectFit: "contain",
    display: "block",
  },
  teamIconFallback: {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.35)",
  },
  playerTextWrap: {
    minWidth: 0,
    flex: 1,
  },
  cardName: {
    fontSize: "1.35rem",
    fontWeight: 1000,
    lineHeight: 1.05,
    marginBottom: "8px",
    wordBreak: "break-word",
  },
  cardSub: {
    fontSize: "0.95rem",
    fontWeight: 800,
    opacity: 0.92,
  },
  cardStatWrap: {
    minWidth: "92px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "center",
    textAlign: "right",
  },
  cardStatLabel: {
    fontSize: "0.72rem",
    fontWeight: 1000,
    letterSpacing: "0.1em",
    opacity: 0.76,
    marginBottom: "4px",
  },
  cardStatValue: {
    fontWeight: 1000,
    lineHeight: 0.92,
    letterSpacing: "-0.04em",
    color: "#ffffff",
    textShadow: "0 2px 10px rgba(0,0,0,0.18)",
    maxWidth: "140px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
    marginBottom: "14px",
  },
  primaryButton: {
    minWidth: "150px",
    height: "56px",
    border: "4px solid #2a114b",
    background: "#2a114b",
    color: "#ffffff",
    fontWeight: 1000,
    fontSize: "1rem",
    cursor: "pointer",
    borderRadius: "16px",
    boxShadow: "0 4px 0 rgba(42,17,75,0.14)",
    transition: "transform 0.14s ease, box-shadow 0.14s ease, opacity 0.14s ease, filter 0.14s ease",
  },
  secondaryButton: {
    minWidth: "150px",
    height: "56px",
    border: "4px solid #2a114b",
    background: "#fffaf0",
    color: "#2a114b",
    fontWeight: 1000,
    fontSize: "1rem",
    cursor: "pointer",
    borderRadius: "16px",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
    transition: "transform 0.14s ease, box-shadow 0.14s ease, opacity 0.14s ease, filter 0.14s ease",
  },
  buttonPulse: {
    animationName: "buttonPulse",
    animationDuration: "0.26s",
    animationTimingFunction: "ease",
  },
  answerCard: {
    border: "4px solid #2a114b",
    background: "#fffaf0",
    padding: "16px",
    borderRadius: "18px",
    boxShadow: "0 4px 0 rgba(42,17,75,0.10)",
  },
  answerLabel: {
    fontSize: "0.8rem",
    fontWeight: 1000,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#5b5568",
    marginBottom: "6px",
  },
  answerValue: {
    fontSize: "1.05rem",
    fontWeight: 1000,
    color: "#1d0b38",
  },
};