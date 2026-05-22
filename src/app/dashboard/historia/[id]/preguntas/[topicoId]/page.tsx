'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'

type Pregunta = {
  id: number | string
  texto_es: string
  texto_es_tercera: string
  orden: number
  personalizada?: boolean
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
  const [imagenesGuardadas, setImagenesGuardadas] = useState<Record<number, string[]>>({})
  const [imagenesPreview, setImagenesPreview] = useState<{ url: string; file?: File }[]>([])
  const [loading, setLoading] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [escuchando, setEscuchando] = useState(false)
  const [soportaVoz, setSoportaVoz] = useState(true)
  const [mostrarAgregarPregunta, setMostrarAgregarPregunta] = useState(false)
  const [nuevaPregunta, setNuevaPregunta] = useState('')
  const [guardandoPregunta, setGuardandoPregunta] = useState(false)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string
  const topicoId = params.topicoId as string

  useEffect(() => {
    const fetchData = async () => {
      const { data: h } = await supabase.from('historias').select('tipo').eq('id', historiaId).single()
      if (h) setHistoria(h)

      const { data: t } = await supabase.from('topicos').select('nombre_es').eq('id', topicoId).single()
      if (t) setTopicoNombre(t.nombre_es)

      const { data: p } = await supabase.from('preguntas').select('*').eq('id_topico', topicoId).order('orden')

      // Cargar preguntas personalizadas de esta historia y tópico
      const { data: pp } = await supabase
        .from('preguntas_personalizadas')
        .select('*')
        .eq('id_historia', historiaId)
        .eq('id_topico', topicoId)
        .order('orden')

      const personalizadas = (pp || []).map((p: any) => ({
        id: p.id,
        texto_es: p.texto,
        texto_es_tercera: p.texto,
        orden: p.orden,
        personalizada: true,
      }))

      if (p) setPreguntas([...p, ...personalizadas])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: r } = await supabase
          .from('respuestas')
          .select('id_pregunta, contenido')
          .eq('id_historia', historiaId)
          .eq('id_usuario', user.id)
        if (r) {
          const mapaTexto: Record<number, string> = {}
          r.forEach((resp) => { mapaTexto[resp.id_pregunta] = resp.contenido })
          setRespuestasGuardadas(mapaTexto)
        }

        const { data: imgs } = await supabase
          .from('respuesta_imagenes')
          .select('id_pregunta, imagen_url, orden')
          .eq('id_historia', historiaId)
          .eq('id_usuario', user.id)
          .order('orden')
        if (imgs) {
          const mapaImagenes: Record<number, string[]> = {}
          imgs.forEach((img) => {
            if (!mapaImagenes[img.id_pregunta]) mapaImagenes[img.id_pregunta] = []
            mapaImagenes[img.id_pregunta].push(img.imagen_url)
          })
          setImagenesGuardadas(mapaImagenes)
        }
      }
    }
    fetchData()
  }, [historiaId, topicoId])

  useEffect(() => {
    if (preguntas[indice]) {
      setRespuesta(respuestasGuardadas[preguntas[indice].id] || '')
      const imgs = imagenesGuardadas[preguntas[indice].id] || []
      setImagenesPreview(imgs.map((url) => ({ url })))
      setGuardado(false)
    }
  }, [indice, preguntas, respuestasGuardadas, imagenesGuardadas])

  const iniciarEscucha = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setSoportaVoz(false); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'es-AR'
    recognition.continuous = true
    recognition.interimResults = true
    let textoBase = respuesta
    recognition.onresult = (event: any) => {
      let textoFinal = ''
      let textoInterim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) textoFinal += transcript + ' '
        else textoInterim += transcript
      }
      setRespuesta(textoBase + textoFinal + textoInterim)
      if (textoFinal) textoBase = textoBase + textoFinal
      setGuardado(false)
    }
    recognition.onerror = () => setEscuchando(false)
    recognition.onend = () => setEscuchando(false)
    recognition.start()
    recognitionRef.current = recognition
    setEscuchando(true)
  }

  const detenerEscucha = () => {
    recognitionRef.current?.stop()
    setEscuchando(false)
  }

  const handleImagenesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const nuevas = files.map((file) => ({ url: URL.createObjectURL(file), file }))
    setImagenesPreview((prev) => [...prev, ...nuevas])
    setGuardado(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEliminarImagen = (index: number) => {
    setImagenesPreview((prev) => prev.filter((_, i) => i !== index))
    setGuardado(false)
  }

  const handleGuardar = async () => {
    const preguntaActual = preguntas[indice]
    if (!preguntaActual) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const existe = respuestasGuardadas[preguntaActual.id] !== undefined
    if (existe) {
      await supabase.from('respuestas')
        .update({ contenido: respuesta })
        .eq('id_historia', historiaId)
        .eq('id_pregunta', preguntaActual.id)
        .eq('id_usuario', user.id)
    } else {
      await supabase.from('respuestas').insert({
        id_historia: historiaId,
        id_pregunta: preguntaActual.id,
        id_usuario: user.id,
        contenido: respuesta,
      })
    }

    const fotosNuevas = imagenesPreview.filter((img) => img.file)
    if (fotosNuevas.length > 0 || imagenesPreview.length === 0) {
      setSubiendoImagen(true)

      await supabase.from('respuesta_imagenes')
        .delete()
        .eq('id_historia', historiaId)
        .eq('id_pregunta', preguntaActual.id)
        .eq('id_usuario', user.id)

      const urlsSubidas: string[] = []
      for (let i = 0; i < imagenesPreview.length; i++) {
        const img = imagenesPreview[i]
        if (img.file) {
          const ext = img.file.name.split('.').pop()
          const path = `${historiaId}/${preguntaActual.id}_${i}_${Date.now()}.${ext}`
          const { error } = await supabase.storage.from('images').upload(path, img.file, { upsert: true })
          if (!error) {
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
            urlsSubidas.push(urlData.publicUrl)
          }
        } else {
          urlsSubidas.push(img.url)
        }
      }

      if (urlsSubidas.length > 0) {
        await supabase.from('respuesta_imagenes').insert(
          urlsSubidas.map((url, orden) => ({
            id_historia: historiaId,
            id_pregunta: preguntaActual.id,
            id_usuario: user.id,
            imagen_url: url,
            orden,
          }))
        )
      }

      setImagenesGuardadas((prev) => ({ ...prev, [preguntaActual.id]: urlsSubidas }))
      setSubiendoImagen(false)
    }

    setRespuestasGuardadas((prev) => ({ ...prev, [preguntaActual.id]: respuesta }))
    setGuardado(true)
    setLoading(false)

    if (indice < preguntas.length - 1) {
      setTimeout(() => setIndice((prev) => prev + 1), 400)
    } else {
      setTimeout(() => router.push(`/dashboard/historia/${historiaId}`), 600)
    }
  }

  const handleAgregarPregunta = async () => {
    if (!nuevaPregunta.trim()) return
    setGuardandoPregunta(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('preguntas_personalizadas')
      .insert({
        id_historia: historiaId,
        id_topico: topicoId,
        texto: nuevaPregunta.trim(),
        id_autor: user.id,
        orden: preguntas.length,
      })
      .select()
      .single()

    if (!error && data) {
      const nuevaP: Pregunta = {
        id: data.id,
        texto_es: data.texto,
        texto_es_tercera: data.texto,
        orden: data.orden,
        personalizada: true,
      }
      setPreguntas((prev) => [...prev, nuevaP])
      setNuevaPregunta('')
      setMostrarAgregarPregunta(false)
      // Ir directo a responder la nueva pregunta
      setIndice(preguntas.length)
    }
    setGuardandoPregunta(false)
  }

  const handleSaltar = () => {
    if (indice < preguntas.length - 1) setIndice((prev) => prev + 1)
    else router.push(`/dashboard/historia/${historiaId}`)
  }

  const preguntaActual = preguntas[indice]
  const textoPregunta = historia?.tipo === 'autobiografia'
    ? preguntaActual?.texto_es
    : preguntaActual?.texto_es_tercera

  if (preguntas.length === 0) return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <p className="text-sm text-[#888888]">Cargando preguntas...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Progreso */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-[#888888]">
            <span className="font-medium">{topicoNombre}</span>
            <span>{indice + 1} / {preguntas.length}</span>
          </div>
          <div className="h-1.5 bg-[#EEEEEE] rounded-full overflow-hidden">
            <div className="h-full bg-[#6B8FC2] rounded-full transition-all duration-500"
              style={{ width: `${((indice + 1) / preguntas.length) * 100}%` }} />
          </div>
        </div>

        {/* Tip */}
        <div className="bg-[#E8EFF8] rounded-2xl px-4 py-3 border-l-4 border-[#6B8FC2]">
          <p className="text-xs text-[#6B8FC2] leading-relaxed">
            Consejo: describí quiénes estaban, cuándo y dónde ocurrió. Cuanto más detalle, mejor.
          </p>
        </div>

        {/* Pregunta */}
        <div className={`rounded-2xl p-5 border-2 ${preguntaActual?.personalizada ? 'border-[#6B8FC2] bg-[#EEF3FA]' : 'bg-white border-[#141414]'}`}>
          {preguntaActual?.personalizada && (
            <p className="text-xs text-[#6B8FC2] font-medium mb-2">Pregunta personalizada</p>
          )}
          <p className="text-sm text-[#141414] leading-relaxed">{textoPregunta}</p>
        </div>

        {/* Respuesta */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <textarea
              value={respuesta}
              onChange={(e) => { setRespuesta(e.target.value); setGuardado(false) }}
              placeholder="Escribí tu respuesta acá o usá el micrófono..."
              rows={5}
              className="w-full px-4 py-3 text-sm border-2 border-[#EEEEEE] rounded-2xl bg-white text-[#141414] placeholder-[#BBBBBB] focus:outline-none focus:border-[#6B8FC2] resize-none leading-relaxed pr-14"
            />
            <button
              type="button"
              onClick={escuchando ? detenerEscucha : iniciarEscucha}
              className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                escuchando ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-[#F0F0F0] hover:bg-[#E0E0E0]'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={escuchando ? 'white' : '#888888'} strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
              </svg>
            </button>
          </div>
          {escuchando && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Escuchando... hablá ahora
            </p>
          )}
          {!soportaVoz && <p className="text-xs text-[#AAAAAA]">Tu navegador no soporta reconocimiento de voz.</p>}
          {guardado && (
            <p className="text-xs text-[#6B8FC2] flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#6B8FC2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Guardado
            </p>
          )}
        </div>

        {/* Fotos múltiples */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-widest">Fotos (opcional)</p>
            {imagenesPreview.length > 0 && (
              <p className="text-xs text-[#6B8FC2]">{imagenesPreview.length} foto{imagenesPreview.length !== 1 ? 's' : ''}</p>
            )}
          </div>

          {imagenesPreview.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imagenesPreview.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#EEEEEE]">
                  <img src={img.url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleEliminarImagen(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-sm leading-none"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-[#DDDDDD] rounded-xl flex flex-col items-center justify-center gap-1 hover:border-[#6B8FC2] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="1.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span className="text-xs text-[#AAAAAA]">Agregar</span>
              </button>
            </div>
          )}

          {imagenesPreview.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-[#DDDDDD] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#6B8FC2] hover:bg-[#F8FAFF] transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span className="text-xs text-[#AAAAAA]">Subir fotos</span>
            </button>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImagenesChange} className="hidden" />
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <button onClick={handleSaltar} className="flex-1 h-12 border-2 border-[#EEEEEE] rounded-2xl text-sm text-[#888888] bg-white hover:bg-[#F8F8F8] active:scale-[0.98]">
            Saltar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || (!respuesta.trim() && imagenesPreview.length === 0)}
            className="flex-[2] h-12 bg-[#141414] text-white text-sm font-medium rounded-2xl hover:bg-[#333333] active:scale-[0.98] disabled:opacity-40"
          >
            {subiendoImagen ? 'Subiendo fotos...' : loading ? 'Guardando...' : indice < preguntas.length - 1 ? 'Guardar y seguir →' : 'Finalizar →'}
          </button>
        </div>

        {/* Agregar pregunta personalizada */}
        {!mostrarAgregarPregunta ? (
          <button
            onClick={() => setMostrarAgregarPregunta(true)}
            className="text-xs text-[#6B8FC2] hover:underline text-center"
          >
            + Agregar mi propia pregunta
          </button>
        ) : (
          <div className="bg-white border border-[#EEEEEE] rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-widest">Nueva pregunta</p>
            <textarea
              value={nuevaPregunta}
              onChange={(e) => setNuevaPregunta(e.target.value)}
              placeholder="Ej: ¿Cómo era la relación con tu hermano mayor?"
              rows={3}
              className="w-full px-4 py-3 text-sm border-2 border-[#EEEEEE] rounded-xl bg-[#F8F8F8] text-[#141414] placeholder-[#BBBBBB] focus:outline-none focus:border-[#6B8FC2] resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setMostrarAgregarPregunta(false); setNuevaPregunta('') }}
                className="flex-1 h-10 border-2 border-[#EEEEEE] rounded-xl text-sm text-[#888888] bg-white hover:bg-[#F8F8F8]"
              >
                Cancelar
              </button>
              <button
                onClick={handleAgregarPregunta}
                disabled={!nuevaPregunta.trim() || guardandoPregunta}
                className="flex-[2] h-10 bg-[#6B8FC2] text-white text-sm font-medium rounded-xl hover:bg-[#5A7EB1] disabled:opacity-40"
              >
                {guardandoPregunta ? 'Guardando...' : 'Agregar y responder →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}