"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
  rightPanel?: ReactNode;
}

export function AppLayout({ children, rightPanel }: LayoutProps) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Sidebar />
      <main
        className={`ml-[208px] flex-1 flex flex-col overflow-hidden ${
          rightPanel ? "mr-[320px]" : ""
        }`}
        style={{ backgroundColor: "var(--bg)" }}
      >
        {children}
      </main>
      {rightPanel && (
        <aside className="fixed right-0 top-0 h-full w-[320px] flex flex-col z-40 border-l overflow-y-auto bg-white border-[#e7e5e4] dark:bg-[#141414] dark:border-[#2a2a2a]">
          {rightPanel}
        </aside>
      )}
    </div>
  );
}
