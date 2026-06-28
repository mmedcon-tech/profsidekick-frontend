"use client"

import { useState } from "react"
import { useAdminModels, type Avatar3DModel } from "@/hooks/useAdminModels"
import { tr } from "@/lib/v2/i18n"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ModelFormData = {
  name: string
  model_type: string
  model_url: string
  thumbnail_url: string
  supported_languages: string
  gender: string
}

const EMPTY_FORM: ModelFormData = {
  name: "",
  model_type: "three_js",
  model_url: "",
  thumbnail_url: "",
  supported_languages: "en",
  gender: "neutral",
}

export default function AdminModelsPage() {
  const lang = "en" as "en" | "ar"
  const { models, loading, error, createModel, updateModel } = useAdminModels()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Avatar3DModel | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [formData, setFormData] = useState<ModelFormData>(EMPTY_FORM)

  const openCreate = () => {
    setEditingModel(null)
    setFormData(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  const openEdit = (model: Avatar3DModel) => {
    setEditingModel(model)
    setFormData({
      name: model.name,
      model_type: model.model_type ?? "three_js",
      model_url: model.model_url ?? model.file_path ?? "",
      thumbnail_url: model.thumbnail_url ?? model.preview_image_path ?? "",
      supported_languages: (model.supported_languages ?? ["en"]).join(", "),
      gender: model.gender ?? "neutral",
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      name: formData.name,
      model_type: formData.model_type as Avatar3DModel["model_type"],
      model_url: formData.model_url,
      thumbnail_url: formData.thumbnail_url || undefined,
      supported_languages: formData.supported_languages.split(",").map(l => l.trim()).filter(Boolean),
      gender: formData.gender as Avatar3DModel["gender"],
      is_active: true,
      sort_order: 0,
    }
    try {
      if (editingModel) {
        await updateModel(editingModel.id, payload)
      } else {
        await createModel(payload)
      }
      setIsDialogOpen(false)
    } catch (err) {
      console.error(err)
      alert(editingModel ? "Failed to update model" : "Failed to create model")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (model: Avatar3DModel) => {
    setToggling(model.id)
    try {
      await updateModel(model.id, { is_active: !model.is_active })
    } catch (err) {
      console.error(err)
      alert("Failed to update model status")
    } finally {
      setToggling(null)
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

  const thumbnailFor = (model: Avatar3DModel) =>
    model.thumbnail_url ?? model.preview_image_path ?? null

  const urlFor = (model: Avatar3DModel) =>
    model.model_url ?? model.file_path ?? ""

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
        <Button onClick={openCreate} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          {tr("addModel", lang) || "Add Model"}
        </Button>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingModel ? "Edit Model" : "Add 3D Model"}</DialogTitle>
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
                <Input required value={formData.model_url} onChange={e => setFormData({...formData, model_url: e.target.value})} placeholder="/avatars/model.glb or HeyGen avatar_id" />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL (optional)</Label>
                <Input value={formData.thumbnail_url} onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} placeholder="/images/preview.png" />
              </div>
              <div className="space-y-2">
                <Label>Supported Languages</Label>
                <Input value={formData.supported_languages} onChange={e => setFormData({...formData, supported_languages: e.target.value})} placeholder="en, ar" />
                <p className="text-[10px] text-muted-foreground">Comma-separated ISO codes</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (editingModel ? "Saving..." : "Adding...") : (editingModel ? "Save Changes" : "Add Model")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <div key={model.id} className="overflow-hidden rounded-xl border border-border bg-card hover:border-primary/50 transition-colors">
            {/* Thumbnail */}
            <div className="relative h-40 bg-sidebar">
              {thumbnailFor(model) ? (
                <img
                  src={thumbnailFor(model)!}
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
                {model.model_type && (
                  <Badge className={cn("text-[10px] uppercase font-bold", modelTypeColors[model.model_type] ?? modelTypeColors.custom)}>
                    {model.model_type}
                  </Badge>
                )}
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

              <p className="truncate text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">
                {urlFor(model) || "—"}
              </p>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 hover:bg-primary/5 hover:text-primary"
                  onClick={() => openEdit(model)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  {tr("edit", lang) || "Edit"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={toggling === model.id}
                  onClick={() => handleToggleActive(model)}
                >
                  {toggling === model.id
                    ? "..."
                    : model.is_active
                      ? (tr("inactive", lang) || "Deactivate")
                      : (tr("active", lang) || "Activate")}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed rounded-xl border-border bg-sidebar/30">
            <h3 className="text-sm font-semibold text-foreground mb-1">No 3D Models Configured</h3>
            <p className="text-xs text-muted-foreground">Get started by adding your first avatar model to the catalog.</p>
            <Button onClick={openCreate} className="mt-4 gap-1.5 bg-primary" size="sm">
              <Plus className="h-4 w-4" />
              Add First Model
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
