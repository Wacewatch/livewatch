"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export type AppVersion = "alpha" | "delta"

interface VersionContextType {
  version: AppVersion
  setVersion: (version: AppVersion) => void
  toggleVersion: () => void
}

const VersionContext = createContext<VersionContextType | undefined>(undefined)

export function VersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersionState] = useState<AppVersion>("alpha")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load version from localStorage on mount
    const savedVersion = localStorage.getItem("app_version") as AppVersion
    if (savedVersion === "alpha" || savedVersion === "delta") {
      setVersionState(savedVersion)
    }
    setMounted(true)
  }, [])

  const setVersion = (newVersion: AppVersion) => {
    setVersionState(newVersion)
    localStorage.setItem("app_version", newVersion)
    console.log("[v0] Version switched to:", newVersion)
  }

  const toggleVersion = () => {
    const newVersion = version === "alpha" ? "delta" : "alpha"
    setVersion(newVersion)
  }

  // Don't render children until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <VersionContext.Provider value={{ version, setVersion, toggleVersion }}>
      {children}
    </VersionContext.Provider>
  )
}

export function useVersion() {
  const context = useContext(VersionContext)
  if (context === undefined) {
    throw new Error("useVersion must be used within a VersionProvider")
  }
  return context
}
