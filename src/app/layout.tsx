import type { Metadata } from "next";
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import PwaRegister from "@/components/PwaRegister";
import { APP_NAME } from "@/config/app";
import "./globals.css";

export const metadata: Metadata = { title: APP_NAME, manifest: "/manifest.webmanifest" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header>
          <Nav />
        </header>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
