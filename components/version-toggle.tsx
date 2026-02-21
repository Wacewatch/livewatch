"use client"

import { useVersion } from "@/lib/contexts/version-context"
import { Zap } from "lucide-react"

export function VersionToggle() {
  const { version, toggleVersion } = useVersion()

  return (
    <button
      onClick={toggleVersion}
      className="relative flex items-center gap-2 px-4 py-2 rounded-xl glass-card border border-border/50 hover:border-primary/50 transition-all duration-300 group"
      title={`Version ${version === "alpha" ? "Alpha" : "Delta"}`}
    >
      <div className="relative flex items-center gap-2">
        <Zap
          className={`w-4 h-4 transition-all duration-300 ${
            version === "delta" ? "text-purple-400 animate-pulse" : "text-primary"
          }`}
        />
        <span className="text-sm font-bold">
          {version === "alpha" ? (
            <span className="text-primary">Alpha</span>
          ) : (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Delta
            </span>
          )}
        </span>
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  )
}
