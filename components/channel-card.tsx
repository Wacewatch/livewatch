"use client"

import { Star, Tv, Play } from "lucide-react"
import type { GroupedChannel } from "@/lib/types"

interface ChannelCardProps {
  channel: GroupedChannel
  isFavorite: boolean
  onToggleFavorite: () => void
  onClick: () => void
}

export function ChannelCard({ channel, isFavorite, onToggleFavorite, onClick }: ChannelCardProps) {
  const sourceCount = channel.sources.length
  const sourceBadgeClass =
    sourceCount > 5
      ? "text-emerald-400 border-emerald-400/30"
      : sourceCount > 1
        ? "text-blue-400 border-blue-400/30"
        : "text-muted-foreground border-muted-foreground/30"

  return (
    <div
      className="group relative overflow-hidden rounded-2xl glass-card transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/30 cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-accent to-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite()
        }}
        className={`absolute top-4 right-4 z-10 w-11 h-11 rounded-full glass-card flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-12 ${
          isFavorite ? "text-yellow-400 glow-accent" : "text-white/70 hover:text-white"
        }`}
      >
        <Star className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} strokeWidth={2} />
      </button>

      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-card to-accent/20 aspect-video flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Tv
          className="w-20 h-20 text-primary/80 relative z-10 group-hover:scale-110 transition-transform duration-500"
          strokeWidth={1.5}
        />

        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center glow-primary">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-lg mb-3 text-foreground truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent transition-all duration-300">
          {channel.displayName}
        </h3>

        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/20 border border-red-500/50 text-red-400 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
            LIVE
          </span>

          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold glass-card text-primary border border-primary/30">
            {channel.country}
          </span>

          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold glass-card ${sourceBadgeClass}`}
          >
            {sourceCount} {sourceCount > 1 ? "sources" : "source"}
          </span>
        </div>
      </div>
    </div>
  )
}
