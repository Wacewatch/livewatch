"use client"

import { Globe } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { UserMenu } from "@/components/user-menu"

const COUNTRIES = [
  { name: "France", flag: "🇫🇷", code: "fr" },
  { name: "Italy", flag: "🇮🇹", code: "it" },
  { name: "Spain", flag: "🇪🇸", code: "es" },
  { name: "Portugal", flag: "🇵🇹", code: "pt" },
  { name: "Germany", flag: "🇩🇪", code: "de" },
  { name: "United Kingdom", flag: "🇬🇧", code: "uk" },
  { name: "Belgium", flag: "🇧🇪", code: "be" },
  { name: "Netherlands", flag: "🇳🇱", code: "nl" },
  { name: "Switzerland", flag: "🇨🇭", code: "ch" },
  { name: "Albania", flag: "🇦🇱", code: "al" },
  { name: "Turkey", flag: "🇹🇷", code: "tr" },
  { name: "Arabia", flag: "🇸🇦", code: "ar" },
  { name: "Balkans", flag: "🏴", code: "rs" },
  { name: "Russia", flag: "🇷🇺", code: "ru" },
  { name: "Romania", flag: "🇷🇴", code: "ro" },
  { name: "Poland", flag: "🇵🇱", code: "pl" },
  { name: "Bulgaria", flag: "🇧🇬", code: "bg" },
]

export function CountrySelector() {
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

          <UserMenu />
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {COUNTRIES.map((country) => (
            <Link
              key={country.code}
              href={`/channels/${encodeURIComponent(country.name)}`}
              className="group glass-card border border-border/50 rounded-2xl p-6 md:p-8 hover:border-primary/50 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 flex flex-col items-center justify-center gap-4"
            >
              <div className="text-6xl md:text-7xl group-hover:scale-110 transition-transform duration-300">
                {country.flag}
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground text-center group-hover:text-primary transition-colors">
                {country.name}
              </h3>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
