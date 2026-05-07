'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <button
          onClick={handleLogout}
          className="text-sm text-[#4A4A4A] hover:text-[#141414] transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col items-center gap-4">
        <h1 className="text-xl font-medium text-[#141414]">Tu espacio</h1>
        <p className="text-sm text-[#888888] text-center">
          Acá vas a ver tus historias. Próximamente...
        </p>
        <button className="h-10 px-6 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors">
          + Crear historia
        </button>
      </div>
    </main>
  )
}