"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/navigation";
import styles from "./Dashboard.module.css";

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main">
      <ul className={styles.nav}>
        {NAV_ITEMS.map((i) => (
          <li key={i.href}>
            {i.built ? (
              <Link href={i.href} aria-current={path === i.href ? "page" : undefined}>{i.label}</Link>
            ) : (
              <span aria-disabled="true" className={styles.soon}>{i.label} (soon)</span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
