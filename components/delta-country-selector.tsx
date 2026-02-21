"use client"

import { Globe, Info, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { UserMenu } from "@/components/user-menu"
import { VersionToggle } from "@/components/version-toggle"
import { Footer } from "@/components/footer"

interface Country {
  id: string
  name: string
  flag: string
  channel_count?: number
}

// Mapping codes to flag images
const FLAG_MAP: Record<string, string> = {
  "albania": "al",
  "arabia": "sa",
  "balkans": "rs",
  "bulgaria": "bg",
  "france": "fr",
  "germany": "de",
  "italy": "it",
  "netherlands": "nl",
  "poland": "pl",
  "portugal": "pt",
  "romania": "ro",
  "russia": "ru",
  "spain": "es",
  "turkey": "tr",
  "united-kingdom": "gb",
}

export function DeltaCountrySelector() {
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/delta/countries")
      .then((res) => res.json())
      .then((data) => {
        console.log("[v0] Delta countries received:", data)
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10 pointer-events-none" />

        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 md:gap-5 p-3 md:p-5 relative">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="relative w-48 h-12 md:w-64 md:h-16 hover:opacity-80 transition-opacity">
              <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <VersionToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6 md:p-10 lg:p-16 flex-1">
        <div className="text-center mb-12 md:mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-12 h-12 text-purple-400" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
            <span className="text-purple-400 font-semibold text-sm">VERSION DELTA</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
            Choisissez votre pays
          </h1>
          <p className="text-xl text-muted-foreground">Sélectionnez un pays pour voir les chaînes disponibles</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {countries.map((country, index) => {
              const countryId = country.id || country.name?.toLowerCase().replace(/\s+/g, "-") || ""
              const flagCode = FLAG_MAP[countryId] || (countryId ? countryId.substring(0, 2) : "fr")
              
              return (
                <Link
                  key={`${countryId}-${index}`}
                  href={`/channels/delta?country=${encodeURIComponent(country.name)}`}
                  className="group glass-card border border-purple-500/30 rounded-2xl p-6 md:p-8 hover:scale-105 hover:shadow-xl hover:border-purple-500/50 hover:shadow-purple-500/20 transition-all duration-300 flex flex-col items-center justify-center gap-4"
                >
                  <div className="relative w-20 h-16 md:w-24 md:h-20 rounded-lg overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Image
                      src={`https://flagcdn.com/w160/${flagCode}.png`}
                      alt={`${country.name} flag`}
                      fill
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground text-center group-hover:text-purple-400 transition-colors">
                    {country.name}
                  </h3>
                </Link>
              )
            })}
          </div>
        )}

        {countries.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">Aucun pays disponible pour le moment</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
