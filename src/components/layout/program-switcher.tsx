"use client"

import { useState, useRef, useEffect } from "react"
import { tr } from "@/lib/v2/i18n"
import { ChevronDown, LayoutGrid, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProgramSwitcher() {
  const lang = "en"
  const dir = "ltr"
  const activeProgram = null
  const userPrograms: any[] = [] // TODO: Hook up to real user programs
  const setActiveProgram = (p: any) => {} // TODO: Hook up to context

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (userPrograms.length === 0) return null

  // @ts-ignore
  const label = activeProgram ? activeProgram.name[lang] : tr("noProgram", lang)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 max-w-[200px] items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent px-3 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80"
      >
        <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1 min-w-[200px] rounded-xl border border-sidebar-border bg-sidebar py-1 shadow-xl",
            dir === "rtl" ? "left-0" : "right-0",
          )}
        >
          {userPrograms.map((prog) => (
            <button
              key={prog.id}
              onClick={() => { setActiveProgram(prog); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold bg-accent text-accent-foreground">
                {prog.name.en.charAt(0)}
              </span>
              <span className="truncate">{prog.name[lang]}</span>
              {/* @ts-ignore */}
              {activeProgram?.id === prog.id && (
                <Check className="ms-auto h-3.5 w-3.5 text-accent" />
              )}
            </button>
          ))}
          <div className="mx-3 my-1 border-t border-sidebar-border" />
          <button
            onClick={() => { setActiveProgram(null); setOpen(false) }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
          >
            <LayoutGrid className="h-4 w-4 text-sidebar-foreground/50" />
            {tr("backToMyOS", lang)}
            {!activeProgram && <Check className="ms-auto h-3.5 w-3.5 text-accent" />}
          </button>
        </div>
      )}
    </div>
  )
}
