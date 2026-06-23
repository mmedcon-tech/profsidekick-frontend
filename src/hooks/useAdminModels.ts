import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import config from "@/lib/config"
import { useAuth } from "@/contexts/AuthContext"

export interface Avatar3DModel {
  id: string
  name: string
  description?: string
  // file_path / preview_image_path are the DB column names;
  // model_url / thumbnail_url are the aliased names the API also returns
  file_path?: string
  preview_image_path?: string
  model_url?: string
  thumbnail_url?: string
  model_type?: "heygen" | "ready_player_me" | "three_js" | "custom"
  gender?: "male" | "female" | "neutral"
  supported_languages?: string[]
  sort_order: number
  is_active: boolean
  created_at: string
}

export function useAdminModels() {
  const { token } = useAuth()
  const [models, setModels] = useState<Avatar3DModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      if (!token) return;
      const data: any = await apiFetch(config.getApiUrl("/api/admin/3d-models"), { token })
      setModels(data.models || [])
      setError(null)
    } catch (err: any) {
      setError(err)
      console.error("Failed to fetch 3D models:", err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchModels()
    }
  }, [fetchModels, token])

  const createModel = async (payload: Partial<Avatar3DModel>) => {
    if (!token) throw new Error("Not authenticated")
    const res = await apiFetch(config.getApiUrl("/api/admin/3d-models"), {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    })
    await fetchModels()
    return res
  }

  const updateModel = async (id: string, payload: Partial<Avatar3DModel>) => {
    if (!token) throw new Error("Not authenticated")
    const res = await apiFetch(config.getApiUrl(`/api/admin/3d-models/${id}`), {
      method: "PATCH",
      token,
      body: JSON.stringify(payload)
    })
    await fetchModels()
    return res
  }

  return { models, loading, error, refresh: fetchModels, createModel, updateModel }
}
