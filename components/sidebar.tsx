"use client"

import { Globe, X, ChevronRight } from "lucide-react"

interface SidebarProps {
  countries: string[]
  channelCounts: Record<string, number>
  selectedCountry: string
  onSelectCountry: (country: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ countries, channelCounts, selectedCountry, onSelectCountry, isOpen, onClose }: SidebarProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30" onClick={onClose} />

      {/* Sidebar panel */}
      <aside className="fixed top-0 left-0 h-screen w-72 bg-card/95 backdrop-blur-xl border-r border-border/50 flex flex-col z-40 animate-in slide-in-from-left duration-300">
        <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Pays</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted/50 text-muted-foreground hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {countries.map((country) => {
            const isSelected = selectedCountry === country
            const count = channelCounts[country] || 0

            return (
              <button
                key={country}
                onClick={() => onSelectCountry(country)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 mb-1 ${
                  isSelected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/50"
                }`}
              >
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                <span className="flex-1 truncate text-sm font-medium">{country}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                    isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-border/50 shrink-0">
          <p className="text-xs text-center text-muted-foreground">
            <span className="font-bold text-primary">{countries.length}</span> pays disponibles
          </p>
        </div>
      </aside>
    </>
  )
}
