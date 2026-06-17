"use client"


import { tr } from "@/lib/v2/i18n"
import { adminUserApi, ApiError } from "@/lib/avatarApi"
import type { UserRecord } from "@/types/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, ShieldCheck, BookOpen, Users, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

const roleIcon = { admin: ShieldCheck, publisher: BookOpen, subscriber: Users }
const roleColor = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  publisher: "bg-accent/10 text-accent border-accent/20",
  subscriber: "bg-primary/10 text-primary border-primary/20",
}

export default function UsersView() {
  const lang = "en"; const dir = "ltr"
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    adminUserApi.list()
      .then((data) => {
        setUsers(data)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (u: UserRecord) => {
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return
    setDeleting(u.id)
    try {
      await adminUserApi.delete(u.id)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = users.filter((u) => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase()
    const matchesQuery = name.includes(query.toLowerCase()) || u.username.includes(query.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesQuery && matchesRole
  })

  const counts = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    publisher: users.filter((u) => u.role === "publisher").length,
    subscriber: users.filter((u) => u.role === "subscriber").length,
  }

  return (
    <div dir={dir} className="space-y-6 max-w-6xl mx-auto">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tr("users", lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar" ? "إدارة المستخدمين والأدوار على المنصة" : "Manage platform users and their roles"}
        </p>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        {(["all", "admin", "publisher", "subscriber"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              roleFilter === r
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {r === "all" ? tr("all", lang) : tr(r, lang)} ({counts[r]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr("search", lang)}
          className="ps-9"
        />
      </div>

      {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {lang === "ar" ? "المستخدم" : "User"}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {lang === "ar" ? "البريد الإلكتروني" : "Email"}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{tr("roles", lang)}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {lang === "ar" ? "تاريخ الانضمام" : "Joined"}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {lang === "ar" ? "إجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {lang === "ar" ? "لا توجد نتائج" : "No users found"}
                  </td>
                </tr>
              ) : filtered.map((u) => {
                const Icon = roleIcon[u.role as keyof typeof roleIcon] || Users
                const color = roleColor[u.role as keyof typeof roleColor] || "bg-muted text-muted-foreground border-border"
                
                return (
                  <tr key={u.id} className="group transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}>
                        <Icon className="h-3 w-3" />
                        {tr(u.role, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(u)}
                        disabled={deleting === u.id}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
