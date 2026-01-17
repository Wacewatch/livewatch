"use client"

import Image from "next/image"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="w-full mt-auto border-t border-border/30 bg-gradient-to-b from-background to-background/80">
      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="relative w-40 h-10 hover:opacity-80 transition-opacity">
            <Image src="/livewatch-logo.png" alt="LiveWatch" fill className="object-contain" priority />
          </Link>

          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>by</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              WaveWatch
            </span>
          </div>

          <div className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} LiveWatch. Tous droits réservés.
          </div>
        </div>
      </div>
    </footer>
  )
}
