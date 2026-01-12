import { Suspense } from "react"
import { ChannelsClient } from "@/components/channels-client"

export default async function CountryChannelsPage({ params }: { params: Promise<{ country: string }> }) {
  const resolvedParams = await params
  return (
    <Suspense fallback={null}>
      <ChannelsClient country={decodeURIComponent(resolvedParams.country)} />
    </Suspense>
  )
}
