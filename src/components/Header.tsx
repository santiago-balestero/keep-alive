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
    <header className="sticky top-0 z-10 bg-white border-b border-[#EEEEEE] px-4 h-14 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Image
          src="/logo.jpg"
          alt="Keep Alive"
          width={36}
          height={36}
          className="object-contain rounded-lg flex-shrink-0 cursor-pointer"
          onClick={() => router.push('/dashboard')}
        />
        {backUrl && (
          <button
            onClick={() => router.push(backUrl)}
            className="text-sm text-[#6B8FC2] flex items-center gap-1 flex-shrink-0"
          >
            ← {backLabel || 'Volver'}
          </button>
        )}
        {title && (
          <span className="text-sm font-medium text-[#141414] truncate">{title}</span>
        )}
      </div>
      {rightContent && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightContent}
        </div>
      )}
    </header>
  )
}