'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

type EstadoVista = 'cargando' | 'bienvenida' | 'eligiendo-topico' | 'respondiendo' | 'finalizado' | 'error'
type Colaborador = { id: string; email: string; id_historia: string; estado: string }
type Historia = { id: string; titulo: string; tipo: string; nombre_protagonista: string | null; descripcion: string | null }
type Topico = { id: number; nombre_es: string }
type Pregunta = { id: number; texto_es: string; texto_es_tercera: string; orden: number }

export default function ColaborarPage() {
  const [estado, setEstado] = useState<EstadoVista>('cargando')
  const [colaborador, setColaborador] = useState<Colaborador | null>(null)
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [topicoActivo, setTopicoActivo] = useState<Topico | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [indice, setIndice] = useState(0)
  const [respuesta, setRespuesta] = useState('')
  const [respuestasGuardadas, setRespuestasGuardadas] = useState<Record<number, string>>({})
  const [imagenesGuardadas, setImagenesGuardadas] = useState<Record<number, string>>({})
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [escuchando, setEscuchando] = useState(false)
  const [soportaVoz, setSoportaVoz] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const supabase = createClient()
  const params = useParams()
  const token = params.token as string

  useEffect(() => {
    const init = async () => {
      const { data: colab, error } = await supabase
        .from('colaboradores').select('*').eq('token', token).single()

      if (error || !colab) {
        setErrorMsg('El link de invitación no es válido o ya expiró.')
        setEstado('error')
        return
      }

      setColaborador(colab)

      if (colab.estado === 'pendiente') {
        await supabase.from('colaboradores').update({ estado: 'aceptado' }).eq('id', colab.id)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      } else {
        const { data: anonData } = await supabase.auth.signInAnonymously()
        if (anonData?.user) setUserId(anonData.user.id)
      }

      const { data: h } = await supabase.from('historias').select('*').eq('id', colab.id_historia).single()
      if (h) setHistoria(h)

      const { data: ht } = await supabase
        .from('historia_topicos').select('topicos(id, nombre_es)').eq('id_historia', colab.id_historia)
      if (ht) setTopicos(ht.map((row: any) => row.topicos).filter(Boolean))

      setEstado('bienvenida')
    }
    init()
  }, [token])

  const handleElegirTopico = async (topico: Topico) => {
    setTopicoActivo(topico)
    setIndice(0)
    const { data: p } = await supabase.from('preguntas').select('*').eq('id_topico', topico.id).order('orden')
    if (p) setPreguntas(p)

    if (userId) {
      const { data: r } = await supabase
        .from('respuestas').select('id_pregunta, contenido, imagen_url')
        .eq('id_historia', colaborador!.id_historia).eq('id_usuario', userId)
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
    setEstado('respondiendo')
  }

  useEffect(() => {
    if (preguntas[indice]) {
      setRespuesta(respuestasGuardadas[preguntas[indice].id] || '')
      setImagenPreview(imagenesGuardadas[preguntas[indice].id] || null)
      setImagenFile(null)
      setGuardado(false)
    }
  }, [indice, preguntas])

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
    const preguntaActual = preguntas[indice]
    if (!preguntaActual || !userId || !colaborador) return
    setLoading(true)

    let imagenUrl = imagenesGuardadas[preguntaActual.id] || null

    if (imagenFile) {
      setSubiendoImagen(true)
      const ext = imagenFile.name.split('.').pop()
      const path = `${colaborador.id_historia}/${preguntaActual.id}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('images').upload(path, imagenFile, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
        imagenUrl = urlData.publicUrl
      }
      setSubiendoImagen(false)
    }

    if (!imagenPreview && !imagenFile) imagenUrl = null

    const existe = respuestasGuardadas[preguntaActual.id] !== undefined
    if (existe) {
      await supabase.from('respuestas')
        .update({ contenido: respuesta, imagen_url: imagenUrl })
        .eq('id_historia', colaborador.id_historia)
        .eq('id_pregunta', preguntaActual.id)
        .eq('id_usuario', userId)
    } else {
      await supabase.from('respuestas').insert({
        id_historia: colaborador.id_historia,
        id_pregunta: preguntaActual.id,
        id_usuario: userId,
        contenido: respuesta,
        imagen_url: imagenUrl,
      })
    }

    setRespuestasGuardadas((prev) => ({ ...prev, [preguntaActual.id]: respuesta }))
    if (imagenUrl) setImagenesGuardadas((prev) => ({ ...prev, [preguntaActual.id]: imagenUrl! }))
    setGuardado(true)
    setLoading(false)

    if (indice < preguntas.length - 1) {
      setTimeout(() => setIndice((prev) => prev + 1), 400)
    } else {
      setTimeout(() => setEstado('eligiendo-topico'), 600)
    }
  }

  const handleSaltar = () => {
    if (indice < preguntas.length - 1) setIndice((prev) => prev + 1)
    else setEstado('eligiendo-topico')
  }

  const preguntaActual = preguntas[indice]
  const textoPregunta = historia?.tipo === 'autobiografia' ? preguntaActual?.texto_es : preguntaActual?.texto_es_tercera

  if (estado === 'cargando') return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <p className="text-sm text-[#888888]">Cargando invitación...</p>
    </main>
  )

  if (estado === 'error') return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">
      <div className="text-center flex flex-col gap-3">
        <span className="text-4xl">❌</span>
        <p className="text-base font-medium text-[#141414]">Link inválido</p>
        <p className="text-sm text-[#888888]">{errorMsg}</p>
      </div>
    </main>
  )

  if (estado === 'finalizado') return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">
      <div className="text-center flex flex-col gap-4 max-w-sm">
        <span className="text-5xl">🙌</span>
        <h1 className="text-xl font-semibold text-[#141414]">¡Gracias por contribuir!</h1>
        <p className="text-sm text-[#888888]">
          Tus respuestas van a formar parte de la historia de {historia?.nombre_protagonista || 'esta persona'}. Es un regalo invaluable.
        </p>
      </div>
    </main>
  )

  if (estado === 'bienvenida') return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <Image src="/logo.jpg" alt="Keep Alive" width={80} height={80} className="object-contain rounded-2xl" />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-[#141414]">Te invitaron a colaborar</h1>
          <p className="text-sm text-[#888888]">Fuiste invitado a contribuir con recuerdos para la historia:</p>
          <p className="text-base font-medium text-[#141414] mt-1">"{historia?.titulo}"</p>
          {historia?.descripcion && <p className="text-xs text-[#AAAAAA]">{historia.descripcion}</p>}
        </div>
        <button
          onClick={() => setEstado('eligiendo-topico')}
          className="w-full h-12 bg-[#141414] text-white text-sm font-medium rounded-xl hover:bg-[#2A2A2A] active:scale-[0.98] transition-all"
        >
          Empezar a contribuir →
        </button>
      </div>
    </main>
  )

  if (estado === 'eligiendo-topico') return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-[#F0F0F0] px-6 h-16 flex items-center">
        <Image src="/logo.jpg" alt="Keep Alive" width={36} height={36} className="object-contain rounded-xl" />
      </header>
      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-[#141414]">¿Sobre qué querés contar?</h1>
          <p className="text-sm text-[#888888] mt-1">Elegí un tópico para responder preguntas</p>
        </div>
        <div className="flex flex-col gap-2">
          {topicos.map((t) => (
            <button
              key={t.id}
              onClick={() => handleElegirTopico(t)}
              className="bg-white border border-[#EEEEEE] rounded-2xl px-4 py-4 flex items-center justify-between hover:border-[#6B8FC2] hover:shadow-sm active:scale-[0.99] transition-all text-left"
            >
              <span className="text-sm font-medium text-[#141414]">{t.nombre_es}</span>
              <span className="text-[#6B8FC2]">›</span>
            </button>
          ))}
        </div>
        <button onClick={() => setEstado('finalizado')} className="text-sm text-[#AAAAAA] hover:text-[#888888] text-center">
          Ya terminé, cerrar
        </button>
      </div>
    </main>
  )

  if (estado === 'respondiendo') return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-[#F0F0F0] px-6 h-16 flex items-center justify-between">
        <Image src="/logo.jpg" alt="Keep Alive" width={36} height={36} className="object-contain rounded-xl" />
        <button onClick={() => setEstado('eligiendo-topico')} className="text-sm text-[#6B8FC2] hover:underline">← Tópicos</button>
      </header>
      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-[#888888]">
            <span className="font-medium">{topicoActivo?.nombre_es}</span>
            <span>{indice + 1} / {preguntas.length}</span>
          </div>
          <div className="h-1.5 bg-[#EEEEEE] rounded-full overflow-hidden">
            <div className="h-full bg-[#6B8FC2] rounded-full transition-all duration-500" style={{ width: `${((indice + 1) / preguntas.length) * 100}%` }} />
          </div>
        </div>
        <div className="bg-[#E8EFF8] rounded-2xl px-4 py-3 border-l-4 border-[#6B8FC2]">
          <p className="text-xs text-[#6B8FC2] leading-relaxed">Consejo: describí quiénes estaban, cuándo y dónde ocurrió. Cuanto más detalle, mejor.</p>
        </div>
        <div className="bg-white border-2 border-[#141414] rounded-2xl p-5">
          <p className="text-sm text-[#141414] leading-relaxed">{textoPregunta}</p>
        </div>
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#6B8FC2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Guardado
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-widest">Foto (opcional)</p>
          {imagenPreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-[#EEEEEE]">
              <img src={imagenPreview} alt="Preview" className="w-full object-cover max-h-64" />
              <button onClick={handleEliminarImagen} className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg leading-none">×</button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-[#DDDDDD] rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#6B8FC2] transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              <span className="text-xs text-[#AAAAAA]">Subir foto</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagenChange} className="hidden" />
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaltar} className="flex-1 h-12 border-2 border-[#EEEEEE] rounded-2xl text-sm text-[#888888] bg-white hover:bg-[#F8F8F8] active:scale-[0.98]">Saltar</button>
          <button
            onClick={handleGuardar}
            disabled={loading || (!respuesta.trim() && !imagenFile && !imagenPreview)}
            className="flex-[2] h-12 bg-[#141414] text-white text-sm font-medium rounded-2xl hover:bg-[#2A2A2A] active:scale-[0.98] disabled:opacity-40"
          >
            {subiendoImagen ? 'Subiendo foto...' : loading ? 'Guardando...' : indice < preguntas.length - 1 ? 'Guardar y seguir →' : 'Finalizar tópico →'}
          </button>
        </div>
      </div>
    </main>
  )

  return null
}