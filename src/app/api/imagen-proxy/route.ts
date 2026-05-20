import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  try {
    const response = await fetch(url)
    if (!response.ok) return NextResponse.json({ error: 'No se pudo cargar la imagen' }, { status: 400 })

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error cargando imagen' }, { status: 500 })
  }
}
