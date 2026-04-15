import Link from "next/link";
import styles from "./page.module.css";

const modes = [
  {
    href: "/footywho",
    title: "FootyWho",
    desc: "Guess the AFL player using category clues.",
    pill: "PLAY",
    cardClass: styles.cardBlue,
  },
  {
    href: "/contexto",
    title: "Contexto",
    desc: "Find the hidden player by getting closer with each guess.",
    pill: "PLAY",
    cardClass: styles.cardGreen,
  },
  {
    href: "/jumper-streak",
    title: "Jumper Number Streak",
    desc: "Keep naming player jumper numbers correctly to build a streak.",
    pill: "PLAY",
    cardClass: styles.cardPeach,
  },
  {
    href: "/name-the-player",
    title: "Higher or Lower",
    desc: "Figure out the player from hints, stats, and clues.",
    pill: "PLAY",
    cardClass: styles.cardPurple,
  },
  {
    href: "/guess-the-team",
    title: "Guess the Team",
    desc: "Work out the AFL team from player initials and revealed positions.",
    pill: "PLAY",
    cardClass: styles.cardRed,
  },

    {
    href: "/connections",
    title: "Connections",
    desc: "Group 16 AFL players into 4 connected categories.",
    pill: "PLAY",
    cardClass: styles.cardYellow,
  },
  
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.grid}>
        {modes.map((mode) => (
          <Link
            key={mode.href}
            href={mode.href}
            className={`${styles.card} ${mode.cardClass}`}
          >
            <div className={styles.topRow}>
              <span className={styles.pill}>{mode.pill}</span>
              <span className={styles.arrow}>→</span>
            </div>

            <div className={styles.body}>
              <h2>{mode.title}</h2>
              <p>{mode.desc}</p>
            </div>

            <span className={styles.linkText}>Open mode</span>
          </Link>
        ))}
      </section>
    </main>
  );
}