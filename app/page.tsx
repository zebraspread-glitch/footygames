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
    cardClass: styles.cardOrange,
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
  {
    href: "/odd-one-out",
    title: "Odd One Out",
    desc: "Show 4 players and pick the one that doesn’t belong.",
    pill: "PLAY",
    cardClass: styles.cardCyan,
  },
  {
    href: "/blitz",
    title: "Blitz Mode",
    desc: "Beat the clock and guess as many AFL players as possible before time runs out.",
    pill: "PLAY",
    cardClass: styles.cardBlue,
  },
  {
    href: "/emoji",
    title: "Emoji",
    desc: "Guess the AFL player from emoji clues.",
    pill: "PLAY",
    cardClass: styles.cardGreen,
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.kicker}>AFL GAMES HUB</span>
            <h1>FootyArcade</h1>
            <p className={styles.heroLead}>
              FootyArcade is an AFL game hub built for fans who want to test
              their knowledge of players, teams, stats, jumper numbers and
              more. Play quick daily-style guessing games, challenge yourself in
              unlimited modes, and explore different ways to learn and enjoy the
              AFL through interactive gameplay.
            </p>
            <p className={styles.heroSub}>
              From player guessing games to stat-based challenges, FootyArcade
              combines AFL knowledge with simple, addictive game design. Whether
              you are a casual fan or follow the league closely every week,
              there is a mode here that gives you a fresh way to play.
            </p>

            <div className={styles.heroButtons}>
              <a
  href="https://footywho.com"
  target="_blank"
  rel="noopener noreferrer"
  className={styles.primaryButton}
>
  Play FootyWho
</a>
              <Link href="/how-to-play" className={styles.secondaryButton}>
                How to Play
              </Link>
            </div>
          </div>

          <div className={styles.heroPanel}>
            <h2>Why play FootyArcade?</h2>
            <ul className={styles.featureList}>
              <li>Multiple AFL game modes in one place</li>
              <li>Quick games that work on desktop and mobile</li>
              <li>Challenges based on real AFL players and categories</li>
              <li>Daily-style gameplay with replayable unlimited modes</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Game Modes</h2>
            <p>
              Choose from a range of AFL-based games designed to test different
              parts of your football knowledge.
            </p>
          </div>

          <div className={styles.list}>
            {modes.map((mode) => (
              <Link
                key={mode.href}
                href={mode.href}
                className={`${styles.card} ${mode.cardClass}`}
              >
                <div className={styles.left}>
                  <h3>{mode.title}</h3>
                  <p>{mode.desc}</p>
                </div>

                <div className={styles.right}>
                  <span className={styles.pill}>{mode.pill}</span>
                  <span className={styles.arrow}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <h2>Built for AFL fans</h2>
            <p>
              FootyArcade is designed around AFL players, clubs, statistics and
              common football knowledge. The goal is to create games that are
              easy to jump into but still rewarding for fans who know the league
              well.
            </p>
          </article>

          <article className={styles.infoCard}>
            <h2>Simple to learn</h2>
            <p>
              Each mode has a clear objective, whether that is identifying a
              hidden player, choosing the correct team, building a streak or
              spotting the odd one out. You can learn the basics quickly and
              improve with practice.
            </p>
          </article>

          <article className={styles.infoCard}>
            <h2>Always something to play</h2>
            <p>
              With multiple game types available, FootyArcade gives AFL fans a
              variety of challenges instead of just one quiz or one daily game.
              That makes it easy to come back and try a different mode whenever
              you want.
            </p>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Learn more</h2>
            <p>
              Read more about the site, how the games work, and important policy
              pages below.
            </p>
          </div>

          <div className={styles.linkGrid}>
            <Link href="/about" className={styles.textCard}>
              <h3>About</h3>
              <p>Learn more about FootyArcade and what the site is built for.</p>
            </Link>

            <Link href="/how-to-play" className={styles.textCard}>
              <h3>How to Play</h3>
              <p>Read the rules and tips for each game mode on the site.</p>
            </Link>

            <Link href="/contact" className={styles.textCard}>
              <h3>Contact</h3>
              <p>Send feedback, suggestions, or report any issues you find.</p>
            </Link>

            <Link href="/privacy-policy" className={styles.textCard}>
              <h3>Privacy Policy</h3>
              <p>View information about cookies, data use and third-party services.</p>
            </Link>

            <Link href="/terms" className={styles.textCard}>
              <h3>Terms</h3>
              <p>Read the terms that apply when using FootyArcade.</p>
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}