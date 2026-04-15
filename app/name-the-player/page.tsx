"use client";

import { useEffect, useMemo, useState } from "react";
import playersData from "@/app/data/afl_players26.json";

type Player = Record<string, unknown>;
type StatKey = "disposals" | "goals" | "age" | "number";

const STAT_OPTIONS: { key: StatKey; label: string }[] = [
  { key: "disposals", label: "Disposals" },
  { key: "goals", label: "Goals" },
  { key: "age", label: "Age" },
  { key: "number", label: "Jersey Number" },
];

const TEAM_ICON_MAP: Record<string, string> = {
  Adelaide: "/team-icons/adelaide.png",
  "Brisbane Lions": "/team-icons/brisbane.png",
  Brisbane: "/team-icons/brisbane.png",
  Carlton: "/team-icons/carlton.png",
  Collingwood: "/team-icons/collingwood.png",
  Essendon: "/team-icons/essendon.png",
  Fremantle: "/team-icons/fremantle.png",
  Geelong: "/team-icons/geelong.png",
  "Geelong Cats": "/team-icons/geelong.png",
  "Gold Coast": "/team-icons/goldcoast.png",
  "Gold Coast Suns": "/team-icons/goldcoast.png",
  GWS: "/team-icons/gws.png",
  "GWS Giants": "/team-icons/gws.png",
  Hawthorn: "/team-icons/hawthorn.png",
  Melbourne: "/team-icons/melbourne.png",
  "North Melbourne": "/team-icons/northmelbourne.png",
  "Port Adelaide": "/team-icons/portadelaide.png",
  Richmond: "/team-icons/richmond.png",
  "St Kilda": "/team-icons/stkilda.png",
  Sydney: "/team-icons/sydney.png",
  "Sydney Swans": "/team-icons/sydney.png",
  "West Coast": "/team-icons/westcoast.png",
  "West Coast Eagles": "/team-icons/westcoast.png",
  "Western Bulldogs": "/team-icons/westernbulldogs.png",
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function getName(player: Player): string {
  const name = typeof player.name === "string" ? player.name.trim() : "";
  if (name) return name;

  const firstName =
    typeof player.firstName === "string" ? player.firstName.trim() : "";
  const lastName =
    typeof player.lastName === "string" ? player.lastName.trim() : "";

  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || "Unknown Player";
}

function getTeam(player: Player): string {
  const team =
    typeof player.team === "string"
      ? player.team.trim()
      : typeof player.club === "string"
        ? player.club.trim()
        : "";

  return team || "Unknown Team";
}

function getTeamIcon(team: string): string {
  return TEAM_ICON_MAP[team] || "";
}

function getStatValue(player: Player, stat: StatKey): number | null {
  if (stat === "disposals") {
    return (
      asNumber(player.disposals) ??
      asNumber(player.avgDisposals) ??
      asNumber(player.disposalAverage) ??
      asNumber(player.disposalAvg) ??
      null
    );
  }

  if (stat === "goals") {
    return (
      asNumber(player.goals) ??
      asNumber(player.avgGoals) ??
      asNumber(player.goalAverage) ??
      asNumber(player.goalAvg) ??
      null
    );
  }

  if (stat === "age") {
    return asNumber(player.age) ?? null;
  }

  return (
    asNumber(player.number) ??
    asNumber(player.jumperNumber) ??
    asNumber(player.jumper) ??
    asNumber(player.guernsey) ??
    asNumber(player.guernseyNumber) ??
    null
  );
}

function formatValue(value: number | null, stat: StatKey): string {
  if (value === null) return "?";
  if (stat === "disposals" || stat === "goals") return value.toFixed(1);
  return String(Math.round(value));
}

function getRandomPlayer(list: Player[], excludeName?: string): Player | null {
  const pool = excludeName
    ? list.filter((player) => getName(player) !== excludeName)
    : list;

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function NameThePlayerPage() {
  const [selectedStat, setSelectedStat] = useState<StatKey>("disposals");
  const [leftPlayer, setLeftPlayer] = useState<Player | null>(null);
  const [rightPlayer, setRightPlayer] = useState<Player | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [revealRightValue, setRevealRightValue] = useState(false);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const eligiblePlayers = useMemo(() => {
    const rawPlayers = Array.isArray(playersData) ? (playersData as Player[]) : [];

    return rawPlayers.filter((player) => {
      const name = getName(player);
      const team = getTeam(player);
      const value = getStatValue(player, selectedStat);

      return (
        name !== "Unknown Player" &&
        team !== "Unknown Team" &&
        value !== null &&
        value > 0
      );
    });
  }, [selectedStat]);

  function startGame() {
    if (eligiblePlayers.length < 2) {
      setLeftPlayer(null);
      setRightPlayer(null);
      setScore(0);
      setGameOver(true);
      setRevealRightValue(true);
      setFlash(null);
      setIsLocked(false);
      return;
    }

    const first = getRandomPlayer(eligiblePlayers);
    const second = getRandomPlayer(
      eligiblePlayers,
      first ? getName(first) : undefined
    );

    setLeftPlayer(first);
    setRightPlayer(second);
    setScore(0);
    setGameOver(false);
    setRevealRightValue(false);
    setFlash(null);
    setIsLocked(false);
  }

  useEffect(() => {
    const savedBest = Number(localStorage.getItem("higher-lower-best") || "0");
    if (!Number.isNaN(savedBest)) {
      setBest(savedBest);
    }
  }, []);

  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStat, eligiblePlayers.length]);

  function handleGuess(choice: "higher" | "lower") {
    if (!leftPlayer || !rightPlayer || gameOver || isLocked) return;

    const leftValue = getStatValue(leftPlayer, selectedStat);
    const rightValue = getStatValue(rightPlayer, selectedStat);

    if (leftValue === null || rightValue === null) return;

    setIsLocked(true);
    setRevealRightValue(true);

    const isCorrect =
      choice === "higher" ? rightValue >= leftValue : rightValue <= leftValue;

    if (isCorrect) {
      const newScore = score + 1;
      setScore(newScore);
      setFlash("correct");

      if (newScore > best) {
        setBest(newScore);
        localStorage.setItem("higher-lower-best", String(newScore));
      }

      const nextLeft = rightPlayer;
      const nextRight = getRandomPlayer(eligiblePlayers, getName(nextLeft));

      window.setTimeout(() => {
        setLeftPlayer(nextLeft);
        setRightPlayer(nextRight);
        setRevealRightValue(false);
        setFlash(null);
        setIsLocked(false);
      }, 950);
    } else {
      setFlash("wrong");
      setGameOver(true);

      window.setTimeout(() => {
        setIsLocked(false);
      }, 950);
    }
  }

  const leftValue = leftPlayer ? getStatValue(leftPlayer, selectedStat) : null;
  const rightValue = rightPlayer ? getStatValue(rightPlayer, selectedStat) : null;
  const selectedLabel =
    STAT_OPTIONS.find((option) => option.key === selectedStat)?.label ||
    "Disposals";

  return (
    <main
      className={`hl-page ${flash === "correct" ? "correct" : ""} ${
        flash === "wrong" ? "wrong" : ""
      }`}
    >
      <section className="hl-hero">
        <div>
          <p className="hl-kicker">Higher or Lower</p>
          <h1 className="hl-title">Who has the higher stat?</h1>
          <p className="hl-subtitle">
            Click higher or lower to see if the next player beats the current one
            in {selectedLabel.toLowerCase()}.
          </p>
        </div>

        <div className="hl-score-wrap">
          <div className="hl-score-pill">Score: {score}</div>
          <div className="hl-score-pill">Best: {best}</div>
        </div>
      </section>

      <section className="hl-modes">
        {STAT_OPTIONS.map((option) => {
          const active = option.key === selectedStat;

          return (
            <button
              key={option.key}
              className={`hl-mode-button ${active ? "active" : ""}`}
              onClick={() => {
                if (isLocked) return;
                setSelectedStat(option.key);
              }}
              disabled={isLocked}
            >
              {option.label}
            </button>
          );
        })}
      </section>

      <section className="hl-board">
        <PlayerCard
          heading="Current"
          player={leftPlayer}
          statKey={selectedStat}
          value={leftValue}
          showValue={true}
        />

        <div className="hl-middle">
          <div className="hl-vs">VS</div>
        </div>

        <PlayerCard
          heading="Next"
          player={rightPlayer}
          statKey={selectedStat}
          value={rightValue}
          showValue={revealRightValue || gameOver}
        />
      </section>

      <section className="hl-actions">
        {!gameOver ? (
          <>
            <button
              className="hl-action-button"
              onClick={() => handleGuess("lower")}
              disabled={isLocked}
            >
              Lower
            </button>
            <button
              className="hl-action-button"
              onClick={() => handleGuess("higher")}
              disabled={isLocked}
            >
              Higher
            </button>
          </>
        ) : (
          <>
            <div className="hl-game-over">
              Game over — answer was {formatValue(rightValue, selectedStat)}
            </div>
            <button className="hl-action-button" onClick={startGame}>
              Play Again
            </button>
          </>
        )}
      </section>

      <style jsx>{`
        .hl-page {
          min-height: 100vh;
          padding: 32px 20px 48px;
          color: #1d1540;
          transition: background 0.22s ease;
          background: radial-gradient(
            circle at top,
            #f6f1e4 0%,
            #efe6d0 55%,
            #e8ddc4 100%
          );
        }

        .hl-page.correct {
          background: #39d353;
        }

        .hl-page.wrong {
          background: #ff4d4f;
        }

        .hl-hero {
          max-width: 1200px;
          margin: 0 auto 22px;
          padding: 28px;
          border: 3px solid #24114d;
          border-radius: 24px;
          background: #f8f4ea;
          box-shadow: 0 12px 30px rgba(36, 17, 77, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .hl-kicker {
          margin: 0;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #5f4a92;
        }

        .hl-title {
          margin: 8px 0 10px;
          font-size: clamp(2rem, 5vw, 4rem);
          line-height: 0.95;
          font-weight: 900;
        }

        .hl-subtitle {
          margin: 0;
          font-size: 18px;
          line-height: 1.45;
          color: #504770;
          max-width: 700px;
        }

        .hl-score-wrap {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hl-score-pill {
          padding: 12px 18px;
          border: 2px solid #24114d;
          border-radius: 999px;
          background: #fffdf7;
          font-weight: 800;
          font-size: 16px;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .hl-score-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(36, 17, 77, 0.08);
        }

        .hl-modes {
          max-width: 1200px;
          margin: 0 auto 24px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hl-mode-button,
        .hl-action-button {
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease,
            color 0.15s ease,
            border-color 0.15s ease,
            opacity 0.15s ease;
        }

        .hl-mode-button:hover,
        .hl-action-button:hover {
          transform: translateY(-3px) scale(1.02);
        }

        .hl-mode-button:active,
        .hl-action-button:active {
          transform: translateY(1px) scale(0.98);
        }

        .hl-mode-button:disabled,
        .hl-action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .hl-mode-button {
          padding: 14px 18px;
          border: 2px solid #24114d;
          border-radius: 14px;
          background: #fffaf0;
          color: #24114d;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 6px 14px rgba(36, 17, 77, 0.06);
        }

        .hl-mode-button.active {
          background: #24114d;
          color: #fffaf0;
          box-shadow: 0 10px 24px rgba(36, 17, 77, 0.18);
        }

        .hl-board {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 90px 1fr;
          gap: 18px;
          align-items: stretch;
        }

        .hl-middle {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hl-vs {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 3px solid #24114d;
          background: #fffdf7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 22px;
          box-shadow: 0 8px 20px rgba(36, 17, 77, 0.08);
        }

        .hl-actions {
          max-width: 1200px;
          margin: 24px auto 0;
          display: flex;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .hl-action-button {
          min-width: 180px;
          padding: 16px 22px;
          border: 2px solid #24114d;
          border-radius: 16px;
          background: #24114d;
          color: #fffaf0;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(36, 17, 77, 0.18);
        }

        .hl-action-button:hover {
          box-shadow: 0 14px 28px rgba(36, 17, 77, 0.24);
        }

        .hl-game-over {
          padding: 16px 22px;
          border: 2px solid #24114d;
          border-radius: 16px;
          background: #fffdf7;
          color: #24114d;
          font-size: 18px;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .hl-board {
            grid-template-columns: 1fr;
          }

          .hl-middle {
            min-height: 20px;
          }

          .hl-vs {
            width: 60px;
            height: 60px;
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  );
}

function PlayerCard({
  heading,
  player,
  statKey,
  value,
  showValue,
}: {
  heading: string;
  player: Player | null;
  statKey: StatKey;
  value: number | null;
  showValue: boolean;
}) {
  const name = player ? getName(player) : "Loading...";
  const team = player ? getTeam(player) : "";
  const icon = team ? getTeamIcon(team) : "";

  const statLabel =
    STAT_OPTIONS.find((option) => option.key === statKey)?.label || "";

  return (
    <div
      style={{
        border: "3px solid #24114d",
        borderRadius: 24,
        padding: 24,
        minHeight: 320,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 12px 30px rgba(36, 17, 77, 0.08)",
        background: "#f8f4ea",
        color: "#1d1540",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            padding: "7px 10px",
            borderRadius: 999,
            background: "#eee6d4",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {heading}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {icon ? (
            <img
              src={icon}
              alt={team}
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                flexShrink: 0,
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(1.5rem, 3vw, 2.6rem)",
                lineHeight: 1,
                fontWeight: 900,
                color: "#1d1540",
              }}
            >
              {name}
            </h2>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 17,
                fontWeight: 700,
                color: "#5f5679",
              }}
            >
              {team}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          border: "3px solid #24114d",
          borderRadius: 20,
          background: "#fffdf7",
          padding: 18,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#5f4a92",
            marginBottom: 10,
          }}
        >
          {statLabel}
        </div>
        <div
          style={{
            fontSize: "clamp(2.2rem, 6vw, 4.5rem)",
            lineHeight: 1,
            fontWeight: 900,
            color: "#1d1540",
          }}
        >
          {showValue ? formatValue(value, statKey) : "?"}
        </div>
      </div>
    </div>
  );
}