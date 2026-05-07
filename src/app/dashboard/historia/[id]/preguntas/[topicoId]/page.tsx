'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Pregunta = {
  id: number
  texto_es: string
  texto_es_tercera: string
  orden: number
}

type Historia = {
  tipo: string
}

export default function Preguntas() {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [topicoNombre, setTopicoNombre] = useState('')
  const [indice, setIndice] = useState(0)
  const [respuesta, setRespuesta] = useState('')
  const [respuestasGuardadas, setRespuestasGuardadas] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string
  const topicoId = params.topicoId as string

  useEffect(() => {
    const fetchData = async () => {
      const { data: h } = await supabase
        .from('historias')
        .select('tipo')
        .eq('id', historiaId)
        .single()
      if (h) setHistoria(h)

      const { data: t } = await supabase
        .from('topicos')
        .select('nombre_es')
        .eq('id', topicoId)
        .single()
      if (t) setTopicoNombre(t.nombre_es)

      const { data: p } = await supabase
        .from('preguntas')
        .select('*')
        .eq('id_topico', topicoId)
        .order('orden')
      if (p) setPreguntas(p)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: r } = await supabase
          .from('respuestas')
          .select('id_pregunta, contenido')
          .eq('id_historia', historiaId)
          .eq('id_usuario', user.id)
        if (r) {
          const mapa: Record<number, string> = {}
          r.forEach((resp) => { mapa[resp.id_pregunta] = resp.contenido })
          setRespuestasGuardadas(mapa)
        }
      }
    }
    fetchData()
  }, [historiaId, topicoId])

  useEffect(() => {
    if (preguntas[indice]) {
      setRespuesta(respuestasGuardadas[preguntas[indice].id] || '')
      setGuardado(false)
    }
  }, [indice, preguntas, respuestasGuardadas])

  const preguntaActual = preguntas[indice]
  const textoPregunta = historia?.tipo === 'autobiografia'
    ? preguntaActual?.texto_es
    : preguntaActual?.texto_es_tercera

  const handleGuardar = async () => {
    if (!preguntaActual) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const existe = respuestasGuardadas[preguntaActual.id]

    if (existe) {
      await supabase
        .from('respuestas')
        .update({ contenido: respuesta })
        .eq('id_historia', historiaId)
        .eq('id_pregunta', preguntaActual.id)
        .eq('id_usuario', user.id)
    } else {
      await supabase
        .from('respuestas')
        .insert({
          id_historia: historiaId,
          id_pregunta: preguntaActual.id,
          id_usuario: user.id,
          contenido: respuesta,
        })
    }

    setRespuestasGuardadas((prev) => ({ ...prev, [preguntaActual.id]: respuesta }))
    setGuardado(true)
    setLoading(false)

    if (indice < preguntas.length - 1) {
      setTimeout(() => {
        setIndice((prev) => prev + 1)
      }, 400)
    } else {
      setTimeout(() => {
        router.push(`/dashboard/historia/${historiaId}`)
      }, 600)
    }
  }

  const handleSaltar = () => {
    if (indice < preguntas.length - 1) {
      setIndice((prev) => prev + 1)
    } else {
      router.push(`/dashboard/historia/${historiaId}`)
    }
  }

  if (preguntas.length === 0) return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <p className="text-sm text-[#888888]">Cargando preguntas...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <button onClick={() => router.push(`/dashboard/historia/${historiaId}`)} className="text-sm text-[#6B8FC2] hover:underline">
          ← Historia
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Progreso */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-[#888888]">
            <span>{topicoNombre}</span>
            <span>{indice + 1} / {preguntas.length}</span>
          </div>
          <div className="h-1 bg-[#EEEEEE] rounded-full">
            <div
              className="h-1 bg-[#6B8FC2] rounded-full transition-all"
              style={{ width: `${((indice + 1) / preguntas.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Tip */}
        <div className="border-l-2 border-[#6B8FC2] pl-3 bg-[#E8EFF8] py-2 pr-3 rounded-r-md">
          <p className="text-xs text-[#6B8FC2]">
            Consejo: describí quiénes estaban, cuándo y dónde ocurrió.
          </p>
        </div>

        {/* Pregunta */}
        <div className="bg-[#F2F2F2] border border-[#141414] rounded-xl p-4">
          <p className="text-sm text-[#141414] leading-relaxed">{textoPregunta}</p>
        </div>

        {/* Respuesta */}
        <div className="flex flex-col gap-2">
          <textarea
            value={respuesta}
            onChange={(e) => { setRespuesta(e.target.value); setGuardado(false) }}
            placeholder="Escribí tu respuesta acá..."
            rows={5}
            className="w-full px-3 py-3 text-sm border border-[#DDDDDD] rounded-xl bg-white text-[#141414] placeholder-[#AAAAAA] focus:outline-none focus:border-[#6B8FC2] resize-none"
          />
          {guardado && (
            <p className="text-xs text-[#6B8FC2]">✓ Guardado</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={handleSaltar}
            className="flex-1 h-10 border border-[#DDDDDD] rounded-md text-sm text-[#888888] bg-white hover:bg-[#F2F2F2] transition-colors"
          >
            Saltar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || !respuesta.trim()}
            className="flex-2 flex-[2] h-10 bg-[#141414] text-white text-sm font-medium rounded-md hover:bg-[#333333] transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : indice < preguntas.length - 1 ? 'Guardar y seguir →' : 'Finalizar tópico →'}
          </button>
        </div>
      </div>
    </main>
  )
}