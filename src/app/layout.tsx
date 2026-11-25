import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppDataProvider } from "@/components/AppDataProvider";
import PwaRegister from "@/components/PwaRegister";
import SessionBar from "@/components/SessionBar";
import { SessionTimerProvider } from "@/components/SessionTimerProvider";
import { APP_NAME } from "@/config/app";
import "./globals.css";

export const metadata: Metadata = { title: APP_NAME, manifest: "/manifest.webmanifest" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <AppDataProvider>
          <SessionTimerProvider>
            <SessionBar />
            {children}
          </SessionTimerProvider>
        </AppDataProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
