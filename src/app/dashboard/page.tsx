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
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>

      {/* Header */}
      <header className="page-header">
        <div className="page-header-inner">
          <Image
            src="/logo.png"
            alt="Keep Alive"
            width={36}
            height={36}
            style={{ objectFit: 'contain', borderRadius: 12, cursor: 'pointer' }}
            onClick={() => router.push('/dashboard')}
          />
          <button
            onClick={() => router.push('/dashboard/perfil')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--color-terracota)', color: 'white',
              fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer'
            }}
          >
            {userName ? userName[0].toUpperCase() : 'U'}
          </button>
        </div>
      </header>

      {/* Contenido */}
      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Saludo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, color: 'var(--color-gris)' }}>Hola,</p>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-texto)' }}>{userName}</h1>
          </div>
          <button
            onClick={() => router.push('/dashboard/nueva-historia')}
            style={{
              flexShrink: 0, height: 40, padding: '0 20px',
              background: 'var(--color-terracota)', color: 'white',
              fontSize: 14, fontWeight: 600,
              border: 'none', borderRadius: 12, cursor: 'pointer'
            }}
          >
            + Nueva historia
          </button>
        </div>

        {/* Historias */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Mis historias
          </p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2].map((i) => (
                <div key={i} style={{ borderRadius: 16, height: 96, background: 'var(--color-crema-oscuro)' }} />
              ))}
            </div>
          ) : historias.length === 0 ? (
            <div style={{
              borderRadius: 16, border: '1.5px solid var(--color-borde)',
              padding: 48, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 16, textAlign: 'center', background: 'white'
            }}>
              <span style={{ fontSize: 48 }}>📖</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-texto)' }}>Todavía no tenés historias</p>
                <p style={{ fontSize: 13, color: 'var(--color-gris)', marginTop: 4 }}>
                  Creá tu primera historia y empezá a construir tu legado familiar.
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard/nueva-historia')}
                style={{
                  marginTop: 8, height: 40, padding: '0 24px',
                  background: 'var(--color-terracota)', color: 'white',
                  fontSize: 14, fontWeight: 600,
                  border: 'none', borderRadius: 12, cursor: 'pointer'
                }}
              >
                + Crear historia
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {historias.map((h) => (
                <div
                  key={h.id}
                  onClick={() => router.push(`/dashboard/historia/${h.id}`)}
                  style={{
                    background: 'white', borderRadius: 16,
                    padding: 20, cursor: 'pointer',
                    border: '1.5px solid var(--color-borde)',
                    display: 'flex', flexDirection: 'column', gap: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-texto)', lineHeight: 1.3 }}>{h.titulo}</h3>
                    <span style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 20, flexShrink: 0, fontWeight: 500,
                      background: h.estado === 'completada' ? 'var(--color-badge-verde-bg)' : 'var(--color-crema-oscuro)',
                      color: h.estado === 'completada' ? 'var(--color-salvia)' : 'var(--color-gris)'
                    }}>
                      {h.estado === 'completada' ? 'Completa' : 'En progreso'}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-gris)' }}>
                    {h.tipo === 'autobiografia' ? 'Autobiografía' : `Regalo · ${h.nombre_protagonista}`}
                  </p>
                  {h.descripcion && (
                    <p style={{ fontSize: 12, color: 'var(--color-gris)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {h.descripcion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <button
          onClick={handleLogout}
          style={{ fontSize: 12, color: 'var(--color-gris)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}