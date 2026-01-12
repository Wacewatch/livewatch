import { Suspense } from "react"
import { ChannelsClient } from "@/components/channels-client"

export default function CountryChannelsPage({ params }: { params: { country: string } }) {
  return (
    <Suspense fallback={null}>
      <ChannelsClient country={decodeURIComponent(params.country)} />
    </Suspense>
  )
}
