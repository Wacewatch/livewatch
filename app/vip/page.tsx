import { VipUpgradeForm } from "@/components/vip-upgrade-form"

export default function VipPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/10">
      <div className="container mx-auto px-4 py-16">
        <VipUpgradeForm />
      </div>
    </div>
  )
}
