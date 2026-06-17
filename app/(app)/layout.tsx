"use client";

import React, { useState } from "react";
import { TopBar } from "@/components/topbar";
import { Sidebar } from "@/components/sidebar";
import { AskDrawer } from "@/components/ask-drawer";
import { Footer } from "@/components/footer";

/** The app chrome (DESIGN_BRIEF §4): topbar · sidebar · content · Ask drawer. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [askOpen, setAskOpen] = useState(false);
  return (
    <div className="flex h-screen flex-col">
      <TopBar onToggleAsk={() => setAskOpen((o) => !o)} />
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-64 shrink-0 border-r bg-[var(--color-canvas)] md:block">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </main>
        <AskDrawer open={askOpen} onClose={() => setAskOpen(false)} />
      </div>
    </div>
  );
}
