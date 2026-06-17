"use client"

import { useState } from "react"
import { useAdminModels } from "@/hooks/useAdminModels"
import { tr } from "@/lib/v2/i18n"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminModelsPage() {
  const lang = "en"
  const { models, loading, error, createModel } = useAdminModels()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    model_type: "heygen",
    model_url: "",
    thumbnail_url: "",
    supported_languages: "en, ar",
    gender: "neutral",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createModel({
        name: formData.name,
        model_type: formData.model_type as any,
        model_url: formData.model_url,
        thumbnail_url: formData.thumbnail_url || undefined,
        supported_languages: formData.supported_languages.split(",").map(l => l.trim()),
        gender: formData.gender as any,
        is_active: true,
        sort_order: 0,
      })
      setIsDialogOpen(false)
      setFormData({
        name: "", model_type: "heygen", model_url: "", thumbnail_url: "", supported_languages: "en, ar", gender: "neutral"
      })
    } catch (err) {
      console.error(err)
      alert("Failed to create model")
    } finally {
      setSubmitting(false)
    }
  }

  const modelTypeColors: Record<string, string> = {
    heygen: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    ready_player_me: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    three_js: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    custom: "bg-muted text-muted-foreground",
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading models...</div>
  }

  if (error) {
    return (
      <div className="p-6 text-destructive flex flex-col gap-2">
        <h2 className="font-semibold text-lg">Error loading 3D Models</h2>
        <p className="text-sm">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{tr("models", lang) || "3D Models Catalog"}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {lang === "ar"
              ? "إدارة كتالوج النماذج ثلاثية الأبعاد المتاحة للناشرين"
              : "Manage the 3D model catalog available to publishers"}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              {tr("addModel", lang) || "Add Model"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add 3D Model</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Emirati Female 001" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model Type</Label>
                    <Select value={formData.model_type} onValueChange={v => setFormData({...formData, model_type: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="heygen">HeyGen</SelectItem>
                        <SelectItem value="ready_player_me">Ready Player Me</SelectItem>
                        <SelectItem value="three_js">Three.js</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Model URL or ID</Label>
                  <Input required value={formData.model_url} onChange={e => setFormData({...formData, model_url: e.target.value})} placeholder="HeyGen avatar_id or model URL" />
                </div>
                <div className="space-y-2">
                  <Label>Thumbnail URL (optional)</Label>
                  <Input value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Supported Languages</Label>
                  <Input value={formData.supported_languages} onChange={e => setFormData({...formData, supported_languages: e.target.value})} placeholder="en, ar" />
                  <p className="text-[10px] text-muted-foreground">Comma-separated ISO codes</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add Model'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <div key={model.id} className="overflow-hidden rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
            {/* Thumbnail */}
            <div className="relative h-40 bg-sidebar">
              {model.thumbnail_url ? (
                <img
                  src={model.thumbnail_url}
                  alt={model.name}
                  className="w-full h-full object-contain p-6 drop-shadow-md"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-medium">
                  No Preview
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-sidebar/60 to-transparent" />
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                <Badge className={cn("text-[10px] uppercase font-bold", modelTypeColors[model.model_type] || modelTypeColors.custom)}>
                  {model.model_type}
                </Badge>
                {model.gender && (
                  <Badge variant="outline" className="text-[10px] border-sidebar-border text-sidebar-foreground/80 uppercase">
                    {tr(model.gender, lang) || model.gender}
                  </Badge>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-foreground truncate">{model.name}</p>
                <div className={cn(
                  "h-2.5 w-2.5 shrink-0 mt-1 rounded-full shadow-sm",
                  model.is_active ? "bg-green-500 shadow-green-500/50" : "bg-muted-foreground"
                )} title={model.is_active ? "Active" : "Inactive"} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {model.supported_languages?.map((l) => (
                  <span key={l} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                    {l}
                  </span>
                ))}
              </div>

              <p className="truncate text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">{model.model_url}</p>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 hover:bg-primary/5 hover:text-primary">
                  {tr("edit", lang) || "Edit"}
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  {model.is_active ? (tr("inactive", lang) || "Deactivate") : (tr("active", lang) || "Activate")}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed rounded-xl border-border bg-sidebar/30">
            <h3 className="text-sm font-semibold text-foreground mb-1">No 3D Models Configured</h3>
            <p className="text-xs text-muted-foreground">Get started by adding your first avatar model to the catalog.</p>
            <Button className="mt-4 gap-1.5 bg-primary" size="sm">
              <Plus className="h-4 w-4" />
              Add First Model
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
