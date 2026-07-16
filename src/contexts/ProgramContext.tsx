"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePrograms } from '@/hooks/usePrograms'
import type { Program } from '@/lib/v2/data'

const STORAGE_KEY = 'myos_active_program_id'

interface ProgramContextValue {
  programs: Program[]
  activeProgram: Program | null
  setActiveProgram: (p: Program | null) => void
  loading: boolean
  /** True once localStorage has been read AND programs list has loaded. Safe to fetch with. */
  contextReady: boolean
}

const ProgramContext = createContext<ProgramContextValue>({
  programs: [],
  activeProgram: null,
  setActiveProgram: () => {},
  loading: false,
  contextReady: false,
})

export function useProgramContext() {
  return useContext(ProgramContext)
}

export function ProgramContextProvider({ children }: { children: React.ReactNode }) {
  const { programs, loading } = usePrograms()
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null)
  const [localStorageRead, setLocalStorageRead] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setActiveProgramId(stored)
    setLocalStorageRead(true)
  }, [])

  // Validate stored ID is still a valid program once programs load
  useEffect(() => {
    if (!loading && activeProgramId) {
      const stillValid = programs.some(p => p.id === activeProgramId)
      if (!stillValid) {
        localStorage.removeItem(STORAGE_KEY)
        setActiveProgramId(null)
      }
    }
  }, [programs, loading, activeProgramId])

  const activeProgram = programs.find(p => p.id === activeProgramId) ?? null

  const setActiveProgram = useCallback((p: Program | null) => {
    if (p) {
      localStorage.setItem(STORAGE_KEY, p.id)
      setActiveProgramId(p.id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
      setActiveProgramId(null)
    }
  }, [])

  const contextReady = localStorageRead && !loading

  return (
    <ProgramContext.Provider value={{ programs, activeProgram, setActiveProgram, loading, contextReady }}>
      {children}
    </ProgramContext.Provider>
  )
}
