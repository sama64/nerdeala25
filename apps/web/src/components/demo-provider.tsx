"use client";

import { DemoContext, useDemoModeProvider } from "@/hooks/use-demo-mode";

interface DemoProviderProps {
  children: React.ReactNode;
}

export function DemoProvider({ children }: DemoProviderProps) {
  const demoMode = useDemoModeProvider();

  return (
    <DemoContext.Provider value={demoMode}>
      {children}
    </DemoContext.Provider>
  );
}