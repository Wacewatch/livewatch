import { Metadata } from 'next'
import UserDashboard from '@/components/user-dashboard'

export const metadata: Metadata = {
  title: 'Mon Tableau de Bord | LiveWatch',
  description: 'Gérez votre profil et vos paramètres VIP',
}

export default function DashboardPage() {
  return <UserDashboard />
}
