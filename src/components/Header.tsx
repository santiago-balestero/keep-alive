'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Props = {
  backUrl?: string
  backLabel?: string
  rightContent?: React.ReactNode
  title?: string
}

export default function Header({ backUrl, backLabel, rightContent, title }: Props) {
  const router = useRouter()

  return (
    <header className="page-header">
      <div className="page-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <Image
            src="/logo.jpg"
            alt="Keep Alive"
            width={36}
            height={36}
            style={{ objectFit: 'contain', borderRadius: 12, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => router.push('/dashboard')}
          />
          {backUrl && (
            <button
              onClick={() => router.push(backUrl)}
              style={{
                fontSize: 14, color: 'var(--color-azul)', background: 'none',
                border: 'none', cursor: 'pointer', flexShrink: 0
              }}
            >
              ← {backLabel || 'Volver'}
            </button>
          )}
          {title && (
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-texto)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {title}
            </span>
          )}
        </div>
        {rightContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {rightContent}
          </div>
        )}
      </div>
    </header>
  )
}