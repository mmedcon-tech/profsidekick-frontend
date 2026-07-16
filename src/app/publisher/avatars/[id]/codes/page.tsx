"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { avatarApi, ApiError } from "@/lib/avatarApi"
import type { AccessCodeRecord } from "@/lib/avatarApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Key, Users, Coins, Calendar, Power, Copy, Check } from "lucide-react"

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function CodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 font-mono text-sm text-foreground hover:text-primary transition-colors"
    >
      {code}
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  )
}

interface GenerateFormState {
  max_users: string
  credits_per_user: string
  expires_at: string
}

export default function AvatarCodesPage() {
  const params = useParams<{ id: string }>()
  const avatarId = params.id

  const [codes, setCodes] = useState<AccessCodeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<GenerateFormState>({
    max_users: "50",
    credits_per_user: "0",
    expires_at: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await avatarApi.listCodes(avatarId)
      setCodes(data.codes)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load access codes")
    } finally {
      setLoading(false)
    }
  }, [avatarId])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    setSubmitting(true)
    setFormError(null)
    try {
      const maxUsers = parseInt(form.max_users, 10)
      if (!maxUsers || maxUsers < 1) {
        setFormError("Max users must be at least 1")
        return
      }
      const newCode = await avatarApi.createCode(avatarId, {
        max_users: maxUsers,
        credits_per_user: form.credits_per_user || "0",
        expires_at: form.expires_at || null,
      })
      setCodes((prev) => [newCode, ...prev])
      setModalOpen(false)
      setForm({ max_users: "50", credits_per_user: "0", expires_at: "" })
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to generate code")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (code: AccessCodeRecord) => {
    try {
      const updated = await avatarApi.updateCode(avatarId, code.id, { is_active: !code.is_active })
      setCodes((prev) => prev.map((c) => (c.id === code.id ? updated : c)))
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to update code")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            Access Codes
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Generate codes to grant subscribers access to this avatar and its courses.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Generate Code
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <Button variant="outline" size="sm" className="ml-4" onClick={load}>Retry</Button>
        </div>
      ) : codes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No access codes yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a code to share with subscribers.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  <span className="flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" /> Usage</span>
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  <span className="flex items-center justify-center gap-1"><Coins className="h-3.5 w-3.5" /> Credits</span>
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  <span className="flex items-center justify-center gap-1"><Calendar className="h-3.5 w-3.5" /> Expires</span>
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((c) => (
                <tr key={c.id} className="bg-card hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <CodeBadge code={c.code} />
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {c.users_count} / {c.max_users}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {parseFloat(c.credits_per_user) > 0 ? `+${parseFloat(c.credits_per_user)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {formatDate(c.expires_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.is_active ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleToggleActive(c)}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {c.is_active ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Generate Access Code</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="max-users">Max Users</Label>
              <Input
                id="max-users"
                type="number"
                min="1"
                value={form.max_users}
                onChange={(e) => setForm((f) => ({ ...f, max_users: e.target.value }))}
                placeholder="e.g. 50"
              />
              <p className="text-[11px] text-muted-foreground">
                Maximum number of subscribers who can redeem this code.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credits">Credits per User</Label>
              <Input
                id="credits"
                type="number"
                min="0"
                step="0.01"
                value={form.credits_per_user}
                onChange={(e) => setForm((f) => ({ ...f, credits_per_user: e.target.value }))}
                placeholder="0"
              />
              <p className="text-[11px] text-muted-foreground">
                Credits granted to each subscriber on redemption. Deducted from your balance upfront.
                Total: <strong>{(parseFloat(form.credits_per_user || "0") * parseInt(form.max_users || "0", 10)).toFixed(2)}</strong> credits.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expires">Expiry Date (optional)</Label>
              <Input
                id="expires"
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={submitting}>
              {submitting ? "Generating…" : "Generate Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
