'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Historia = {
  titulo: string
  tipo: string
  nombre_protagonista: string | null
  descripcion: string | null
}

type Pregunta = {
  id: number
  texto_es: string
  texto_es_tercera: string
}

type Respuesta = {
  id_pregunta: number
  contenido: string
  imagen_url: string | null
}

type Topico = {
  id: number
  nombre_es: string
}

type Capitulo = {
  topico: Topico
  preguntas: Pregunta[]
  respuestas: Record<number, string>
  imagenes: Record<number, string>
}

export default function VistaPrevia() {
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [capitulos, setCapitulos] = useState<Capitulo[]>([])
  const [capituloActivo, setCapituloActivo] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string

  useEffect(() => {
    const fetchData = async () => {
      const { data: h } = await supabase
        .from('historias')
        .select('*')
        .eq('id', historiaId)
        .single()

      if (h) setHistoria(h)

      const { data: ht } = await supabase
        .from('historia_topicos')
        .select('topicos(id, nombre_es)')
        .eq('id_historia', historiaId)

      if (!ht) return

      const topicos: Topico[] = ht.map((row: any) => row.topicos).filter(Boolean)

const { data: respuestasData } = await supabase
  .from('respuestas')
  .select('id_pregunta, contenido, imagen_url')
  .eq('id_historia', historiaId)

     const mapaRespuestas: Record<number, string> = {}
const mapaImagenes: Record<number, string> = {}
respuestasData?.forEach((r: Respuesta) => {
  mapaRespuestas[r.id_pregunta] = r.contenido
  if (r.imagen_url) mapaImagenes[r.id_pregunta] = r.imagen_url
})

      const caps: Capitulo[] = await Promise.all(
        topicos.map(async (t) => {
          const { data: preguntas } = await supabase
            .from('preguntas')
            .select('id, texto_es, texto_es_tercera')
            .eq('id_topico', t.id)
            .order('orden')

          const preguntasConRespuesta = (preguntas || []).filter(
            (p) => mapaRespuestas[p.id]
          )

          return {
  topico: t,
  preguntas: preguntasConRespuesta,
  respuestas: mapaRespuestas,
  imagenes: mapaImagenes,
}
        })
      )

      setCapitulos(caps.filter((c) => c.preguntas.length > 0))
      setLoading(false)
    }

    fetchData()
  }, [historiaId])

  if (loading) return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <p className="text-sm text-[#888888]">Cargando...</p>
    </main>
  )

  if (!historia) return null

  const capActual = capitulos[capituloActivo]

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-white border-b border-[#DDDDDD] px-6 py-3 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={60} height={60} className="object-contain" />
        <button
          onClick={() => router.push(`/dashboard/historia/${historiaId}`)}
          className="text-sm text-[#6B8FC2] hover:underline"
        >
          ← Historia
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Portada */}
        <div className="bg-[#141414] rounded-2xl p-8 flex flex-col gap-2">
          <h1 className="text-2xl font-medium text-white">{historia.titulo}</h1>
          {historia.descripcion && (
            <p className="text-sm text-white/60">{historia.descripcion}</p>
          )}
          <p className="text-xs text-white/40 mt-2">
            {historia.tipo === 'autobiografia'
              ? 'Autobiografía'
              : `Biografía de regalo · ${historia.nombre_protagonista}`}
          </p>
        </div>

        {capitulos.length === 0 ? (
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-8 text-center flex flex-col gap-2">
            <p className="text-sm text-[#888888]">Todavía no hay respuestas para mostrar.</p>
            <button
              onClick={() => router.push(`/dashboard/historia/${historiaId}`)}
              className="text-sm text-[#6B8FC2] hover:underline"
            >
              Ir a responder preguntas →
            </button>
          </div>
        ) : (
          <>
            {/* Navegación de capítulos */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {capitulos.map((c, i) => (
                <button
                  key={c.topico.id}
                  onClick={() => setCapituloActivo(i)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${
                    i === capituloActivo
                      ? 'bg-[#141414] text-white'
                      : 'border border-[#DDDDDD] text-[#888888] hover:border-[#6B8FC2]'
                  }`}
                >
                  {c.topico.nombre_es}
                </button>
              ))}
            </div>

            {/* Contenido del capítulo */}
            {capActual && (
              <div className="flex flex-col gap-6">
                <h2 className="text-lg font-medium text-[#141414] border-b border-[#DDDDDD] pb-3">
                  {capActual.topico.nombre_es}
                </h2>
                {capActual.preguntas.map((p) => (
  <div key={p.id} className="flex flex-col gap-2">
    <div className="border-l-2 border-[#6B8FC2] pl-3">
      <p className="text-xs text-[#888888]">
        {historia.tipo === 'autobiografia'
          ? p.texto_es
          : p.texto_es_tercera}
      </p>
    </div>
    <p className="text-sm text-[#141414] leading-relaxed pl-3">
      {capActual.respuestas[p.id]}
    </p>
    {capActual.imagenes[p.id] && (
      <img
        src={capActual.imagenes[p.id]}
        alt="Foto"
        className="w-full rounded-2xl object-cover max-h-72 mt-2"
      />
    )}
  </div>
))}
              </div>
            )}

            {/* Navegación entre capítulos */}
            <div className="flex justify-between pt-4 border-t border-[#DDDDDD]">
              <button
                onClick={() => setCapituloActivo((prev) => Math.max(0, prev - 1))}
                disabled={capituloActivo === 0}
                className="text-sm text-[#6B8FC2] hover:underline disabled:opacity-30 disabled:no-underline"
              >
                ← Anterior
              </button>
              <span className="text-xs text-[#888888]">
                {capituloActivo + 1} / {capitulos.length}
              </span>
              <button
                onClick={() => setCapituloActivo((prev) => Math.min(capitulos.length - 1, prev + 1))}
                disabled={capituloActivo === capitulos.length - 1}
                className="text-sm text-[#6B8FC2] hover:underline disabled:opacity-30 disabled:no-underline"
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}