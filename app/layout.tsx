import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import Script from "next/script"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LiveWatch - Streaming en Direct by WaveWatch",
  description:
    "Regardez vos chaînes TV préférées en direct et en HD. Des milliers de chaînes disponibles du monde entier.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "https://i.imgur.com/ovX7j6R.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "https://i.imgur.com/ovX7j6R.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "https://i.imgur.com/ovX7j6R.png",
        type: "image/svg+xml",
      },
    ],
    apple: "https://i.imgur.com/ovX7j6R.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#667eea",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        {/* Histats */}
        <Script id="histats-5002142" strategy="afterInteractive">
          {`
            var _Hasync = _Hasync || [];
            _Hasync.push(['Histats.start', '1,5002142,4,0,0,0,00000000']);
            _Hasync.push(['Histats.fasi', '1']);
            _Hasync.push(['Histats.track_hits', '']);
            (function() {
              var hs = document.createElement('script'); 
              hs.type = 'text/javascript'; 
              hs.async = true;
              hs.src = '//s10.histats.com/js15_as.js';
              (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(hs);
            })();
          `}
        </Script>
      </head>

      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />

        {/* Histats noscript */}
        <noscript>
          <a href="/" target="_blank">
            <img src="//sstatic1.histats.com/0.gif?5002142&101" alt="web log free" />
          </a>
        </noscript>
      </body>
    </html>
  )
}
