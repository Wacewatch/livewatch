import type { Channel, GroupedChannel } from "@/lib/types"

const TRAILING_NUMBER_REGEX = /\s*[(]\d+[)]\s*$/
const ALL_NUMBERS_REGEX = /\s*[(]\d+[)]\s*/g
const EXTRACT_NUMBER_REGEX = /[(](\d+)[)]/

// Quality suffixes to remove for grouping
const QUALITY_SUFFIXES = /\s*(FHD|HD\+|HD|4K|UHD|SD|HEVC|H\.?265|LIVE\s*DURING.*|MULTI.*|VF|VO|VOSTFR)\s*/gi

const TRAILING_BRACKETS = /\s*[[\]{}|\\/]+\s*$/g
const TRAILING_SPECIAL = /\s*[+\-_.:;,!?]+\s*$/

export function normalizeChannelName(name: string): string {
  let normalized = name.toUpperCase().trim()

  // Remove all (N) patterns
  normalized = normalized.replace(ALL_NUMBERS_REGEX, " ")

  // Remove quality suffixes
  normalized = normalized.replace(QUALITY_SUFFIXES, " ")

  normalized = normalized.replace(TRAILING_BRACKETS, "")

  normalized = normalized.replace(TRAILING_SPECIAL, "")

  // Remove trailing + signs
  normalized = normalized.replace(/\s*\+\s*$/, "")

  normalized = normalized.replace(/\s+/g, "")

  return normalized
}

export function getCleanDisplayName(name: string): string {
  let clean = name.trim()

  // Remove trailing (N) pattern
  clean = clean.replace(TRAILING_NUMBER_REGEX, "").trim()

  clean = clean.replace(TRAILING_BRACKETS, "").trim()

  clean = clean.replace(TRAILING_SPECIAL, "").trim()

  return clean
}

function getBestDisplayName(sources: { originalName: string }[]): string {
  // Prefer names without quality suffixes but keep the base name
  const names = sources.map((s) => getCleanDisplayName(s.originalName))

  // and without quality suffixes
  let bestName = names[0]
  let bestScore = 0

  for (const name of names) {
    // Remove quality suffixes for comparison
    const cleanName = name.replace(QUALITY_SUFFIXES, " ").replace(/\s+/g, " ").trim()

    // Score: prefer names with spaces (readable), shorter overall
    let score = 0

    // Has proper spacing
    if (cleanName.includes(" ")) score += 10

    // Shorter is better (removes HD, FHD, etc.)
    score += 100 - cleanName.length

    // Doesn't have trailing brackets or special chars
    if (!cleanName.match(/[[\]{}|\\/+\-_.:;,!?]$/)) score += 5

    if (score > bestScore) {
      bestScore = score
      bestName = cleanName
    }
  }

  return bestName || names[0]
}

export function groupChannels(channels: Channel[]): GroupedChannel[] {
  const grouped: Record<string, GroupedChannel> = {}

  for (const channel of channels) {
    const normalizedName = normalizeChannelName(channel.name)
    const key = `${normalizedName}__${channel.country || "Unknown"}`

    if (!grouped[key]) {
      grouped[key] = {
        displayName: "", // Will be set later
        normalizedName,
        country: channel.country || "Unknown",
        sources: [],
      }
    }

    grouped[key].sources.push({
      id: channel.id,
      originalName: channel.name,
    })
  }

  for (const group of Object.values(grouped)) {
    // Get the best display name from sources
    group.displayName = getBestDisplayName(group.sources)

    // Sort sources by number in parentheses, then alphabetically
    group.sources.sort((a, b) => {
      const matchA = a.originalName.match(EXTRACT_NUMBER_REGEX)
      const matchB = b.originalName.match(EXTRACT_NUMBER_REGEX)
      const numA = matchA ? Number.parseInt(matchA[1], 10) : 999
      const numB = matchB ? Number.parseInt(matchB[1], 10) : 999

      if (numA !== numB) return numA - numB
      return a.originalName.localeCompare(b.originalName)
    })
  }

  return Object.values(grouped)
}
