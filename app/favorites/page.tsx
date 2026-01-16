import { Suspense } from "react"
import FavoritesClient from "./favorites-client"

export default function FavoritesPage() {
  return (
    <Suspense fallback={null}>
      <FavoritesClient />
    </Suspense>
  )
}
