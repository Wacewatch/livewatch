"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Globe } from "lucide-react"

interface Country {
  name: string
  flag: string
  code: string
}

export function DeltaCountrySelector() {
  const router = useRouter()
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/delta/countries")
      .then((res) => res.json())
      .then((data) => {
        console.log("[v0] Delta countries received:", data)
        // Make sure data is an array
        if (Array.isArray(data)) {
          setCountries(data)
        } else {
          console.error("[v0] Invalid data format, expected array:", data)
          setCountries([])
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("[v0] Error fetching Delta countries:", error)
        setCountries([])
        setIsLoading(false)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des pays Delta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/10">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent mb-4">
            LiveWatch Delta
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Version Delta - Sélectionnez votre pays
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
          {countries.map((country, index) => (
            <button
              key={`${country.code}-${index}`}
              onClick={() => router.push(`/channels/delta?country=${encodeURIComponent(country.name)}`)}
              className="glass-card border border-border/50 hover:border-primary/50 p-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 group"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                  {country.flag}
                </div>
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {country.name}
                </span>
              </div>
            </button>
          ))}
        </div>

        {countries.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun pays disponible</p>
          </div>
        )}
      </div>
    </div>
  )
}
