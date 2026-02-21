"use client"

import { useSearchParams } from "next/navigation"
import { DeltaChannelsClientFull } from "@/components/delta-channels-client-full"

export default function DeltaChannelsPage() {
  const searchParams = useSearchParams()
  const country = searchParams.get("country")

  if (!country) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Pays non spécifié</p>
        </div>
      </div>
    )
  }

  return <DeltaChannelsClientFull country={country} />
}
