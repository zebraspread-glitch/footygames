"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/footywho", label: "FootyWho" },
  { href: "/contexto", label: "Contexto" },
  { href: "/jumper-streak", label: "Jumper Streak" },
  { href: "/name-the-player", label: "Higher or Lower" },
];

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <span className="brand-badge">FG</span>
          <div>
            <div className="brand-title">FootyGames</div>
            <div className="brand-subtitle">an AFL player guessing hub</div>
          </div>
        </Link>

        <nav className="top-nav">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-button ${active ? "is-active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}