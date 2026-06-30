'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Colaborador = {
  id: string
  email: string
  estado: 'pendiente' | 'aceptado' | 'rechazado'
  fecha_invitacion: string
  token: string
}

type Topico = {
  id: number
  nombre_es: string
}

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [email, setEmail] = useState('')
  const [tituloHistoria, setTituloHistoria] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string

  useEffect(() => {
    fetchData()
  }, [historiaId])

  const fetchData = async () => {
    const { data: h } = await supabase
      .from('historias')
      .select('titulo')
      .eq('id', historiaId)
      .single()
    if (h) setTituloHistoria(h.titulo)

    const { data: c } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('id_historia', historiaId)
      .order('fecha_invitacion', { ascending: false })
    if (c) setColaboradores(c)

    const { data: ht } = await supabase
      .from('historia_topicos')
      .select('topicos(id, nombre_es)')
      .eq('id_historia', historiaId)
    if (ht) {
      const t = ht.map((row: any) => row.topicos).filter(Boolean)
      setTopicos(t)
    }
  }

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMensaje('')

    const yaInvitado = colaboradores.find((c) => c.email === email)
    if (yaInvitado) {
      setError('Este email ya fue invitado.')
      setLoading(false)
      return
    }

    const { error: err } = await supabase
      .from('colaboradores')
      .insert({
        id_historia: historiaId,
        email,
        estado: 'pendiente',
      })

    if (err) {
      setError(err.message)
    } else {
      setMensaje(`Invitación enviada a ${email}`)
      setEmail('')
      fetchData()
    }

    setLoading(false)
  }

  const handleCopiarLink = (token: string) => {
    const link = `${window.location.origin}/colaborar/${token}`
    navigator.clipboard.writeText(link)
    setMensaje('¡Link copiado!')
    setTimeout(() => setMensaje(''), 3000)
  }

  const handleCompartirWhatsApp = (token: string, emailColaborador: string) => {
    const link = `${window.location.origin}/colaborar/${token}`
    const texto = `Hola! Te invito a colaborar en la historia "${tituloHistoria}" en Keep Alive. Podés ingresar y compartir tus recuerdos desde este link: ${link}`
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  const handleEliminar = async (id: string) => {
    await supabase.from('colaboradores').delete().eq('id', id)
    fetchData()
  }

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'aceptado': return { background: 'var(--color-badge-verde-bg)', color: 'var(--color-salvia)' }
      case 'rechazado': return { background: 'var(--color-crema-oscuro)', color: 'var(--color-gris)' }
      default: return { background: 'var(--color-crema-oscuro)', color: 'var(--color-gris)' }
    }
  }

  const estadoLabel = (estado: string) => {
    switch (estado) {
      case 'aceptado': return 'Aceptó'
      case 'rechazado': return 'Rechazó'
      default: return 'Pendiente'
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)' }}>
      <header className="page-header">
        <div className="page-header-inner">
          <Image src="/logo.jpg" alt="Keep Alive" width={36} height={36} style={{ objectFit: 'contain', borderRadius: 12, cursor: 'pointer' }} onClick={() => router.push(`/dashboard/historia/${historiaId}`)} />
          <button onClick={() => router.push(`/dashboard/historia/${historiaId}`)} style={{ fontSize: 14, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Historia
          </button>
        </div>
      </header>

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-texto)' }}>Colaboradores</h1>
          <p style={{ fontSize: 14, color: 'var(--color-gris)', marginTop: 4 }}>{tituloHistoria}</p>
        </div>

        {/* Invitar */}
        <div style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invitar colaborador</h2>
          <form onSubmit={handleInvitar} style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              placeholder="Email del colaborador"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ flex: 1, height: 44, padding: '0 14px', fontSize: 14, border: '1.5px solid var(--color-borde)', borderRadius: 12, background: 'var(--color-crema)', color: 'var(--color-texto)', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ height: 44, padding: '0 16px', background: 'var(--color-terracota)', color: 'white', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? '...' : 'Invitar'}
            </button>
          </form>
          {error && <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>}
          {mensaje && <p style={{ fontSize: 13, color: 'var(--color-salvia)' }}>{mensaje}</p>}
        </div>

        {/* Tópicos */}
        {topicos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tópicos de esta historia</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topicos.map((t) => (
                <span key={t.id} style={{ fontSize: 12, padding: '4px 12px', background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 20, color: 'var(--color-texto)' }}>
                  {t.nombre_es}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-gris)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Colaboradores {colaboradores.length > 0 && `(${colaboradores.length})`}
          </h2>

          {colaboradores.length === 0 ? (
            <div style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 32 }}>👥</span>
              <p style={{ fontSize: 14, color: 'var(--color-texto)', fontWeight: 500 }}>Todavía no invitaste a nadie.</p>
              <p style={{ fontSize: 13, color: 'var(--color-gris)' }}>Invitá personas para que aporten a esta historia.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {colaboradores.map((c) => (
                <div key={c.id} style={{ background: 'white', border: '1.5px solid var(--color-borde)', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-crema-oscuro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--color-terracota)', flexShrink: 0 }}>
                    {c.email[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, color: 'var(--color-texto)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-gris)' }}>
                      {new Date(c.fecha_invitacion).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, flexShrink: 0, fontWeight: 500, ...estadoBadge(c.estado) }}>
                    {estadoLabel(c.estado)}
                  </span>
                  <button
                    onClick={() => handleCopiarLink(c.token)}
                    style={{ fontSize: 12, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    Copiar link
                  </button>
                  <button
                    onClick={() => handleCompartirWhatsApp(c.token, c.email)}
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'white', background: '#25D366', border: 'none', padding: '5px 10px', borderRadius: 20, cursor: 'pointer' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleEliminar(c.id)}
                    style={{ fontSize: 20, color: 'var(--color-gris)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}