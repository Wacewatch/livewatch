export interface Channel {
  id: string
  name: string
  category?: string
  genres?: string[]
}

export interface ChannelWithFavorite extends Channel {
  isFavorite: boolean
}

export type SortType = "name" | "trending"
