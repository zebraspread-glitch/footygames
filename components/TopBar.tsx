"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

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
        <Link href="/" className="brand" suppressHydrationWarning>
          
          {/* ICON REPLACES FG */}
          <Image
  src="/topbaricon.png"
  alt="FootyArcade Logo"
  width={56}
  height={56}
  className="brand-icon"
  priority
/>

          <div>
            <div className="brand-title">FootyArcade</div>
            <div className="brand-subtitle"></div>
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