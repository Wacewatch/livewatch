export interface Channel {
  id: string
  name: string
  poster?: string
  logo?: string
  background?: string
  posterShape?: string
  category?: string
  genres?: string[]
  type?: string
  language?: string
  quality?: string
  priority?: number
}

export interface GroupedChannel {
  baseId: string
  baseName: string
  poster?: string
  logo?: string
  background?: string
  posterShape?: string
  category?: string
  genres?: string[]
  type?: string
  language?: string
  quality?: string // Added quality field
  country?: string // Added country field
  isFavorite?: boolean // Added for client-side state
  sources: Array<{
    id: string
    name: string
    quality: string
    priority: number
  }>
}

export interface StreamSource {
  name: string
  url: string
  quality?: string
  priority?: number
}

export interface ChannelStream {
  id: string
  name: string
  logo?: string
  category?: string
  sources: StreamSource[]
  cached?: boolean
}

export interface ChannelWithFavorite extends GroupedChannel {
  isFavorite: boolean
}

export type SortType = "name" | "trending"
