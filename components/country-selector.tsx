"use client"

import { Globe, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { UserMenu } from "@/components/user-menu"
import { useUserRole } from "@/lib/hooks/use-user-role"
import { useFavorites } from "@/lib/hooks/use-favorites"

const ALL_COUNTRIES = [
  { name: "France", code: "fr" },
  { name: "Italy", code: "it" },
  { name: "Spain", code: "es" },
  { name: "Portugal", code: "pt" },
  { name: "Germany", code: "de" },
  { name: "United Kingdom", code: "gb" },
  { name: "Belgium", code: "be" },
  { name: "Netherlands", code: "nl" },
  { name: "Switzerland", code: "ch" },
  { name: "Albania", code: "al" },
  { name: "Turkey", code: "tr" },
  { name: "Arabia", code: "sa" },
  { name: "Balkans", code: "rs" },
  { name: "Russia", code: "ru" },
  { name: "Romania", code: "ro" },
  { name: "Poland", code: "pl" },
  { name: "Bulgaria", code: "bg" },
]

interface CountryStatus {
  name: string
  enabled: boolean
}

export function CountrySelector() {
  const [countryStatuses, setCountryStatuses] = useState<CountryStatus[]>([])
  const [loading, setLoading] = useState(true)
  const { isAdmin } = useUserRole()
  const { favorites, loading: favoritesLoading } = useFavorites()

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("/api/countries/enabled")
        if (res.ok) {
          const data = await res.json()
          if (data.countryStatuses) {
            setCountryStatuses(data.countryStatuses)
          } else {
            setCountryStatuses(ALL_COUNTRIES.map((c) => ({ name: c.name, enabled: true })))
          }
        } else {
          setCountryStatuses(ALL_COUNTRIES.map((c) => ({ name: c.name, enabled: true })))
        }
      } catch {
        setCountryStatuses(ALL_COUNTRIES.map((c) => ({ name: c.name, enabled: true })))
      } finally {
        setLoading(false)
      }
    }

    fetchCountries()
  }, [])

  const getCountryStatus = (countryName: string): boolean => {
    const status = countryStatuses.find((s) => s.name === countryName)
    return status?.enabled ?? true
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-card border-b border-border/50 backdrop-blur-xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 pointer-events-none" />

        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 md:gap-5 p-3 md:p-5 relative">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="relative w-48 h-12 md:w-64 md:h-16 hover:opacity-80 transition-opacity">
              <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/favorites"
              className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl glass-card border border-border/50 hover:border-yellow-400/50 hover:scale-105 transition-all duration-300 flex items-center justify-center text-foreground hover:text-yellow-400"
            >
              <Star className="w-5 h-5 md:w-6 md:h-6" />
              {!favoritesLoading && favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                  {favorites.length}
                </span>
              )}
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6 md:p-10 lg:p-16">
        <div className="text-center mb-12 md:mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4">
            Choisissez votre pays
          </h1>
          <p className="text-xl text-muted-foreground">Sélectionnez un pays pour voir les chaînes disponibles</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {ALL_COUNTRIES.map((country) => {
              const isEnabled = getCountryStatus(country.name)

              if (!isEnabled && !isAdmin) {
                return (
                  <div
                    key={country.code}
                    className="relative glass-card border border-border/30 rounded-2xl p-6 md:p-8 opacity-50 grayscale cursor-not-allowed flex flex-col items-center justify-center gap-4"
                  >
                    <div className="absolute top-2 right-2 bg-orange-500/80 text-white text-xs px-2 py-1 rounded-full">
                      Maintenance
                    </div>
                    <div className="relative w-20 h-16 md:w-24 md:h-20 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={`https://flagcdn.com/w160/${country.code}.png`}
                        alt={`${country.name} flag`}
                        fill
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-muted-foreground text-center">{country.name}</h3>
                  </div>
                )
              }

              return (
                <Link
                  key={country.code}
                  href={`/channels/${encodeURIComponent(country.name)}`}
                  className={`group glass-card border rounded-2xl p-6 md:p-8 hover:scale-105 hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-4 relative ${
                    !isEnabled
                      ? "border-orange-500/50 opacity-75"
                      : "border-border/50 hover:border-primary/50 hover:shadow-primary/20"
                  }`}
                >
                  {!isEnabled && (
                    <div className="absolute top-2 right-2 bg-orange-500/80 text-white text-xs px-2 py-1 rounded-full">
                      Maintenance
                    </div>
                  )}
                  <div className="relative w-20 h-16 md:w-24 md:h-20 rounded-lg overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Image
                      src={`https://flagcdn.com/w160/${country.code}.png`}
                      alt={`${country.name} flag`}
                      fill
                      className="object-cover"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground text-center group-hover:text-primary transition-colors">
                    {country.name}
                  </h3>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
