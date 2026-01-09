import { Suspense } from "react"
import { TVAppClient } from "@/components/tv-app-client"

export default function TVStreamingPage() {
  return (
    <Suspense fallback={null}>
      <TVAppClient />
    </Suspense>
  )
}
