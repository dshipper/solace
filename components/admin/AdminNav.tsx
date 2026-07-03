"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const LINKS = [
  { href: "/admin", label: "Events" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/settings", label: "Settings" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/events");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Admin">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`${styles.navLink} ${isActive(link.href, pathname) ? styles.navLinkActive : ""}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
