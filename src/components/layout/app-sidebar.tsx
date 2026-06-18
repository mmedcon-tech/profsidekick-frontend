"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { tr } from "@/lib/v2/i18n"
import { LogoV2 } from "./logo"
import { ProgramSwitcher } from "./program-switcher"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  GraduationCap,
  BarChart3,
  CreditCard,
  User,
  Bot,
  BookOpen,
  Building2,
  Users,
  ShieldCheck,
  Layers,
  Cpu,
  LogOut,
  Store,
} from "lucide-react"

interface NavItem {
  href: string
  labelKey: string
  icon: typeof LayoutDashboard
}

const subscriberNav: NavItem[] = [
  { href: "/subscriber/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/subscriber/courses", labelKey: "myCourses", icon: GraduationCap },
  { href: "/subscriber/marketplace", labelKey: "marketplace", icon: Store },
  { href: "/subscriber/analytics", labelKey: "analytics", icon: BarChart3 },
  { href: "/subscriber/billing", labelKey: "billing", icon: CreditCard },
  { href: "/subscriber/profile", labelKey: "profile", icon: User },
]

const publisherNav: NavItem[] = [
  { href: "/publisher/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/publisher/avatars", labelKey: "myAvatars", icon: Bot },
  { href: "/publisher/programs", labelKey: "programs", icon: Building2 },
  { href: "/publisher/courses", labelKey: "courses", icon: BookOpen },
  { href: "/publisher/analytics", labelKey: "analytics", icon: BarChart3 },
]

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/admin/templates", labelKey: "templates", icon: Layers },
  { href: "/admin/models", labelKey: "models", icon: Cpu },
  { href: "/admin/users", labelKey: "users", icon: Users },
  { href: "/admin/analytics", labelKey: "analytics", icon: BarChart3 },
]

const navByRole = { subscriber: subscriberNav, publisher: publisherNav, admin: adminNav }
const roleIcon = { subscriber: GraduationCap, publisher: Bot, admin: ShieldCheck }

export function AppSidebarV2() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const lang = "en" as "en" | "ar" // Hardcode to English for now, can be extracted to a context later
  const activeProgram = null // We'll get this from a separate context later

  if (!user) return null

  // Ensure role is valid, fallback to subscriber
  const role = user.role === "publisher" || user.role === "admin" ? user.role : "subscriber"
  const navItems = navByRole[role]
  const RoleIcon = roleIcon[role]
  // @ts-ignore
  const brandName = activeProgram?.themeConfig?.brandName

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="border-b border-sidebar-border p-4">
        <LogoV2 light brandName={brandName} />
      </div>

      {/* Program switcher */}
      <div className="border-b border-sidebar-border px-4 py-3">
        <ProgramSwitcher />
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          // Handle active state
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tr(item.labelKey, lang)}
              {active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {/* User info */}
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent">
            <RoleIcon className="h-4 w-4 text-sidebar-foreground/80" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60 capitalize">{tr(role, lang)}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-0.5 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          {tr("signOut", lang)}
        </button>
      </div>
    </aside>
  )
}
