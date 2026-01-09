export interface Channel {
  id: string
  name: string
  country: string
  p?: number // priority field from Vavoo
}

export interface GroupedChannel {
  displayName: string
  normalizedName: string
  country: string
  sources: {
    id: string
    originalName: string
  }[]
}

export type SortType = "name" | "trending"
