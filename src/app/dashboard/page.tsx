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
    <main className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#EEEEEE] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Image
          src="/logo.jpg"
          alt="Keep Alive"
          width={40}
          height={40}
          className="object-contain rounded-lg"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/dashboard/perfil')}
            className="w-8 h-8 rounded-full bg-[#141414] flex items-center justify-center text-white text-xs font-medium"
          >
            {userName ? userName[0].toUpperCase() : 'U'}
          </button>
        </div>
      </header>

      <div className="px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto">

        {/* Saludo */}
        <div>
          <p className="text-sm text-[#888888]">Hola,</p>
          <h1 className="text-xl font-semibold text-[#141414]">{userName}</h1>
        </div>

        {/* Botón crear */}
        <button
          onClick={() => router.push('/dashboard/nueva-historia')}
          className="w-full h-12 bg-[#141414] text-white text-sm font-medium rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <span className="text-lg">+</span>
          Crear nueva historia
        </button>

        {/* Historias */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-medium text-[#888888] uppercase tracking-widest">
            Mis historias
          </h2>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
              ))}
            </div>
          ) : historias.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
              <span className="text-4xl">📖</span>
              <p className="text-sm font-medium text-[#141414]">Todavía no tenés historias</p>
              <p className="text-xs text-[#AAAAAA]">
                Creá tu primera historia y empezá a construir tu legado familiar.
              </p>
            </div>
          ) : (
            historias.map((h) => (
              <div
                key={h.id}
                onClick={() => router.push(`/dashboard/historia/${h.id}`)}
                className="bg-white rounded-2xl p-4 flex flex-col gap-2 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#141414] leading-snug flex-1">{h.titulo}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    h.estado === 'completada'
                      ? 'bg-[#E8EFF8] text-[#6B8FC2]'
                      : 'bg-[#F2F2F2] text-[#888888]'
                  }`}>
                    {h.estado === 'completada' ? 'Completa' : 'En progreso'}
                  </span>
                </div>
                <p className="text-xs text-[#888888]">
                  {h.tipo === 'autobiografia' ? 'Autobiografía' : `Regalo · ${h.nombre_protagonista}`}
                </p>
                {h.descripcion && (
                  <p className="text-xs text-[#AAAAAA] line-clamp-1">{h.descripcion}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Cerrar sesión al fondo */}
        <button
          onClick={handleLogout}
          className="text-xs text-[#AAAAAA] text-center py-2"
        >
          Cerrar sesión
        </button>

      </div>
    </main>
  )
}