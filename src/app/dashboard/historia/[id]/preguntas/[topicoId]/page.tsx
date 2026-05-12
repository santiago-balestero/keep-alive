'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/Header'
import Image from 'next/image'

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
  const [imagenesGuardadas, setImagenesGuardadas] = useState<Record<number, string>>({})
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [escuchando, setEscuchando] = useState(false)
  const [soportaVoz, setSoportaVoz] = useState(true)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const historiaId = params.id as string
  const topicoId = params.topicoId as string

  useEffect(() => {
    const fetchData = async () => {
      const { data: h } = await supabase
        .from('historias').select('tipo').eq('id', historiaId).single()
      if (h) setHistoria(h)

      const { data: t } = await supabase
        .from('topicos').select('nombre_es').eq('id', topicoId).single()
      if (t) setTopicoNombre(t.nombre_es)

      const { data: p } = await supabase
        .from('preguntas').select('*').eq('id_topico', topicoId).order('orden')
      if (p) setPreguntas(p)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: r } = await supabase
          .from('respuestas')
          .select('id_pregunta, contenido, imagen_url')
          .eq('id_historia', historiaId)
          .eq('id_usuario', user.id)
        if (r) {
          const mapaTexto: Record<number, string> = {}
          const mapaImagenes: Record<number, string> = {}
          r.forEach((resp) => {
            mapaTexto[resp.id_pregunta] = resp.contenido
            if (resp.imagen_url) mapaImagenes[resp.id_pregunta] = resp.imagen_url
          })
          setRespuestasGuardadas(mapaTexto)
          setImagenesGuardadas(mapaImagenes)
        }
      }
    }
    fetchData()
  }, [historiaId, topicoId])

  useEffect(() => {
    if (preguntas[indice]) {
      setRespuesta(respuestasGuardadas[preguntas[indice].id] || '')
      setImagenPreview(imagenesGuardadas[preguntas[indice].id] || null)
      setImagenFile(null)
      setGuardado(false)
    }
  }, [indice, preguntas, respuestasGuardadas, imagenesGuardadas])

  const preguntaActual = preguntas[indice]
  const textoPregunta = historia?.tipo === 'autobiografia'
    ? preguntaActual?.texto_es
    : preguntaActual?.texto_es_tercera

  const iniciarEscucha = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSoportaVoz(false)
      return
    }

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
        if (event.results[i].isFinal) {
          textoFinal += transcript + ' '
        } else {
          textoInterim += transcript
        }
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

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagenFile(file)
    setImagenPreview(URL.createObjectURL(file))
    setGuardado(false)
  }

  const handleEliminarImagen = () => {
    setImagenFile(null)
    setImagenPreview(null)
    setGuardado(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGuardar = async () => {
    if (!preguntaActual) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let imagenUrl = imagenesGuardadas[preguntaActual.id] || null

    // Subir imagen si hay una nueva
    if (imagenFile) {
      setSubiendoImagen(true)
      const ext = imagenFile.name.split('.').pop()
      const path = `${user.id}/${historiaId}/${preguntaActual.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(path, imagenFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('imagenes')
          .getPublicUrl(path)
        imagenUrl = urlData.publicUrl
      }
      setSubiendoImagen(false)
    }

    // Si se eliminó la imagen
    if (!imagenPreview && !imagenFile) {
      imagenUrl = null
    }

    const existe = respuestasGuardadas[preguntaActual.id] !== undefined

    if (existe) {
      await supabase
        .from('respuestas')
        .update({ contenido: respuesta, imagen_url: imagenUrl })
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
          imagen_url: imagenUrl,
        })
    }

    setRespuestasGuardadas((prev) => ({ ...prev, [preguntaActual.id]: respuesta }))
    if (imagenUrl) {
      setImagenesGuardadas((prev) => ({ ...prev, [preguntaActual.id]: imagenUrl! }))
    }
    setGuardado(true)
    setLoading(false)

    if (indice < preguntas.length - 1) {
      setTimeout(() => setIndice((prev) => prev + 1), 400)
    } else {
      setTimeout(() => router.push(`/dashboard/historia/${historiaId}`), 600)
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
      <Header backUrl={`/dashboard/historia/${historiaId}`} backLabel="Historia" />

      <div className="page-container" style={{ paddingTop: 32, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Progreso */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-[#888888]">
            <span className="font-medium">{topicoNombre}</span>
            <span>{indice + 1} / {preguntas.length}</span>
          </div>
          <div className="h-1.5 bg-[#EEEEEE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6B8FC2] rounded-full transition-all duration-500"
              style={{ width: `${((indice + 1) / preguntas.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Tip */}
        <div className="bg-[#E8EFF8] rounded-2xl px-4 py-3 border-l-4 border-[#6B8FC2]">
          <p className="text-xs text-[#6B8FC2] leading-relaxed">
            Consejo: describí quiénes estaban, cuándo y dónde ocurrió. Cuanto más detalle, mejor.
          </p>
        </div>

        {/* Pregunta */}
        <div className="bg-white border-2 border-[#141414] rounded-2xl p-5">
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
                escuchando
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-[#F0F0F0] hover:bg-[#E0E0E0]'
              }`}
              title={escuchando ? 'Detener grabación' : 'Grabar respuesta por voz'}
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
          {!soportaVoz && (
            <p className="text-xs text-[#AAAAAA]">Tu navegador no soporta reconocimiento de voz.</p>
          )}
          {guardado && (
            <p className="text-xs text-[#6B8FC2] flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#6B8FC2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Guardado
            </p>
          )}
        </div>

        {/* Imagen */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-widest">
            Foto (opcional)
          </p>

          {imagenPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#EEEEEE]">
              <img
                src={imagenPreview}
                alt="Preview"
                className="w-full object-cover max-h-64"
              />
              <button
                onClick={handleEliminarImagen}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg leading-none hover:bg-black/70"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-[#DDDDDD] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#6B8FC2] hover:bg-[#F8FAFF] transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span className="text-xs text-[#AAAAAA]">Subir foto</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImagenChange}
            className="hidden"
          />
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={handleSaltar}
            className="flex-1 h-12 border-2 border-[#EEEEEE] rounded-2xl text-sm text-[#888888] bg-white hover:bg-[#F8F8F8] active:scale-[0.98]"
          >
            Saltar
          </button>
          <button
            onClick={handleGuardar}
            disabled={loading || (!respuesta.trim() && !imagenFile && !imagenPreview)}
            className="flex-[2] h-12 bg-[#141414] text-white text-sm font-medium rounded-2xl hover:bg-[#333333] active:scale-[0.98] disabled:opacity-40"
          >
            {subiendoImagen ? 'Subiendo foto...' : loading ? 'Guardando...' : indice < preguntas.length - 1 ? 'Guardar y seguir →' : 'Finalizar →'}
          </button>
        </div>

      </div>
    </main>
  )
}