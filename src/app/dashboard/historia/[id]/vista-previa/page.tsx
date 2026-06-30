'use client'

import { useEffect, useState, useRef, forwardRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HTMLFlipBook = dynamic(
  () => import('react-pageflip').then((m) => m.default as any),
  { ssr: false }
) as any

const BookPage = forwardRef<HTMLDivElement, { children?: React.ReactNode }>(
  ({ children }, ref) => (
    <div ref={ref} style={{ width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none' }}>
      {children}
    </div>
  )
)
BookPage.displayName = 'BookPage'

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

type RespuestaConAutor = {
  contenido: string
  autor: string | null
}

type Topico = {
  id: number
  nombre_es: string
}

type Capitulo = {
  topico: Topico
  preguntas: Pregunta[]
  respuestas: Record<number, RespuestaConAutor[]>
  imagenes: Record<number, string[]>
  narrativa?: string
}

const PAGE_W = 520
const PAGE_H = 368

export default function VistaPrevia() {
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [capitulos, setCapitulos] = useState<Capitulo[]>([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [generandoCapitulo, setGenerandoCapitulo] = useState<number | null>(null)
  const [modoNarrativa, setModoNarrativa] = useState(false)
  const [scale, setScale] = useState(1)
  const bookWrapRef = useRef<HTMLDivElement>(null)
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
        .select('id_pregunta, contenido, nombre_autor')
        .eq('id_historia', historiaId)

      const mapaRespuestas: Record<number, RespuestaConAutor[]> = {}
      respuestasData?.forEach((r: any) => {
        if (!mapaRespuestas[r.id_pregunta]) mapaRespuestas[r.id_pregunta] = []
        mapaRespuestas[r.id_pregunta].push({ contenido: r.contenido, autor: r.nombre_autor || null })
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
            (p) => mapaRespuestas[p.id]?.length > 0
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

  useEffect(() => {
    const update = () => {
      if (!bookWrapRef.current) return
      const available = bookWrapRef.current.clientWidth - 40
      const spreadW = PAGE_W * 2 + 8
      setScale(Math.min(1, available / spreadW))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const generarNarrativaCapitulo = async (cap: Capitulo, h: Historia): Promise<string> => {
    const esAutobiografia = h.tipo === 'autobiografia'
    const protagonista = h.nombre_protagonista || 'el protagonista'

    const preguntasYRespuestas = cap.preguntas
      .map((p) => {
        const pregunta = esAutobiografia ? p.texto_es : p.texto_es_tercera
        const respuestas = cap.respuestas[p.id] || []
        const tieneImagen = !!cap.imagenes[p.id]
        const textoRespuestas = respuestas.length === 1
          ? `Respuesta${respuestas[0].autor ? ` (escrita por ${respuestas[0].autor})` : ''}: ${respuestas[0].contenido}`
          : respuestas.map((r) => `- ${r.autor ? `${r.autor}: ` : ''}${r.contenido}`).join('\n')
        return `Pregunta: ${pregunta}\n${textoRespuestas}${tieneImagen ? '\n[Esta respuesta tiene una foto adjunta]' : ''}`
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
  }

  const cargarImagenBase64 = async (url: string): Promise<string | null> => {
    try {
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

      pdf.setFillColor(20, 20, 20)
      pdf.rect(0, 0, pageW, pageH, 'F')

      try {
        const logoBase64 = await cargarImagenBase64(`${window.location.origin}/logo.png`)
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

      for (let capIdx = 0; capIdx < capitulos.length; capIdx++) {
        const cap = capitulos[capIdx]

        const fotosCapitulo: string[] = []
        for (const p of cap.preguntas) {
          const urls = cap.imagenes[p.id] || []
          for (const url of urls) {
            const base64 = await cargarImagenBase64(url)
            if (base64) fotosCapitulo.push(base64)
          }
        }

        let textoCompleto = ''
        if (modoNarrativa && cap.narrativa) {
          textoCompleto = cap.narrativa
        } else {
          textoCompleto = cap.preguntas
            .flatMap((p) => (cap.respuestas[p.id] || []).map((r) =>
              r.autor ? `[${r.autor}] ${r.contenido}` : r.contenido
            ))
            .filter(Boolean)
            .join('\n\n')
        }

        const tieneFotos = fotosCapitulo.length > 0

        pdf.addPage()
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pageW, pageH, 'F')

        if (tieneFotos) {
          const anchoFotos = mitad
          const anchoTexto = mitad - margen * 2
          const xTexto = mitad + margen
          const gap = 2

          const n = Math.min(fotosCapitulo.length, 6)
          type Rect = { x: number; y: number; w: number; h: number }
          let rects: Rect[] = []

          if (n === 1) {
            rects = [{ x: 0, y: 0, w: anchoFotos, h: pageH }]
          } else if (n === 2) {
            const h1 = pageH * 0.62
            const h2 = pageH - h1 - gap
            rects = [
              { x: 0, y: 0, w: anchoFotos, h: h1 },
              { x: 0, y: h1 + gap, w: anchoFotos, h: h2 },
            ]
          } else if (n === 3) {
            const w1 = anchoFotos * 0.58
            const w2 = anchoFotos - w1 - gap
            const h2 = (pageH - gap) / 2
            rects = [
              { x: 0, y: 0, w: w1, h: pageH },
              { x: w1 + gap, y: 0, w: w2, h: h2 },
              { x: w1 + gap, y: h2 + gap, w: w2, h: pageH - h2 - gap },
            ]
          } else if (n === 4) {
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
              if (drawH > r.h) { drawH = r.h; drawW = r.h * ratio }
              const offsetX = r.x + (r.w - drawW) / 2
              const offsetY = r.y + (r.h - drawH) / 2
              pdf.addImage(fotosCapitulo[i], 'JPEG', offsetX, offsetY, drawW, drawH)
            } catch {}
          }

          const parrafos = textoCompleto.split('\n\n').filter(Boolean)
          const lineHeight = 5.2
          pdf.setFontSize(10)
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

          const nombreAutor = historia?.nombre_protagonista ||
            (historia?.tipo === 'autobiografia' ? historia?.titulo?.split(' ')[0] : '')
          if (nombreAutor) {
            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'italic')
            pdf.setTextColor(100, 100, 100)
            pdf.text(nombreAutor, pageW - margen, pageH - margen, { align: 'right' })
          }
        } else {
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

  const renderPhotoGrid = (urls: string[]) => {
    const n = Math.min(urls.length, 6)
    if (n === 0) {
      return (
        <div style={{ width: '100%', height: '100%', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 56, height: 2, background: 'var(--color-borde)', borderRadius: 2 }} />
        </div>
      )
    }

    type PctRect = { left: number; top: number; width: number; height: number }
    let layout: PctRect[] = []

    if (n === 1) {
      layout = [{ left: 0, top: 0, width: 100, height: 100 }]
    } else if (n === 2) {
      layout = [
        { left: 0, top: 0, width: 100, height: 62 },
        { left: 0, top: 62.4, width: 100, height: 37.6 },
      ]
    } else if (n === 3) {
      layout = [
        { left: 0, top: 0, width: 57.5, height: 100 },
        { left: 58, top: 0, width: 42, height: 49.5 },
        { left: 58, top: 50, width: 42, height: 50 },
      ]
    } else if (n === 4) {
      layout = [
        { left: 0, top: 0, width: 49.5, height: 55 },
        { left: 50, top: 0, width: 50, height: 45 },
        { left: 0, top: 55.5, width: 49.5, height: 44.5 },
        { left: 50, top: 45.5, width: 50, height: 54.5 },
      ]
    } else if (n === 5) {
      layout = [
        { left: 0, top: 0, width: 49.5, height: 50 },
        { left: 50, top: 0, width: 50, height: 30 },
        { left: 50, top: 30.5, width: 50, height: 19.5 },
        { left: 0, top: 50.5, width: 32, height: 49.5 },
        { left: 32.5, top: 50.5, width: 67.5, height: 49.5 },
      ]
    } else {
      layout = [
        { left: 0, top: 0, width: 49.5, height: 38 },
        { left: 50, top: 0, width: 50, height: 34 },
        { left: 0, top: 38.5, width: 49.5, height: 34 },
        { left: 50, top: 34.5, width: 50, height: 38 },
        { left: 0, top: 73, width: 49.5, height: 27 },
        { left: 50, top: 73, width: 50, height: 27 },
      ]
    }

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {layout.slice(0, n).map((rect, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${rect.left}%`, top: `${rect.top}%`,
              width: `${rect.width}%`, height: `${rect.height}%`,
              overflow: 'hidden',
            }}
          >
            <img
              src={urls[i]}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ))}
      </div>
    )
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--color-gris)', fontSize: 14 }}>Cargando...</p>
    </main>
  )

  if (!historia) return null

  const fecha = new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
  const scaledH = Math.round(PAGE_H * scale)
  const scaledW = Math.round((PAGE_W * 2 + 8) * scale)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-crema)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--color-blanco)', borderBottom: '1px solid var(--color-borde)',
        height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image
            src="/logo.png" alt="Keep Alive" width={30} height={30}
            style={{ objectFit: 'contain', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => router.push(`/dashboard/historia/${historiaId}`)}
          />
          <button
            onClick={() => router.push(`/dashboard/historia/${historiaId}`)}
            style={{ fontSize: 13, color: 'var(--color-azul)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Historia
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {capitulos.length > 0 && (
            <div style={{ display: 'flex', background: 'var(--color-crema-oscuro)', borderRadius: 10, padding: 3, gap: 2 }}>
              <button
                onClick={() => setModoNarrativa(false)}
                style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: !modoNarrativa ? 'var(--color-blanco)' : 'transparent',
                  color: !modoNarrativa ? 'var(--color-texto)' : 'var(--color-gris)',
                }}
              >
                Original
              </button>
              <button
                onClick={() => { setModoNarrativa(true); if (!capitulos.some(c => c.narrativa)) handleGenerarTodo() }}
                style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: modoNarrativa ? 'var(--color-blanco)' : 'transparent',
                  color: modoNarrativa ? 'var(--color-texto)' : 'var(--color-gris)',
                }}
              >
                {generando ? 'Generando...' : '✨ Narrativa'}
              </button>
            </div>
          )}

          <button
            onClick={handleExportarPDF}
            disabled={exportando}
            style={{
              height: 34, padding: '0 14px', background: 'var(--color-terracota)', color: 'white',
              fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 9,
              cursor: exportando ? 'default' : 'pointer', opacity: exportando ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {exportando ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".3"/>
                  <path d="M21 12a9 9 0 00-9-9"/>
                </svg>
                Exportando...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Exportar PDF
              </>
            )}
          </button>
        </div>
      </header>

      {/* Book viewer */}
      <div
        ref={bookWrapRef}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 20px 48px', gap: 20,
        }}
      >
        {/* Wrapper sized to actual scaled book dimensions */}
        <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}>
          <div style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: PAGE_W * 2 + 8,
            height: PAGE_H,
            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.18))',
          }}>
            <HTMLFlipBook
              width={PAGE_W}
              height={PAGE_H}
              size="fixed"
              minWidth={PAGE_W}
              maxWidth={PAGE_W}
              minHeight={PAGE_H}
              maxHeight={PAGE_H}
              showCover={true}
              mobileScrollSupport={false}
              flippingTime={650}
              style={{}}
            >
              {/* Portada */}
              <BookPage>
                <div style={{
                  width: '100%', height: '100%', background: '#141414',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '40px 32px',
                  boxSizing: 'border-box', position: 'relative',
                }}>
                  <Image
                    src="/logo.png" alt="Keep Alive" width={52} height={52}
                    style={{ objectFit: 'contain', borderRadius: 12, opacity: 0.75, marginBottom: 28 }}
                  />
                  <h1 style={{ fontSize: 24, fontWeight: 500, color: 'white', textAlign: 'center', lineHeight: 1.35, margin: 0 }}>
                    {historia.titulo}
                  </h1>
                  {historia.descripcion && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', textAlign: 'center', marginTop: 10 }}>
                      {historia.descripcion}
                    </p>
                  )}
                  <div style={{ position: 'absolute', bottom: 28, right: 28, textAlign: 'right' }}>
                    {historia.nombre_protagonista && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', margin: 0 }}>
                        {historia.nombre_protagonista}
                      </p>
                    )}
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>{fecha}</p>
                  </div>
                </div>
              </BookPage>

              {/* Capítulos: 1 página cada uno (fotos izq + texto der) */}
              {capitulos.map((cap, idx) => {
                const allUrls = cap.preguntas.flatMap(p => cap.imagenes[p.id] || [])
                const hasPhotos = allUrls.length > 0
                return (
                  <BookPage key={cap.topico.id}>
                    <div style={{ width: '100%', height: '100%', background: 'var(--color-crema)', display: 'flex' }}>

                      {/* Mitad izquierda: fotos */}
                      {hasPhotos && (
                        <div style={{ width: '50%', height: '100%', position: 'relative', flexShrink: 0 }}>
                          {renderPhotoGrid(allUrls)}
                        </div>
                      )}

                      {/* Mitad derecha (o ancho completo): texto */}
                      <div style={{
                        flex: 1, height: '100%',
                        padding: hasPhotos ? '22px 22px 16px 18px' : '22px 32px 16px',
                        boxSizing: 'border-box',
                        display: 'flex', flexDirection: 'column',
                        borderLeft: hasPhotos ? '1px solid var(--color-borde)' : 'none',
                      }}>
                        {/* Título capítulo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexShrink: 0 }}>
                          <div style={{ width: 3, height: 13, background: 'var(--color-azul)', borderRadius: 2, flexShrink: 0 }} />
                          <h2 style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-texto)', margin: 0 }}>{cap.topico.nombre_es}</h2>
                          {generandoCapitulo === idx && modoNarrativa && (
                            <span style={{ marginLeft: 'auto', fontSize: 8, color: 'var(--color-azul)' }}>Generando...</span>
                          )}
                        </div>

                        {/* Contenido */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          {modoNarrativa ? (
                            cap.narrativa ? (
                              <p style={{
                                fontSize: 8.5, lineHeight: 1.8, color: 'var(--color-texto)',
                                fontFamily: 'Georgia, serif', margin: 0, whiteSpace: 'pre-wrap',
                              }}>
                                {cap.narrativa}
                              </p>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <p style={{ fontSize: 10, color: 'var(--color-gris)' }}>Generando narrativa...</p>
                              </div>
                            )
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {cap.preguntas.map((p) =>
                                (cap.respuestas[p.id] || []).map((resp, ridx) => (
                                  <div key={`${p.id}-${ridx}`} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {resp.autor && (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        <div style={{
                                          width: 13, height: 13, borderRadius: '50%',
                                          background: 'var(--color-terracota)', display: 'flex',
                                          alignItems: 'center', justifyContent: 'center',
                                          fontSize: 6, fontWeight: 700, color: 'white', flexShrink: 0,
                                        }}>
                                          {resp.autor[0].toUpperCase()}
                                        </div>
                                        <span style={{ fontSize: 8, fontWeight: 500, color: 'var(--color-gris)' }}>{resp.autor}</span>
                                      </div>
                                    )}
                                    <p style={{ fontSize: 8.5, lineHeight: 1.75, color: 'var(--color-texto)', margin: 0 }}>
                                      {resp.contenido}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          paddingTop: 8, marginTop: 8,
                          borderTop: '1px solid var(--color-borde)', flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 7, color: 'var(--color-gris)', opacity: 0.5 }}>{idx + 1}</span>
                          <span style={{ fontSize: 8, fontStyle: 'italic', color: 'var(--color-gris)' }}>
                            {historia.nombre_protagonista || ''}
                          </span>
                        </div>
                      </div>

                    </div>
                  </BookPage>
                )
              })}

              {/* Última página: contraportada */}
              <BookPage>
                <div style={{
                  width: '100%', height: '100%', background: '#141414',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Image
                    src="/logo.png" alt="" width={34} height={34}
                    style={{ objectFit: 'contain', borderRadius: 8, opacity: 0.12 }}
                  />
                </div>
              </BookPage>
            </HTMLFlipBook>
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--color-gris)', opacity: 0.4, textAlign: 'center' }}>
          Hacé clic en los bordes o arrastrá para pasar la página
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  )
}
