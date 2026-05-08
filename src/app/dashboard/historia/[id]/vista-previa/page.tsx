'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import Image from 'next/image'

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
  const [capituloActivo, setCapituloActivo] = useState(-1) // -1 = portada
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const libroRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string

  useEffect(() => {
    const fetchData = async () => {
      const { data: h } = await supabase
        .from('historias').select('*').eq('id', historiaId).single()
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

  const handleExportarPDF = async () => {
    setExportando(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = 297
      const pageHeight = 210

      // Portada
      pdf.setFillColor(20, 20, 20)
      pdf.rect(0, 0, pageWidth, pageHeight, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(28)
      pdf.setFont('helvetica', 'bold')
      pdf.text(historia?.titulo || '', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' })
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(180, 180, 180)
      if (historia?.descripcion) {
        pdf.text(historia.descripcion, pageWidth / 2, pageHeight / 2, { align: 'center' })
      }
      pdf.setFontSize(11)
      pdf.text(new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth / 2, pageHeight - 20, { align: 'center' })

      // Capítulos
      for (const cap of capitulos) {
        pdf.addPage()

        // Título del capítulo
        pdf.setFillColor(245, 245, 245)
        pdf.rect(0, 0, pageWidth, pageHeight, 'F')
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(20, 20, 20)
        pdf.text(cap.topico.nombre_es, 20, 20)

        // Línea decorativa
        pdf.setDrawColor(107, 143, 194)
        pdf.setLineWidth(0.5)
        pdf.line(20, 25, pageWidth - 20, 25)

        let y = 35
        const margenIzq = 20
        const anchoTexto = historia?.tipo === 'autobiografia' ? 160 : 160
        const anchoFoto = 100
        const margenFoto = margenIzq + anchoTexto + 10

        for (const p of cap.preguntas) {
          const texto = historia?.tipo === 'autobiografia' ? p.texto_es : p.texto_es_tercera
          const respuesta = cap.respuestas[p.id]
          const imagen = cap.imagenes[p.id]

          // Pregunta
          pdf.setFontSize(8)
          pdf.setFont('helvetica', 'italic')
          pdf.setTextColor(107, 143, 194)
          const preguntaLines = pdf.splitTextToSize(texto, anchoTexto - margenIzq)
          pdf.text(preguntaLines, margenIzq, y)
          y += preguntaLines.length * 4 + 2

          // Respuesta
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(20, 20, 20)
          const respuestaLines = pdf.splitTextToSize(respuesta, anchoTexto - margenIzq)
          pdf.text(respuestaLines, margenIzq, y)
          y += respuestaLines.length * 5 + 8

          if (y > pageHeight - 20) break
        }

        // Imágenes a la derecha
        const imagenesCapitulo = cap.preguntas
          .filter((p) => cap.imagenes[p.id])
          .map((p) => cap.imagenes[p.id])

        if (imagenesCapitulo.length > 0) {
          let iy = 35
          const colWidth = (anchoFoto - 5) / 2
          for (let i = 0; i < Math.min(imagenesCapitulo.length, 4); i++) {
            const col = i % 2
            const row = Math.floor(i / 2)
            const ix = margenFoto + col * (colWidth + 5)
            const imgY = iy + row * 85
            try {
              pdf.addImage(imagenesCapitulo[i], 'JPEG', ix, imgY, colWidth, 78)
            } catch (e) {
              // Si falla cargar la imagen, continuar
            }
          }
        }
      }

      pdf.save(`${historia?.titulo || 'historia'}.pdf`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
    }
    setExportando(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-[#141414] flex items-center justify-center">
      <p className="text-sm text-white/50">Cargando...</p>
    </main>
  )

  if (!historia) return null

  const fecha = new Date().toLocaleDateString('es-UY', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const capActual = capitulos[capituloActivo]

  return (
    <main className="min-h-screen bg-[#1A1A1A] flex flex-col">

      {/* Header oscuro */}
      <header className="sticky top-0 z-10 bg-[#141414] border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Keep Alive"
            width={36}
            height={36}
            className="object-contain rounded-lg cursor-pointer"
            onClick={() => router.push(`/dashboard/historia/${historiaId}`)}
          />
          <button
            onClick={() => router.push(`/dashboard/historia/${historiaId}`)}
            className="text-sm text-white/50 hover:text-white"
          >
            ← Historia
          </button>
        </div>
        <button
          onClick={handleExportarPDF}
          disabled={exportando}
          className="h-9 px-4 bg-white text-[#141414] text-sm font-medium rounded-xl hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
        >
          {exportando ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".3"/>
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
              Exportando...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Exportar PDF
            </>
          )}
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center py-8 px-4 gap-6">

        {/* Navegación de páginas */}
        <div className="flex gap-2 overflow-x-auto pb-1 max-w-2xl w-full">
          <button
            onClick={() => setCapituloActivo(-1)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${
              capituloActivo === -1
                ? 'bg-white text-[#141414] font-medium'
                : 'border border-white/20 text-white/50 hover:text-white'
            }`}
          >
            Portada
          </button>
          {capitulos.map((c, i) => (
            <button
              key={c.topico.id}
              onClick={() => setCapituloActivo(i)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${
                i === capituloActivo
                  ? 'bg-white text-[#141414] font-medium'
                  : 'border border-white/20 text-white/50 hover:text-white'
              }`}
            >
              {c.topico.nombre_es}
            </button>
          ))}
        </div>

        {/* Libro */}
        <div ref={libroRef} className="w-full max-w-4xl">

          {/* Portada */}
          {capituloActivo === -1 && (
            <div className="bg-[#141414] rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-6 p-10 border border-white/10 relative">
              <Image
                src="/logo.jpg"
                alt="Keep Alive"
                width={80}
                height={80}
                className="object-contain rounded-xl opacity-80"
              />
              <div className="text-center flex flex-col gap-3">
                <h1 className="text-3xl sm:text-4xl font-medium text-white">{historia.titulo}</h1>
                {historia.descripcion && (
                  <p className="text-base text-white/50">{historia.descripcion}</p>
                )}
              </div>
              <div className="absolute bottom-8 right-10 text-right">
                {historia.nombre_protagonista && (
                  <p className="text-sm text-white/60">{historia.nombre_protagonista}</p>
                )}
                <p className="text-sm text-white/40">{fecha}</p>
              </div>
            </div>
          )}

          {/* Capítulo */}
          {capituloActivo >= 0 && capActual && (
            <div className="bg-white rounded-2xl overflow-hidden border border-white/10">
              {/* Título del capítulo */}
              <div className="px-8 py-5 border-b border-[#EEEEEE] flex items-center gap-3">
                <div className="w-1 h-6 bg-[#6B8FC2] rounded-full" />
                <h2 className="text-lg font-medium text-[#141414]">{capActual.topico.nombre_es}</h2>
              </div>

              <div className="flex flex-col sm:flex-row">
                {/* Texto */}
                <div className="flex-1 px-8 py-6 flex flex-col gap-6">
                  {capActual.preguntas.map((p) => (
                    <div key={p.id} className="flex flex-col gap-2">
                      <p className="text-xs text-[#6B8FC2] italic">
                        {historia.tipo === 'autobiografia' ? p.texto_es : p.texto_es_tercera}
                      </p>
                      <p className="text-sm text-[#141414] leading-relaxed">
                        {capActual.respuestas[p.id]}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Fotos */}
                {capActual.preguntas.some((p) => capActual.imagenes[p.id]) && (
                  <div className="w-full sm:w-64 p-4 grid grid-cols-2 gap-2 content-start border-t sm:border-t-0 sm:border-l border-[#EEEEEE]">
                    {capActual.preguntas
                      .filter((p) => capActual.imagenes[p.id])
                      .map((p) => (
                        <img
                          key={p.id}
                          src={capActual.imagenes[p.id]}
                          alt="Foto"
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {capitulos.length === 0 && capituloActivo >= 0 && (
            <div className="bg-white/10 rounded-2xl p-10 text-center">
              <p className="text-white/50 text-sm">Todavía no hay respuestas para mostrar.</p>
            </div>
          )}
        </div>

        {/* Navegación entre páginas */}
        {capitulos.length > 0 && (
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCapituloActivo((prev) => Math.max(-1, prev - 1))}
              disabled={capituloActivo === -1}
              className="text-sm text-white/50 hover:text-white disabled:opacity-20"
            >
              ← Anterior
            </button>
            <span className="text-xs text-white/30">
              {capituloActivo === -1 ? 'Portada' : `${capituloActivo + 1} / ${capitulos.length}`}
            </span>
            <button
              onClick={() => setCapituloActivo((prev) => Math.min(capitulos.length - 1, prev + 1))}
              disabled={capituloActivo === capitulos.length - 1}
              className="text-sm text-white/50 hover:text-white disabled:opacity-20"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}