'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Historia = {
  id: string
  titulo: string
  descripcion: string
  tipo: 'autobiografia' | 'regalo'
  estado: 'en_progreso' | 'completada'
  nombre_protagonista: string | null
  fecha_creacion: string
}

export default function Dashboard() {
  const [historias, setHistorias] = useState<Historia[]>([])
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.nombre || user.email?.split('@')[0] || '')
      }

      const { data } = await supabase
        .from('historias')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      if (data) setHistorias(data)
      setLoading(false)
    }

    fetchData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/perfil')}
            className="w-8 h-8 rounded-full bg-[#141414] flex items-center justify-center text-white text-xs font-medium hover:bg-[#333333] transition-colors"
          >
            {userName ? userName[0].toUpperCase() : 'U'}
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-[#4A4A4A] hover:text-[#141414] transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        <div>
          <p className="text-sm text-[#888888]">Hola,</p>
          <h1 className="text-xl font-medium text-[#141414] capitalize">{userName}</h1>
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-[#888888] uppercase tracking-wide">Mis historias</h2>
            <button
              onClick={() => router.push('/dashboard/nueva-historia')}
              className="h-8 px-4 bg-[#141414] text-white text-xs font-medium rounded-md hover:bg-[#333333] transition-colors"
            >
              + Crear historia
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-[#888888]">Cargando...</div>
          ) : historias.length === 0 ? (
            <div className="bg-white border border-[#DDDDDD] rounded-xl p-8 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-[#888888]">Todavía no tenés historias.</p>
              <p className="text-xs text-[#AAAAAA]">Creá tu primera historia y empezá a construir tu legado.</p>
              <button
                onClick={() => router.push('/dashboard/nueva-historia')}
                className="h-9 px-5 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors"
              >
                + Crear historia
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {historias.map((h) => (
                <div
                  key={h.id}
                  onClick={() => router.push(`/dashboard/historia/${h.id}`)}
                  className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex flex-col gap-2 cursor-pointer hover:border-[#6B8FC2] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-[#141414]">{h.titulo}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      h.estado === 'completada'
                        ? 'bg-[#E8EFF8] text-[#6B8FC2]'
                        : 'bg-[#F2F2F2] text-[#888888]'
                    }`}>
                      {h.estado === 'completada' ? 'Completada' : 'En progreso'}
                    </span>
                  </div>
                  <p className="text-xs text-[#888888]">
                    {h.tipo === 'autobiografia' ? 'Autobiografía' : `Biografía de regalo · ${h.nombre_protagonista}`}
                  </p>
                  {h.descripcion && (
                    <p className="text-xs text-[#AAAAAA] line-clamp-1">{h.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}