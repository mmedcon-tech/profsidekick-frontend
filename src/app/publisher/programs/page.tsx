"use client"

import { useState, useEffect } from "react"
import { usePrograms } from "@/hooks/usePrograms"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Bot, BookOpen, Palette, Globe, Lock, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type { Program } from "@/lib/v2/data"

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

interface ProgramFormState {
  name: string
  slug: string
  description: string
  isPublic: boolean
  primaryColor: string
  secondaryColor: string
  accentColor: string
  slugTouched: boolean
}

const defaultForm = (): ProgramFormState => ({
  name: "",
  slug: "",
  description: "",
  isPublic: true,
  primaryColor: "#1A3C6B",
  secondaryColor: "#D4AF37",
  accentColor: "#FFFFFF",
  slugTouched: false,
})

function ProgramForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  initial?: ProgramFormState
  onSubmit: (data: ProgramFormState) => void
  onCancel: () => void
  submitting: boolean
  submitLabel: string
}) {
  const [form, setForm] = useState<ProgramFormState>(initial ?? defaultForm())

  useEffect(() => {
    if (!form.slugTouched) {
      setForm(f => ({ ...f, slug: slugify(f.name) }))
    }
  }, [form.name, form.slugTouched])

  const set = (patch: Partial<ProgramFormState>) => setForm(f => ({ ...f, ...patch }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="prog-name">Program Name</Label>
          <Input
            id="prog-name"
            required
            value={form.name}
            onChange={e => set({ name: e.target.value })}
            placeholder="e.g. AI Governance Training"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prog-slug">URL Slug</Label>
          <Input
            id="prog-slug"
            required
            value={form.slug}
            onChange={e => set({ slug: slugify(e.target.value), slugTouched: true })}
            placeholder="ai-governance-training"
          />
          <p className="text-[11px] text-muted-foreground">
            Public URL: <span className="font-mono">/{form.slug || "…"}</span> — auto-generated from name, editable.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prog-desc">Description</Label>
          <Textarea
            id="prog-desc"
            value={form.description}
            onChange={e => set({ description: e.target.value })}
            placeholder="Describe this program…"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="prog-public"
            checked={form.isPublic}
            onCheckedChange={v => set({ isPublic: v })}
          />
          <Label htmlFor="prog-public" className="cursor-pointer">
            {form.isPublic ? "Public — visible in marketplace" : "Private — invite-only"}
          </Label>
        </div>

        <div className="space-y-2">
          <Label>Theme Colors</Label>
          <div className="flex gap-5 items-center">
            {(
              [
                { key: "primaryColor", label: "Primary" },
                { key: "secondaryColor", label: "Secondary" },
                { key: "accentColor", label: "Accent" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={form[key]}
                  onChange={e => set({ [key]: e.target.value })}
                  className="h-8 w-8 rounded cursor-pointer border border-border"
                />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function PublisherProgramsPage() {
  const { programs, loading, createProgram, updateProgram } = usePrograms()
  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editTarget, setEditTarget] = useState<Program | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const handleCreate = async (form: ProgramFormState) => {
    setCreateSubmitting(true)
    try {
      await createProgram({
        name: { en: form.name, ar: form.name },
        slug: form.slug || slugify(form.name),
        description: { en: form.description, ar: form.description },
        isPublic: form.isPublic,
        themeConfig: {
          brandName: form.name,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          fontFamily: "Inter, sans-serif",
        },
      })
      setCreateOpen(false)
    } catch (err) {
      console.error(err)
      alert("Failed to create program")
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEdit = async (form: ProgramFormState) => {
    if (!editTarget) return
    setEditSubmitting(true)
    try {
      await updateProgram(editTarget.id, {
        name: { en: form.name, ar: form.name },
        slug: form.slug || slugify(form.name),
        description: { en: form.description, ar: form.description },
        isPublic: form.isPublic,
        themeConfig: {
          brandName: form.name,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          fontFamily: editTarget.themeConfig?.fontFamily ?? "Inter, sans-serif",
        },
      })
      setEditTarget(null)
    } catch (err) {
      console.error(err)
      alert("Failed to save program settings")
    } finally {
      setEditSubmitting(false)
    }
  }

  const toFormState = (p: Program): ProgramFormState => ({
    name: p.name.en || "",
    slug: p.slug,
    description: p.description.en || "",
    isPublic: p.isPublic,
    primaryColor: p.themeConfig?.primaryColor ?? "#1A3C6B",
    secondaryColor: p.themeConfig?.secondaryColor ?? "#D4AF37",
    accentColor: p.themeConfig?.accentColor ?? "#FFFFFF",
    slugTouched: true,
  })

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading programs…</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Programs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Group avatars and courses under branded training programs.
          </p>
        </div>

        <Button
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Program
        </Button>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Create New Program</DialogTitle>
            </DialogHeader>
            <ProgramForm
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
              submitting={createSubmitting}
              submitLabel="Create Program"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Settings Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null) }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Program Settings</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ProgramForm
              initial={toFormState(editTarget)}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
              submitting={editSubmitting}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {programs.length === 0 && (
          <div className="text-center py-12 border rounded-xl border-dashed bg-muted/20">
            <h3 className="text-lg font-medium text-muted-foreground">No programs yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first program to group courses and avatars.
            </p>
          </div>
        )}

        {programs.map(program => {
          const theme = program.themeConfig
          const displayName = program.name.en || program.name.ar || ""
          const displayDesc = program.description?.en || program.description?.ar || ""

          return (
            <div key={program.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{
                  background: theme?.primaryColor ?? "#1A3C6B",
                  color: theme?.accentColor ?? "#FFF",
                }}
              >
                <div>
                  <h3 className="font-bold">{displayName}</h3>
                  <p className="mt-0.5 text-xs opacity-75">/{program.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {program.isPublic ? (
                    <Badge
                      style={{
                        background: theme?.secondaryColor ?? "#D4AF37",
                        color: theme?.primaryColor ?? "#1A3C6B",
                      }}
                      className="text-[10px]"
                    >
                      <Globe className="me-1 h-3 w-3" /> Public
                    </Badge>
                  ) : (
                    <Badge className="bg-white/20 text-white text-[10px]">
                      <Lock className="me-1 h-3 w-3" /> Private
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-4">
                {displayDesc && (
                  <p className="text-sm text-muted-foreground">{displayDesc}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Bot className="h-4 w-4" />
                    {program.avatarIds?.length ?? 0} Avatars
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {program.courseIds?.length ?? 0} Courses
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {program.memberIds?.length ?? 0} Subscribers
                  </span>
                </div>

                {theme && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Palette className="h-3.5 w-3.5" />
                      Theme preview
                    </div>
                    <div className="flex items-center gap-2">
                      {[theme.primaryColor, theme.secondaryColor, theme.accentColor].map(
                        (color, i) => (
                          <div
                            key={i}
                            className="h-6 w-6 rounded-full ring-1 ring-border shadow-sm"
                            style={{ background: color }}
                            title={color}
                          />
                        ),
                      )}
                      <span className="ms-2 text-xs text-muted-foreground">
                        {theme.fontFamily?.split(",")[0]}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditTarget(program)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Edit Settings
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Manage Subscribers
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
