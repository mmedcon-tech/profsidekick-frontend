"use client"

import React from "react"
import { useProgramContext } from "@/contexts/ProgramContext"
import { ThemeConfigProvider } from "./ThemeConfigProvider"

export default function ProgramThemeProvider({ children }: { children: React.ReactNode }) {
  const { activeProgram } = useProgramContext()
  return (
    <ThemeConfigProvider themeConfig={activeProgram?.themeConfig ?? null}>
      {children}
    </ThemeConfigProvider>
  )
}
