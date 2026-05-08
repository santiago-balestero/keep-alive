'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'

type Colaborador = {
  id: string
  email: string
  estado: 'pendiente' | 'aceptado' | 'rechazado'
  fecha_invitacion: string
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

  useEffect(() => { fetchData() }, [historiaId])

  const fetchData = async () => {
    const { data: h } = await supabase
      .from('historias').select('titulo').eq('id', historiaId).single()
    if (h) setTituloHistoria(h.titulo)

    const { data: c } = await supabase
      .from('colaboradores').select('*').eq('id_historia', historiaId)
      .order('fecha_invitacion', { ascending: false })
    if (c) setColaboradores(c)

    const { data: ht } = await supabase
      .from('historia_topicos').select('topicos(id, nombre_es)').eq('id_historia', historiaId)
    if (ht) setTopicos(ht.map((row: any) => row.topicos).filter(Boolean))
  }

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMensaje('')

    if (colaboradores.find((c) => c.email === email)) {
      setError('Este email ya fue invitado.')
      setLoading(false)
      return
    }

    const { error: err } = await supabase
      .from('colaboradores').insert({ id_historia: historiaId, email, estado: 'pendiente' })

    if (err) {
      setError(err.message)
    } else {
      setMensaje(`Invitación enviada a ${email}`)
      setEmail('')
      fetchData()
    }
    setLoading(false)
  }

  const handleEliminar = async (id: string) => {
    await supabase.from('colaboradores').delete().eq('id', id)
    fetchData()
  }

  const estadoConfig = {
    aceptado: { label: 'Aceptó', class: 'bg-[#E8EFF8] text-[#6B8FC2]' },
    rechazado: { label: 'Rechazó', class: 'bg-[#F5F5F5] text-[#AAAAAA]' },
    pendiente: { label: 'Pendiente', class: 'bg-[#F2F2F2] text-[#888888]' },
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

        <div>
          <h1 className="text-2xl font-medium text-[#141414]">Colaboradores</h1>
          <p className="text-sm text-[#888888] mt-1">{tituloHistoria}</p>
        </div>

        {/* Invitar */}
        <div className="bg-white border border-[#EEEEEE] rounded-2xl p-5 flex flex-col gap-3">
          <h2 className="text-xs font-medium text-[#888888] uppercase tracking-widest">Invitar colaborador</h2>
          <form onSubmit={handleInvitar} className="flex gap-2">
            <input
              type="email"
              placeholder="Email del colaborador"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 h-11 px-4 text-sm border border-[#EEEEEE] rounded-xl bg-[#F8F8F8] text-[#141414] placeholder-[#BBBBBB] focus:outline-none focus:border-[#6B8FC2] focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-4 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#333333] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? '...' : 'Invitar'}
            </button>
          </form>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {mensaje && <p className="text-xs text-[#6B8FC2]">✓ {mensaje}</p>}
        </div>

        {/* Tópicos */}
        {topicos.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-medium text-[#888888] uppercase tracking-widest">Tópicos de esta historia</h2>
            <div className="flex flex-wrap gap-2">
              {topicos.map((t) => (
                <span key={t.id} className="text-xs px-3 py-1.5 bg-white border border-[#EEEEEE] rounded-full text-[#4A4A4A]">
                  {t.nombre_es}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-medium text-[#888888] uppercase tracking-widest">
            Colaboradores {colaboradores.length > 0 && `(${colaboradores.length})`}
          </h2>

          {colaboradores.length === 0 ? (
            <div className="bg-white border border-[#EEEEEE] rounded-2xl p-8 text-center flex flex-col gap-2">
              <div className="text-3xl">👥</div>
              <p className="text-sm text-[#888888]">Todavía no invitaste a nadie.</p>
              <p className="text-xs text-[#AAAAAA]">Invitá personas para que aporten a esta historia.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {colaboradores.map((c) => (
                <div key={c.id} className="bg-white border border-[#EEEEEE] rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#F2F2F2] flex items-center justify-center text-sm font-medium text-[#4A4A4A] flex-shrink-0">
                    {c.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#141414] truncate">{c.email}</p>
                    <p className="text-xs text-[#AAAAAA]">
                      {new Date(c.fecha_invitacion).toLocaleDateString('es-UY', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full flex-shrink-0 font-medium ${estadoConfig[c.estado].class}`}>
                    {estadoConfig[c.estado].label}
                  </span>
                  <button
                    onClick={() => handleEliminar(c.id)}
                    className="text-[#CCCCCC] hover:text-red-400 flex-shrink-0 text-xl leading-none"
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