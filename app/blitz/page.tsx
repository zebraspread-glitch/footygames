"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import rawPlayers from "@/app/data/afl_players26.json";

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

type PromptDefinition = {
  id: string;
  label: string;
  displayValue: string;
  matches: (player: Player) => boolean;
};

const GAME_SECONDS = 60;

const ALLOWED_CATEGORY_LABELS = [
  "Random",
  "Club",
  "Initials",
  "First Name",
  "Last Name",
  "Stat",
  "Jumper",
  "Age",
  "Role",
  "Club Group",
] as const;

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

const NAME_ALIASES: Record<string, string> = {
  "thomas liberatore": "tom liberatore",
  "matthew crouch": "matt crouch",
  "zach bailey": "zac bailey",
  "alexander neal bullen": "alex neal bullen",
  "samuel powell pepper": "sam powell pepper",
  "edward richards": "ed richards",
  "cameron rayner": "cam rayner",
  "cameron zurhaar": "cam zurhaar",
  "benjamin king": "ben king",
  "maxwell king": "max king",
  "matt johnson": "matthew johnson",
  "matt carroll": "matthew carroll",
  "lachlan schultz": "lachie schultz",
  "timothy english": "tim english",
  "nick murray": "nicholas murray",
  "maurice rioli": "maurice rioli jr",
  "oliver wines": "ollie wines",
  "bailey macdonald": "bailey macdonald",
  "connor macdonald": "connor macdonald",
  "cameron mackenzie": "cam mackenzie",
  "bradley close": "brad close",
  "bailey j williams": "bailey williams",
  "lachlan fogarty": "lachie fogarty",
  "angus anderson": "angus anderson",
  "nick madden": "nicholas madden",
  "louis emmett": "louis emmett",
  "zach merrett": "zachary merrett",
  "zac merrett": "zachary merrett",
  "sam taylor": "samuel taylor",
  "sam walsh": "samuel walsh",
  "sam davidson": "samuel davidson",
  "sam de koning": "samuel de koning",
  "sam lalor": "samuel lalor",
  "sam durdin": "samuel durdin",
  "sam draper": "samuel draper",
  "alex pearce": "alexander pearce",
  "alex keath": "alexander keath",
  "alex sexton": "alexander sexton",
  "alex neal-bullen": "alex neal bullen",
  "tom green": "thomas green",
  "tom stewart": "thomas stewart",
  "tom de koning": "thomas de koning",
  "tom mccartin": "thomas mccartin",
  "tom barrass": "thomas barrass",
  "tom papley": "thomas papley",
  "charlie curnow": "charles curnow",
  "charlie cameron": "charles cameron",
  "nick daicos": "nicholas daicos",
  "nick larkey": "nicholas larkey",
  "nick haynes": "nicholas haynes",
  "nick blakey": "nicholas blakey",
  "max gawn": "maxwell gawn",
  "max michalanney": "maxwell michalanney",
  "ben mckay": "benjamin mckay",
  "ben keays": "benjamin keays",
  "cam mackenzie": "cameron mackenzie",
  "cam raynor": "cam rayner",
  "ollie henry": "oliver henry",
  "ollie dempsey": "oliver dempsey",
  "ollie hollands": "oliver hollands",
  "ollie wines": "oliver wines",
  "zac williams": "zachary williams",
  "zac fisher": "zachary fisher",
};

function normalize(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[.'’-]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function getStateFromClub(club: string) {
  return CLUB_STATE_MAP[club] || "VIC";
}

function getClubIcon(club: string) {
  return CLUB_ICON_MAP[club] || "/team-icons/gws.png";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "";
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function isObviousCloseMatch(input: string, target: string) {
  if (!input || !target) return false;
  if (input === target) return true;

  const distance = levenshtein(input, target);
  const maxLen = Math.max(input.length, target.length);

  if (maxLen <= 5) return distance <= 1;
  if (maxLen <= 8) return distance <= 2;
  return distance <= 3;
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

const PLAYER_NAME_MAP = new Map<string, Player>();
for (const player of players) {
  PLAYER_NAME_MAP.set(normalize(player.name), player);
}

function findPlayerByTypedName(input: string): Player | null {
  const normalizedInput = normalize(input);
  if (!normalizedInput) return null;

  const aliasTarget = NAME_ALIASES[normalizedInput];
  if (aliasTarget) {
    const aliasPlayer = PLAYER_NAME_MAP.get(normalize(aliasTarget));
    if (aliasPlayer) return aliasPlayer;
  }

  const exactPlayer = PLAYER_NAME_MAP.get(normalize(normalizedInput));
  if (exactPlayer) return exactPlayer;

  let bestMatch: Player | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const player of players) {
    const normalizedPlayerName = normalize(player.name);
    if (!isObviousCloseMatch(normalizedInput, normalizedPlayerName)) continue;

    const distance = levenshtein(normalizedInput, normalizedPlayerName);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = player;
    }
  }

  return bestMatch;
}

function ClubIcon({
  club,
  size = 28,
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

function createPromptPool(sourcePlayers: Player[]): PromptDefinition[] {
  const prompts: PromptDefinition[] = [];

  const clubs = Array.from(new Set(sourcePlayers.map((player) => player.club).filter(Boolean)));
  const positions = Array.from(
    new Set(
      sourcePlayers
        .flatMap((player) => player.pos)
        .map((pos) => String(pos).trim().toUpperCase())
        .filter(Boolean)
    )
  );
  const initials = Array.from(
    new Set(sourcePlayers.map((player) => getInitials(player.name)).filter((value) => value.length >= 2))
  );

  const firstNames = Array.from(
    new Set(
      sourcePlayers
        .map((player) => player.name.trim().split(/\s+/)[0]?.trim())
        .filter((value): value is string => Boolean(value && value.length >= 3))
    )
  );

  const lastInitials = Array.from(
    new Set(
      sourcePlayers
        .map((player) => {
          const parts = player.name.trim().split(/\s+/).filter(Boolean);
          const last = parts[parts.length - 1] || "";
          return last[0]?.toUpperCase() || "";
        })
        .filter(Boolean)
    )
  );

  clubs.forEach((club) => {
    prompts.push({
      id: `club-${club}`,
      label: "Club",
      displayValue: club,
      matches: (player) => normalize(player.club) === normalize(club),
    });
  });

  positions.forEach((position) => {
    prompts.push({
      id: `position-${position}`,
      label: "Role",
      displayValue: position,
      matches: (player) =>
        player.pos.some((pos) => normalize(pos) === normalize(position)),
    });
  });

  initials.forEach((initialsValue) => {
    prompts.push({
      id: `initials-${initialsValue}`,
      label: "Initials",
      displayValue: initialsValue,
      matches: (player) => getInitials(player.name) === initialsValue,
    });
  });

  firstNames.forEach((firstName) => {
    prompts.push({
      id: `firstname-${normalize(firstName)}`,
      label: "First Name",
      displayValue: firstName,
      matches: (player) => {
        const playerFirst = player.name.trim().split(/\s+/)[0] || "";
        return normalize(playerFirst) === normalize(firstName);
      },
    });
  });

  lastInitials.forEach((letter) => {
    prompts.push({
      id: `lastinitial-${letter}`,
      label: "Last Name",
      displayValue: `Starts with ${letter}`,
      matches: (player) => {
        const parts = player.name.trim().split(/\s+/).filter(Boolean);
        const last = parts[parts.length - 1] || "";
        return (last[0]?.toUpperCase() || "") === letter;
      },
    });
  });

  const thresholds: PromptDefinition[] = [
    {
      id: "goals-5",
      label: "Stat",
      displayValue: "5+ Goals",
      matches: (player) => player.goals >= 5,
    },
    {
      id: "goals-10",
      label: "Stat",
      displayValue: "10+ Goals",
      matches: (player) => player.goals >= 10,
    },
    {
      id: "disp-20",
      label: "Stat",
      displayValue: "20+ Disposal Avg",
      matches: (player) => player.disposals >= 20,
    },
    {
      id: "disp-25",
      label: "Stat",
      displayValue: "25+ Disposal Avg",
      matches: (player) => player.disposals >= 25,
    },
    {
      id: "disp-30",
      label: "Stat",
      displayValue: "30+ Disposal Avg",
      matches: (player) => player.disposals >= 30,
    },
    {
      id: "young-21",
      label: "Age",
      displayValue: "Age 21 or Under",
      matches: (player) => player.age <= 21,
    },
    {
      id: "young-24",
      label: "Age",
      displayValue: "Age 24 or Under",
      matches: (player) => player.age <= 24,
    },
    {
      id: "old-30",
      label: "Age",
      displayValue: "Age 30+",
      matches: (player) => player.age >= 30,
    },
    {
      id: "jumper-1-10",
      label: "Jumper",
      displayValue: "Jumper #1–10",
      matches: (player) => player.number >= 1 && player.number <= 10,
    },
    {
      id: "jumper-11-20",
      label: "Jumper",
      displayValue: "Jumper #11–20",
      matches: (player) => player.number >= 11 && player.number <= 20,
    },
    {
      id: "jumper-21-30",
      label: "Jumper",
      displayValue: "Jumper #21–30",
      matches: (player) => player.number >= 21 && player.number <= 30,
    },
    {
      id: "jumper-30plus",
      label: "Jumper",
      displayValue: "Jumper #30+",
      matches: (player) => player.number >= 30,
    },
    {
      id: "fwd-only",
      label: "Role",
      displayValue: "Forward",
      matches: (player) => player.pos.includes("FWD"),
    },
    {
      id: "mid-only",
      label: "Role",
      displayValue: "Midfielder",
      matches: (player) => player.pos.includes("MID"),
    },
    {
      id: "def-only",
      label: "Role",
      displayValue: "Defender",
      matches: (player) => player.pos.includes("DEF"),
    },
    {
      id: "ruck-only",
      label: "Role",
      displayValue: "Ruck",
      matches: (player) => player.pos.includes("RUC"),
    },
    {
      id: "mid-fwd",
      label: "Role",
      displayValue: "MID / FWD",
      matches: (player) => player.pos.includes("MID") && player.pos.includes("FWD"),
    },
    {
      id: "mid-def",
      label: "Role",
      displayValue: "MID / DEF",
      matches: (player) => player.pos.includes("MID") && player.pos.includes("DEF"),
    },
    {
      id: "def-fwd",
      label: "Role",
      displayValue: "DEF / FWD",
      matches: (player) => player.pos.includes("DEF") && player.pos.includes("FWD"),
    },
    {
      id: "ruck-fwd",
      label: "Role",
      displayValue: "RUC / FWD",
      matches: (player) => player.pos.includes("RUC") && player.pos.includes("FWD"),
    },
    {
      id: "vic-clubs",
      label: "Club Group",
      displayValue: "Victorian Clubs",
      matches: (player) => player.state === "VIC",
    },
    {
      id: "interstate-clubs",
      label: "Club Group",
      displayValue: "Interstate Clubs",
      matches: (player) => player.state !== "VIC",
    },
    {
      id: "expansion-clubs",
      label: "Club Group",
      displayValue: "Expansion Cup Teams",
      matches: (player) =>
        normalize(player.club) === normalize("Gold Coast") ||
        normalize(player.club) === normalize("GWS"),
    },
    {
      id: "big-clubs",
      label: "Club Group",
      displayValue: "Big 4 Clubs",
      matches: (player) =>
        ["Collingwood", "Carlton", "Essendon", "Hawthorn"].some(
          (club) => normalize(player.club) === normalize(club)
        ),
    },
  ];

  thresholds.forEach((prompt) => {
    if (sourcePlayers.some(prompt.matches)) {
      prompts.push(prompt);
    }
  });

  return prompts.filter(
    (prompt) => sourcePlayers.filter(prompt.matches).length >= 3
  );
}

function randomFrom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTimeColor(secondsLeft: number, totalSeconds: number) {
  const ratio = secondsLeft / totalSeconds;

  if (ratio > 0.75) return "#39b54a";
  if (ratio > 0.5) return "#d8c52b";
  if (ratio > 0.25) return "#f39c12";
  return "#d64545";
}

export default function BlitzPage() {
  const [prompt, setPrompt] = useState<PromptDefinition | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof ALLOWED_CATEGORY_LABELS)[number] | "">("Random");
  const [query, setQuery] = useState("");
  const [guessedPlayers, setGuessedPlayers] = useState<Player[]>([]);
  const [revealedAnswers, setRevealedAnswers] = useState<Player[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "correct" | "wrong" | "info" | null;
    text: string;
  }>({
    type: null,
    text: "",
  });
  const [showHelp, setShowHelp] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const promptPool = useMemo(() => createPromptPool(players), []);

  const categoryOptions = useMemo(() => {
    return ALLOWED_CATEGORY_LABELS.filter((label) => {
      if (label === "Random") return true;
      return promptPool.some((prompt) => prompt.label === label);
    });
  }, [promptPool]);

  useEffect(() => {
    if (!selectedCategory && categoryOptions.length > 0) {
      setSelectedCategory("Random");
    }
  }, [categoryOptions, selectedCategory]);

  function getRandomPromptForCategory(
    category: string,
    excludeId?: string
  ): PromptDefinition | null {
    if (category === "Random") {
      const pool = promptPool.filter((item) => item.id !== excludeId);
      if (pool.length > 0) return randomFrom(pool);
      return randomFrom(promptPool);
    }

    const pool = promptPool.filter(
      (item) => item.label === category && item.id !== excludeId
    );

    if (pool.length > 0) {
      return randomFrom(pool);
    }

    const fallbackPool = promptPool.filter((item) => item.label === category);
    return randomFrom(fallbackPool);
  }

  const availableCount = useMemo(() => {
    if (!prompt) return 0;
    return players.filter((player) => prompt.matches(player)).length;
  }, [prompt]);

  const previewPrompt = useMemo(() => {
    if (!selectedCategory || selectedCategory === "Random") return null;
    return promptPool.find((item) => item.label === selectedCategory) ?? null;
  }, [promptPool, selectedCategory]);

  const previewCount = useMemo(() => {
    if (!selectedCategory) return 0;
    if (selectedCategory === "Random") return promptPool.length;
    return promptPool.filter((item) => item.label === selectedCategory).length;
  }, [promptPool, selectedCategory]);

  const timeAccent = getTimeColor(timeLeft, GAME_SECONDS);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      const firstPrompt = selectedCategory
        ? getRandomPromptForCategory(selectedCategory)
        : getRandomPromptForCategory("Random");

      setCountdown(null);
      setStarted(true);
      setGameOver(false);
      setTimeLeft(GAME_SECONDS);
      setPrompt(firstPrompt);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const timeout = window.setTimeout(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1));
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [countdown, selectedCategory]);

  useEffect(() => {
    if (!started || gameOver || countdown !== null) return;

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);

          const finalAnswers = prompt
            ? players.filter((player) => prompt.matches(player))
            : [];

          setRevealedAnswers(finalAnswers);
          setGameOver(true);
          setFeedback({
            type: "info",
            text: `Time's up — final score: ${score}`,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, gameOver, score, prompt, countdown]);

  useEffect(() => {
    if (started && !gameOver && countdown === null) {
      inputRef.current?.focus();
    }
  }, [started, gameOver, prompt, countdown]);

  function moveToNextPrompt() {
    const category = selectedCategory || "Random";
    const nextPrompt = getRandomPromptForCategory(category, prompt?.id);
    setPrompt(nextPrompt);
    setGuessedPlayers([]);
    setRevealedAnswers([]);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function startGame() {
    setScore(0);
    setTimeLeft(GAME_SECONDS);
    setQuery("");
    setGuessedPlayers([]);
    setRevealedAnswers([]);
    setGameOver(false);
    setStarted(false);
    setFeedback({ type: null, text: "" });
    setPrompt(null);
    setCountdown(3);
  }

  function handleSubmitGuess(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prompt || gameOver || !started || countdown !== null) return;

    const typedName = normalize(query);
    if (!typedName) return;

    const player = findPlayerByTypedName(query);

    if (!player) {
      setFeedback({
        type: "wrong",
        text: "Could not find that player name.",
      });
      return;
    }

    if (guessedPlayers.some((guessed) => guessed.id === player.id)) {
      setFeedback({
        type: "wrong",
        text: `${player.name} has already been used for this prompt.`,
      });
      setQuery("");
      return;
    }

    if (!prompt.matches(player)) {
      setFeedback({
        type: "wrong",
        text: `${player.name} does not match ${prompt.label} (${prompt.displayValue}).`,
      });
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    const nextGuessedPlayers = [...guessedPlayers, player];
    setGuessedPlayers(nextGuessedPlayers);
    setScore((prev) => prev + 1);
    setFeedback({
      type: "correct",
      text: `${player.name} is correct.`,
    });
    setQuery("");

    const remaining = players.filter(
      (candidate) =>
        prompt.matches(candidate) &&
        !nextGuessedPlayers.some((guessed) => guessed.id === candidate.id)
    );

    if (remaining.length === 0) {
      moveToNextPrompt();
      return;
    }

    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const progressPercent = Math.max(0, (timeLeft / GAME_SECONDS) * 100);
  const promptHeading = prompt ? `${prompt.label} (${prompt.displayValue})` : "Ready";

  return (
    <main className="game-page">
      {countdown !== null && (
        <div className="countdown-overlay">
          <div key={countdown} className="countdown-number">
            {countdown}
          </div>
        </div>
      )}

      <section className="game-header" style={{ animation: "fadeUp 0.35s ease" }}>
        <div>
          <p className="kicker">Blitz Mode</p>
          <h1>Beat the clock</h1>
          <p className="hero-copy">
            Guess as many AFL players as possible before time runs out.
          </p>
        </div>

        <div className="header-actions">
          <button className="ui-button fancy-btn" onClick={() => setShowHelp(true)}>
            Help
          </button>
        </div>
      </section>

      <section className="guess-row blitz-stats-row" style={{ animation: "fadeUp 0.4s ease" }}>
        <div
          className="timer-box animated-box time-box-live"
          style={{
            borderColor: timeAccent,
            boxShadow: `0 0 0 2px ${timeAccent}22 inset`,
          }}
        >
          <span className="stat-label">Time</span>
          <span
            className="stat-value"
            style={{
              color: timeAccent,
              transition: "color 0.45s ease",
            }}
          >
            {timeLeft}s
          </span>
        </div>

        <div className="timer-box animated-box">
          <span className="stat-label">Score</span>
          <span className="stat-value">{score}</span>
        </div>
      </section>

      <section className="info-card blitz-setup-card" style={{ animation: "fadeUp 0.45s ease" }}>
        {!started && countdown === null && (
          <div className="category-picker">
            <label htmlFor="category-select" className="category-picker-label">
              Choose Category
            </label>
            <select
              id="category-select"
              className="category-select"
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value as (typeof ALLOWED_CATEGORY_LABELS)[number]
                )
              }
            >
              {categoryOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="progress-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="prompt-card">
          <span className="small-pill">Current Prompt</span>

          {prompt && started ? (
            <div className="prompt-single-row">
              <h2>{promptHeading}</h2>
              <span className="match-count">{availableCount} possible</span>
            </div>
          ) : (
            <>
              <div className="prompt-single-row">
                <h2>{selectedCategory || "Ready"}</h2>
                {selectedCategory && (
                  <span className="match-count">
                    {selectedCategory === "Random"
                      ? `${previewCount} total prompts`
                      : `${previewCount} possible prompts`}
                  </span>
                )}
              </div>
              <div className="prompt-empty">
                {countdown !== null
                  ? "Get ready..."
                  : selectedCategory
                  ? "Press Start Game to begin."
                  : "Choose a category to begin."}
              </div>
            </>
          )}
        </div>
      </section>

      {feedback.type && (
        <section
          className={`info-card feedback-card ${
            feedback.type === "correct"
              ? "feedback-correct"
              : feedback.type === "wrong"
              ? "feedback-wrong"
              : "feedback-info"
          }`}
          style={{ animation: "cardIn 0.22s ease" }}
        >
          <span className="small-pill">
            {feedback.type === "correct"
              ? "Correct"
              : feedback.type === "wrong"
              ? "Wrong"
              : "Update"}
          </span>
          <p>{feedback.text}</p>
        </section>
      )}

      <section className="guess-row solo search-section" style={{ animation: "fadeUp 0.5s ease" }}>
        {!started && countdown === null ? (
          <button className="start-big-button" onClick={startGame} type="button">
            Start Game
          </button>
        ) : gameOver ? (
          <button className="start-big-button" onClick={startGame} type="button">
            New Game
          </button>
        ) : (
          <form className="search-area" onSubmit={handleSubmitGuess}>
            <div className="guess-input-wrap animated-input-wrap">
              <span className="guess-icon">⚡</span>
              <input
                ref={inputRef}
                className="guess-input animated-input"
                placeholder={countdown !== null ? "Get ready..." : "Type full player name and press Enter"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                readOnly={countdown !== null}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </form>
        )}
      </section>

      {started && !gameOver && guessedPlayers.length > 0 && (
        <section className="correct-section" style={{ animation: "fadeUp 0.28s ease" }}>
          <div className="correct-header">
            <span className="small-pill">Correct This Prompt</span>
            <span className="correct-count">{guessedPlayers.length}</span>
          </div>

          <div className="correct-grid">
            {guessedPlayers.map((player, index) => (
              <div
                key={player.id}
                className="correct-card"
                style={{ animation: `cardIn 0.2s ease ${index * 0.03}s both` }}
              >
                <div className="correct-card-left">
                  <ClubIcon club={player.club} size={34} />
                  <div className="correct-card-text">
                    <div className="correct-name">{player.name}</div>
                    <div className="correct-meta">{player.club}</div>
                  </div>
                </div>
                <div className="correct-tag tag-guessed">✓</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {gameOver && (
        <section className="correct-section" style={{ animation: "fadeUp 0.28s ease" }}>
          <div className="correct-header">
            <span className="small-pill">All Answers</span>
            <span className="correct-count">{revealedAnswers.length}</span>
          </div>

          <div className="correct-grid">
            {revealedAnswers.map((player, index) => {
              const guessed = guessedPlayers.some((item) => item.id === player.id);

              return (
                <div
                  key={player.id}
                  className={`correct-card ${guessed ? "answer-guessed" : "answer-missed"}`}
                  style={{ animation: `cardIn 0.2s ease ${index * 0.02}s both` }}
                >
                  <div className="correct-card-left">
                    <ClubIcon club={player.club} size={34} />
                    <div className="correct-card-text">
                      <div className="correct-name">{player.name}</div>
                      <div className="correct-meta">{player.club}</div>
                    </div>
                  </div>
                  <div className={`correct-tag ${guessed ? "tag-guessed" : "tag-missed"}`}>
                    {guessed ? "✓" : "✕"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showHelp && (
        <div onClick={() => setShowHelp(false)} className="overlay">
          <div className="info-card help-modal" onClick={(e) => e.stopPropagation()}>
            <span className="small-pill">How to play</span>
            <h2>Blitz Mode rules</h2>
            <p>Choose a category, start the timer, then type the full player name and press Enter.</p>
            <p>If Random is selected, prompts can come from any category.</p>
            <p>Otherwise the game will keep giving random prompts from that category only.</p>
            <p>Common aliases and obvious close spellings are accepted.</p>
            <p>When time runs out, all answers for the final prompt are revealed.</p>
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

        @keyframes countdownPop {
          0% {
            opacity: 0;
            transform: scale(0.45);
          }
          30% {
            opacity: 1;
            transform: scale(1.08);
          }
          70% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.35);
          }
        }

        .countdown-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 6, 24, 0.42);
          backdrop-filter: blur(2px);
          display: grid;
          place-items: center;
          z-index: 200;
          pointer-events: none;
        }

        .countdown-number {
          font-size: clamp(5rem, 20vw, 10rem);
          font-weight: 900;
          color: #fffaf0;
          text-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
          animation: countdownPop 0.9s ease both;
        }

        .hero-copy {
          margin: 10px 0 0;
          color: rgba(20, 20, 20, 0.72);
          font-size: 1rem;
          font-weight: 700;
        }

        .blitz-stats-row {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .stat-label {
          display: block;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.7;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          font-size: 1.8rem;
          font-weight: 900;
          line-height: 1;
          transition: color 0.45s ease;
        }

        .time-box-live {
          transition: border-color 0.45s ease, box-shadow 0.45s ease, background-color 0.45s ease;
        }

        .blitz-setup-card {
          display: grid;
          gap: 18px;
        }

        .category-picker {
          display: grid;
          gap: 8px;
        }

        .category-picker-label {
          font-size: 0.85rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #5c5567;
        }

        .category-select {
          width: 100%;
          min-height: 56px;
          border: 4px solid #271248;
          background: #fffaf0;
          color: #111;
          border-radius: 16px;
          padding: 0 16px;
          font-size: 1rem;
          font-weight: 800;
          outline: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .category-select:focus {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.12);
        }

        .progress-wrap {
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 14px;
          background: #e9e0ca;
          border: 3px solid #271248;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6f58ff 0%, #23c26b 100%);
          transition: width 1s linear;
        }

        .prompt-card {
          background: #fffaf0;
          border: 4px solid #271248;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }

        .prompt-card h2 {
          margin: 10px 0 0;
        }

        .prompt-single-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .prompt-single-row h2 {
          margin: 0;
        }

        .match-count {
          font-size: 1rem;
          font-weight: 900;
          color: #5c5567;
          white-space: nowrap;
        }

        .prompt-empty {
          margin-top: 10px;
          font-weight: 900;
          color: #5c5567;
        }

        .search-section {
          position: relative;
          z-index: 30;
        }

        .search-area {
          width: 100%;
          min-width: 0;
        }

        .start-big-button {
          width: 100%;
          min-height: 78px;
          border: 4px solid #245a20;
          background: #39b54a;
          color: #fffef6;
          border-radius: 0;
          font-size: 2rem;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .start-big-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
          filter: brightness(1.03);
        }

        .start-big-button:active {
          transform: translateY(0) scale(0.99);
        }

        .feedback-card {
          margin-top: 18px;
        }

        .feedback-card p {
          margin: 10px 0 0;
          font-weight: 800;
        }

        .feedback-correct {
          background: #dff5e3;
        }

        .feedback-wrong {
          background: #f8dfdf;
        }

        .feedback-info {
          background: #e6ebff;
        }

        .correct-section {
          margin-top: 18px;
        }

        .correct-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .correct-count {
          font-size: 0.95rem;
          font-weight: 900;
          color: #5c5567;
        }

        .correct-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 12px;
        }

        .correct-card {
          background: #fffaf0;
          border: 4px solid #271248;
          border-radius: 18px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .correct-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
        }

        .answer-guessed {
          background: #dff5e3;
        }

        .answer-missed {
          background: #f8dfdf;
        }

        .correct-card-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .correct-card-text {
          min-width: 0;
        }

        .correct-name {
          font-size: 1rem;
          font-weight: 900;
          color: #111;
          line-height: 1.1;
        }

        .correct-meta {
          margin-top: 3px;
          font-size: 0.88rem;
          font-weight: 800;
          color: #666;
        }

        .correct-tag {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: white;
          font-size: 1rem;
          font-weight: 900;
          flex-shrink: 0;
        }

        .tag-guessed {
          background: #3aa655;
        }

        .tag-missed {
          background: #d64545;
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

        .animated-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
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

        @media (max-width: 900px) {
          .blitz-stats-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .prompt-single-row {
            align-items: flex-start;
          }

          .correct-grid {
            grid-template-columns: 1fr;
          }

          .start-big-button {
            font-size: 1.5rem;
          }

          .countdown-number {
            font-size: 5rem;
          }
        }
      `}</style>
    </main>
  );
}