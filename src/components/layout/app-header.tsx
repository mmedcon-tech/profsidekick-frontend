"use client"

import { tr } from "@/lib/v2/i18n"
import { LogoV2 } from "./logo"
import { ProgramSwitcher } from "./program-switcher"
import { Menu, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function AppHeaderV2({ title, onMenuClick }: { title: string; onMenuClick?: () => void }) {
  const [lang, setLang] = useState<"en" | "ar">("en")
  const activeProgram = null
  const toggleLang = () => setLang(l => l === "en" ? "ar" : "en")

  // @ts-ignore
  const brandName = activeProgram?.themeConfig?.brandName

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-sm md:px-6">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <LogoV2 brandName={brandName} />
      </div>

      {/* Desktop title */}
      <h1 className="hidden text-sm font-semibold text-foreground lg:block">{title}</h1>

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Mobile program switcher */}
        <div className="lg:hidden">
          <ProgramSwitcher />
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          {lang === "ar" ? "EN" : "العربية"}
        </button>

        {/* AI assistant trigger */}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('toggle-assistant', { detail: true }))
          }}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{lang === "ar" ? "المساعد" : "Assistant"}</span>
        </Button>
      </div>
    </header>
  )
}
