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
  imagenes: Record<number, string[]>
  narrativa?: string
}

export default function VistaPrevia() {
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [capitulos, setCapitulos] = useState<Capitulo[]>([])
  const [capituloActivo, setCapituloActivo] = useState(-1) // -1 = portada
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [generandoCapitulo, setGenerandoCapitulo] = useState<number | null>(null)
  const [modoNarrativa, setModoNarrativa] = useState(false)
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
        .select('id_pregunta, contenido')
        .eq('id_historia', historiaId)

      const mapaRespuestas: Record<number, string> = {}
      respuestasData?.forEach((r: any) => {
        mapaRespuestas[r.id_pregunta] = r.contenido
      })

      const { data: imagenesData } = await supabase
        .from('respuesta_imagenes')
        .select('id_pregunta, imagen_url, orden')
        .eq('id_historia', historiaId)
        .order('orden')

      const mapaImagenes: Record<number, string[]> = {}
      imagenesData?.forEach((img: any) => {
        if (!mapaImagenes[img.id_pregunta]) mapaImagenes[img.id_pregunta] = []
        mapaImagenes[img.id_pregunta].push(img.imagen_url)
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

  const generarNarrativaCapitulo = async (cap: Capitulo, historia: Historia): Promise<string> => {
    const esAutobiografia = historia.tipo === 'autobiografia'
    const protagonista = historia.nombre_protagonista || 'el protagonista'

   const preguntasYRespuestas = cap.preguntas
  .map((p) => {
    const pregunta = esAutobiografia ? p.texto_es : p.texto_es_tercera
    const respuesta = cap.respuestas[p.id]
    const tieneImagen = !!cap.imagenes[p.id]
    return `Pregunta: ${pregunta}\nRespuesta: ${respuesta}${tieneImagen ? '\n[Esta respuesta tiene una foto adjunta]' : ''}`
  })
  .join('\n\n')

    const prompt = esAutobiografia
      ? `Sos un escritor profesional especializado en autobiografías y libros de vida. Tu tarea es transformar las siguientes respuestas de una persona sobre su vida en una narrativa literaria fluida, cálida y emotiva, escrita en primera persona.

El capítulo se llama: "${cap.topico.nombre_es}"

Respuestas del protagonista:
${preguntasYRespuestas}

Escribí un texto narrativo de 3 a 5 párrafos que:
- Use primera persona (yo, mi, mis)
- Sea fluido y literario, no una lista de respuestas
- Mantenga la voz y los detalles reales de la persona
- Sea cálido, emotivo y personal
- Conecte los diferentes temas de forma natural
- No mencione las preguntas ni que fue una entrevista
- Cuando una respuesta tiene [Esta respuesta tiene una foto adjunta], mencioná la foto de forma natural en la narrativa, con frases como "como muestra aquella foto", "en esa imagen se puede ver", "esa foto captura el momento..." o similar

Escribí solo el texto narrativo, sin títulos ni introducción.`
      : `Sos un escritor profesional especializado en biografías y libros de vida. Tu tarea es transformar las siguientes respuestas sobre la vida de ${protagonista} en una narrativa literaria fluida, cálida y emotiva, escrita en tercera persona.

El capítulo se llama: "${cap.topico.nombre_es}"

Respuestas sobre ${protagonista}:
${preguntasYRespuestas}

Escribí un texto narrativo de 3 a 5 párrafos que:
- Use tercera persona (él/ella, su, sus — adaptá según corresponda)
- Refierete al protagonista por su nombre: ${protagonista}
- Sea fluido y literario, no una lista de respuestas
- Mantenga los detalles reales de la persona
- Sea cálido, emotivo y personal
- Conecte los diferentes temas de forma natural
- No mencione las preguntas ni que fue una entrevista
- Cuando una respuesta tiene [Esta respuesta tiene una foto adjunta], mencioná la foto de forma natural en la narrativa, con frases como "como muestra aquella foto", "en esa imagen se puede ver", "esa foto captura el momento..." o similar

Escribí solo el texto narrativo, sin títulos ni introducción.`

   const response = await fetch('/api/generar-narrativa', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt }),
})

const data = await response.json()
return data.texto || ''
  }

  const handleGenerarTodo = async () => {
    if (!historia) return
    setGenerando(true)
    setModoNarrativa(true)

    const capitulosActualizados = [...capitulos]
    for (let i = 0; i < capitulosActualizados.length; i++) {
      setGenerandoCapitulo(i)
      const cap = capitulosActualizados[i]
      if (!cap.narrativa) {
        const narrativa = await generarNarrativaCapitulo(cap, historia)
        capitulosActualizados[i] = { ...cap, narrativa }
        setCapitulos([...capitulosActualizados])
      }
    }

    setGenerandoCapitulo(null)
    setGenerando(false)
    if (capituloActivo === -1 && capitulosActualizados.length > 0) {
      setCapituloActivo(0)
    }
  }

  const cargarImagenBase64 = async (url: string): Promise<string | null> => {
    try {
      // Usar proxy para evitar problemas de CORS con Supabase Storage
      const proxyUrl = `/api/imagen-proxy?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)
      if (!response.ok) return null
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  const handleExportarPDF = async () => {
    setExportando(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = 297
      const pageH = 210
      const margen = 16
      const mitad = pageW / 2

      // --- PORTADA ---
      pdf.setFillColor(20, 20, 20)
      pdf.rect(0, 0, pageW, pageH, 'F')

      try {
        const logoBase64 = await cargarImagenBase64(`${window.location.origin}/logo.jpg`)
        if (logoBase64) pdf.addImage(logoBase64, 'JPEG', mitad - 18, 28, 36, 36)
      } catch {}

      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(30)
      pdf.setFont('helvetica', 'bold')
      const tituloLines = pdf.splitTextToSize(historia?.titulo || '', pageW - 60)
      pdf.text(tituloLines, mitad, 90, { align: 'center' })

      if (historia?.descripcion) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(160, 160, 160)
        pdf.text(historia.descripcion, mitad, 108, { align: 'center' })
      }

      if (historia?.nombre_protagonista) {
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(120, 120, 120)
        pdf.text(historia.nombre_protagonista, mitad, pageH - 24, { align: 'center' })
      }

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(80, 80, 80)
      pdf.text(
        new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }),
        mitad, pageH - 14, { align: 'center' }
      )

      // --- CAPÍTULOS ---
      for (let capIdx = 0; capIdx < capitulos.length; capIdx++) {
        const cap = capitulos[capIdx]

        // Recopilar todas las fotos del capítulo
        const fotosCapitulo: string[] = []
        for (const p of cap.preguntas) {
          const urls = cap.imagenes[p.id] || []
          for (const url of urls) {
            const base64 = await cargarImagenBase64(url)
            if (base64) fotosCapitulo.push(base64)
          }
        }

        // Texto a usar
        let textoCompleto = ''
        if (modoNarrativa && cap.narrativa) {
          textoCompleto = cap.narrativa
        } else {
          textoCompleto = cap.preguntas
            .map((p) => cap.respuestas[p.id])
            .filter(Boolean)
            .join('\n\n')
        }

        const tieneFotos = fotosCapitulo.length > 0

        pdf.addPage()
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pageW, pageH, 'F')

        // --- LAYOUT: fotos izquierda, texto derecha ---
        if (tieneFotos) {
          const anchoFotos = mitad
          const anchoTexto = mitad - margen * 2
          const xTexto = mitad + margen
          const gap = 2

          // Layouts orgánicos según cantidad de fotos
          const n = Math.min(fotosCapitulo.length, 6)
          type Rect = { x: number; y: number; w: number; h: number }
          let rects: Rect[] = []

          if (n === 1) {
            rects = [{ x: 0, y: 0, w: anchoFotos, h: pageH }]
          } else if (n === 2) {
            // Una grande arriba, una más chica abajo
            const h1 = pageH * 0.62
            const h2 = pageH - h1 - gap
            rects = [
              { x: 0, y: 0, w: anchoFotos, h: h1 },
              { x: 0, y: h1 + gap, w: anchoFotos, h: h2 },
            ]
          } else if (n === 3) {
            // Grande izquierda, dos apiladas derecha
            const w1 = anchoFotos * 0.58
            const w2 = anchoFotos - w1 - gap
            const h2 = (pageH - gap) / 2
            rects = [
              { x: 0, y: 0, w: w1, h: pageH },
              { x: w1 + gap, y: 0, w: w2, h: h2 },
              { x: w1 + gap, y: h2 + gap, w: w2, h: pageH - h2 - gap },
            ]
          } else if (n === 4) {
            // Grilla 2x2 con alturas desiguales
            const w = (anchoFotos - gap) / 2
            const h1 = pageH * 0.55
            const h2 = pageH - h1 - gap
            rects = [
              { x: 0, y: 0, w: w, h: h1 },
              { x: w + gap, y: 0, w: w, h: h2 },
              { x: 0, y: h1 + gap, w: w, h: pageH - h1 - gap },
              { x: w + gap, y: h2 + gap, w: w, h: pageH - h2 - gap },
            ]
          } else if (n === 5) {
            // Grande arriba izquierda, dos arriba derecha, dos abajo
            const w = (anchoFotos - gap) / 2
            const h1 = pageH * 0.5
            const h2 = pageH - h1 - gap
            const w3 = anchoFotos / 3 - gap / 2
            rects = [
              { x: 0, y: 0, w: w, h: h1 },
              { x: w + gap, y: 0, w: w, h: h1 * 0.6 },
              { x: w + gap, y: h1 * 0.6 + gap, w: w, h: h1 - h1 * 0.6 - gap },
              { x: 0, y: h1 + gap, w: w3, h: h2 },
              { x: w3 + gap, y: h1 + gap, w: anchoFotos - w3 - gap, h: h2 },
            ]
          } else {
            // 6 fotos: 3 filas x 2 columnas con alturas variables
            const w = (anchoFotos - gap) / 2
            const h1 = pageH * 0.38
            const h2 = pageH * 0.34
            const h3 = pageH - h1 - h2 - gap * 2
            rects = [
              { x: 0, y: 0, w: w, h: h1 },
              { x: w + gap, y: 0, w: w, h: h2 },
              { x: 0, y: h1 + gap, w: w, h: h2 },
              { x: w + gap, y: h2 + gap, w: w, h: h1 },
              { x: 0, y: h1 + h2 + gap * 2, w: w, h: h3 },
              { x: w + gap, y: h1 + h2 + gap * 2, w: w, h: h3 },
            ]
          }

          for (let i = 0; i < rects.length && i < fotosCapitulo.length; i++) {
            const r = rects[i]
            try {
              const dimensiones = await new Promise<{w: number, h: number}>((resolve) => {
                if (typeof window === 'undefined') return resolve({w: 1, h: 1})
                const imgEl = document.createElement('img')
                imgEl.onload = () => resolve({ w: imgEl.naturalWidth, h: imgEl.naturalHeight })
                imgEl.onerror = () => resolve({ w: 1, h: 1 })
                imgEl.src = fotosCapitulo[i]
              })

              const ratio = dimensiones.w / dimensiones.h
              let drawW = r.w
              let drawH = r.w / ratio

              // Si la altura calculada supera la celda, ajustar por altura
              if (drawH > r.h) {
                drawH = r.h
                drawW = r.h * ratio
              }

              // Centrar dentro de la celda sin recortar
              const offsetX = r.x + (r.w - drawW) / 2
              const offsetY = r.y + (r.h - drawH) / 2

              pdf.addImage(fotosCapitulo[i], 'JPEG', offsetX, offsetY, drawW, drawH)
            } catch {}
          }

          // Texto lado derecho
          const parrafos = textoCompleto.split('\n\n').filter(Boolean)
          const lineHeight = 5.2
          const fontSize = 10
          pdf.setFontSize(fontSize)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(25, 25, 25)

          let y = margen + 4
          const maxY = pageH - margen - 16

          for (const parrafo of parrafos) {
            const lines = pdf.splitTextToSize(parrafo, anchoTexto)
            const h = lines.length * lineHeight
            if (y + h > maxY) break
            pdf.text(lines, xTexto, y)
            y += h + 5
          }

          // Nombre abajo a la derecha
          const nombreAutor = historia?.nombre_protagonista ||
            (historia?.tipo === 'autobiografia' ? historia?.titulo?.split(' ')[0] : '')
          if (nombreAutor) {
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'italic')
            pdf.setTextColor(100, 100, 100)
            pdf.text(nombreAutor, pageW - margen, pageH - margen, { align: 'right' })
          }

        } else {
          // Sin fotos: texto centrado en toda la página
          const anchoTexto = pageW - margen * 4
          const xTexto = margen * 2
          const parrafos = textoCompleto.split('\n\n').filter(Boolean)
          const lineHeight = 6
          pdf.setFontSize(11)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(25, 25, 25)

          let y = margen + 8
          const maxY = pageH - margen - 16

          for (const parrafo of parrafos) {
            const lines = pdf.splitTextToSize(parrafo, anchoTexto)
            const h = lines.length * lineHeight
            if (y + h > maxY) break
            pdf.text(lines, xTexto, y)
            y += h + 6
          }

          const nombreAutor = historia?.nombre_protagonista ||
            (historia?.tipo === 'autobiografia' ? historia?.titulo?.split(' ')[0] : '')
          if (nombreAutor) {
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'italic')
            pdf.setTextColor(100, 100, 100)
            pdf.text(nombreAutor, pageW - margen * 2, pageH - margen, { align: 'right' })
          }
        }

        // Número de página centrado abajo
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(180, 180, 180)
        pdf.text(String(capIdx + 1), mitad, pageH - 5, { align: 'center' })
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
        <div className="flex items-center gap-2">
          {/* Toggle modo */}
          {capitulos.length > 0 && (
            <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setModoNarrativa(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !modoNarrativa
                    ? 'bg-white text-[#141414]'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => {
                  setModoNarrativa(true)
                  if (!capitulos.some(c => c.narrativa)) handleGenerarTodo()
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  modoNarrativa
                    ? 'bg-white text-[#141414]'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {generando ? 'Generando...' : '✨ Narrativa'}
              </button>
            </div>
          )}
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
        </div>
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
                {modoNarrativa && generandoCapitulo === capituloActivo && (
                  <span className="ml-auto text-xs text-[#6B8FC2] flex items-center gap-1.5">
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".3"/>
                      <path d="M21 12a9 9 0 00-9-9"/>
                    </svg>
                    Generando narrativa...
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row">
                {/* Texto */}
                <div className="flex-1 px-8 py-6 flex flex-col gap-6">
                  {modoNarrativa ? (
                    capActual.narrativa ? (
                      <div className="flex flex-col gap-6">
                        {(() => {
                          const parrafos = capActual.narrativa.split('\n\n').filter(Boolean)
                          const fotos = capActual.preguntas.filter((p) => capActual.imagenes[p.id])
                          const resultado: React.ReactNode[] = []

                          parrafos.forEach((parrafo, i) => {
                            resultado.push(
                              <p key={`p-${i}`} className="text-base text-[#1A1A1A] leading-[1.85] tracking-wide">
                                {parrafo}
                              </p>
                            )
                            // Intercalar foto después de cada párrafo si hay fotos disponibles
                            const fotoIndex = Math.floor((i / parrafos.length) * fotos.length)
                            if (fotos[fotoIndex] && i < parrafos.length - 1 && (i + 1) % Math.max(1, Math.floor(parrafos.length / fotos.length)) === 0) {
                              const foto = fotos.shift()
                              if (foto) {
                                const urls = capActual.imagenes[foto.id] || []
                                urls.forEach((url, urlIdx) => {
                                  resultado.push(
                                    <div key={`img-${foto.id}-${urlIdx}`} className="rounded-2xl overflow-hidden">
                                      <img src={url} alt="Foto" className="w-full object-cover max-h-80 rounded-2xl" />
                                    </div>
                                  )
                                })
                              }
                            }
                          })

                          // Fotos restantes al final
                          fotos.forEach((foto) => {
                            const urls = capActual.imagenes[foto.id] || []
                            urls.forEach((url, urlIdx) => {
                              resultado.push(
                                <div key={`img-end-${foto.id}-${urlIdx}`} className="rounded-2xl overflow-hidden">
                                  <img src={url} alt="Foto" className="w-full object-cover max-h-80 rounded-2xl" />
                                </div>
                              )
                            })
                          })

                          return resultado
                        })()}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <svg className="animate-spin text-[#6B8FC2]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".3"/>
                          <path d="M21 12a9 9 0 00-9-9"/>
                        </svg>
                        <p className="text-sm text-[#888888]">Generando narrativa...</p>
                      </div>
                    )
                  ) : (
                    capActual.preguntas.map((p) => (
                      <div key={p.id} className="flex flex-col gap-2">
                        <p className="text-xs text-[#6B8FC2] italic">
                          {historia.tipo === 'autobiografia' ? p.texto_es : p.texto_es_tercera}
                        </p>
                        <p className="text-sm text-[#141414] leading-relaxed">
                          {capActual.respuestas[p.id]}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Fotos — solo en modo original */}
                {!modoNarrativa && capActual.preguntas.some((p) => capActual.imagenes[p.id]?.length > 0) && (
                  <div className="w-full sm:w-64 p-4 grid grid-cols-2 gap-2 content-start border-t sm:border-t-0 sm:border-l border-[#EEEEEE]">
                    {capActual.preguntas
                      .filter((p) => capActual.imagenes[p.id]?.length > 0)
                      .flatMap((p) => capActual.imagenes[p.id])
                      .map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Foto ${i + 1}`}
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