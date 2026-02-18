"use client"

import { CountrySelector } from "@/components/country-selector"
import { ChannelsClient } from "@/components/channels-client"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function HomePage() {
  const searchParams = useSearchParams()
  const channelParam = searchParams.get("channel")
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [channelToOpen, setChannelToOpen] = useState<string | null>(null)

  useEffect(() => {
    if (channelParam) {
      console.log("[v0] Channel param detected:", channelParam)
      // Extract country from channel ID if present (e.g., "vavoo_...|group:fr" -> "France")
      const countryMatch = channelParam.match(/\|group:([a-z]+)/)
      const countryCode = countryMatch ? countryMatch[1] : "fr"
      
      const countryMap: Record<string, string> = {
        fr: "France",
        it: "Italy",
        es: "Spain",
        pt: "Portugal",
        de: "Germany",
        uk: "United Kingdom",
        gb: "United Kingdom",
        be: "Belgium",
        nl: "Netherlands",
        ch: "Switzerland",
        al: "Albania",
        tr: "Turkey",
        sa: "Arabia",
        rs: "Balkans",
        ru: "Russia",
        ro: "Romania",
        pl: "Poland",
        bg: "Bulgaria",
      }
      
      setSelectedCountry(countryMap[countryCode] || "France")
      setChannelToOpen(channelParam)
    }
  }, [channelParam])

  // If a channel is specified in URL, show ChannelsClient directly
  if (channelToOpen && selectedCountry) {
    return <ChannelsClient country={selectedCountry} channelToOpen={channelToOpen} />
  }

  return <CountrySelector />
}
