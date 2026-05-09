'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

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
        const nombre = user.user_metadata?.nombre
        const emailPrefix = user.email?.split('@')[0] || ''
        const raw = nombre || emailPrefix.replace(/[._-]/g, ' ')
        setUserName(raw.charAt(0).toUpperCase() + raw.slice(1))
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
    <main className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#F0F0F0]">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image
            src="/logo.jpg"
            alt="Keep Alive"
            width={38}
            height={38}
            className="object-contain rounded-xl cursor-pointer"
            onClick={() => router.push('/dashboard')}
          />
          <button
            onClick={() => router.push('/dashboard/perfil')}
            className="w-9 h-9 rounded-full bg-[#141414] flex items-center justify-center text-white text-sm font-medium hover:bg-[#333333] transition-colors"
          >
            {userName ? userName[0].toUpperCase() : 'U'}
          </button>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Saludo */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#888888]">Hola,</p>
            <h1 className="text-2xl font-semibold text-[#141414]">{userName}</h1>
          </div>
          <button
            onClick={() => router.push('/dashboard/nueva-historia')}
            className="h-10 px-5 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#2A2A2A] active:scale-[0.98] transition-all"
          >
            + Nueva historia
          </button>
        </div>

        {/* Historias */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-medium text-[#AAAAAA] uppercase tracking-widest">
            Mis historias
          </h2>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl h-24 animate-pulse bg-[#F0F0F0]" />
              ))}
            </div>
          ) : historias.length === 0 ? (
            <div className="rounded-2xl border border-[#EEEEEE] p-12 flex flex-col items-center gap-4 text-center bg-white shadow-sm">
              <span className="text-5xl">📖</span>
              <div>
                <p className="text-base font-medium text-[#141414]">Todavía no tenés historias</p>
                <p className="text-sm text-[#AAAAAA] mt-1 max-w-xs mx-auto">
                  Creá tu primera historia y empezá a construir tu legado familiar.
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/nueva-historia')}
                className="mt-2 h-10 px-6 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#2A2A2A] active:scale-[0.98] transition-all"
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
                  className="bg-white rounded-2xl p-5 flex flex-col gap-2 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all border border-[#EEEEEE] shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#141414] leading-snug">{h.titulo}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${
                      h.estado === 'completada'
                        ? 'bg-[#EEF3FA] text-[#6B8FC2]'
                        : 'bg-[#F5F5F5] text-[#888888]'
                    }`}>
                      {h.estado === 'completada' ? 'Completa' : 'En progreso'}
                    </span>
                  </div>
                  <p className="text-sm text-[#888888]">
                    {h.tipo === 'autobiografia' ? 'Autobiografía' : `Regalo · ${h.nombre_protagonista}`}
                  </p>
                  {h.descripcion && (
                    <p className="text-xs text-[#AAAAAA] line-clamp-1">{h.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          onClick={handleLogout}
          className="text-xs text-[#CCCCCC] hover:text-[#888888] transition-colors text-center"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}