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
    <header className="sticky top-0 z-10 bg-white border-b border-[#F0F0F0]">
      <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Image
            src="/logo.jpg"
            alt="Keep Alive"
            width={36}
            height={36}
            className="object-contain rounded-xl flex-shrink-0 cursor-pointer"
            onClick={() => router.push('/dashboard')}
          />
          {backUrl && (
            <button
              onClick={() => router.push(backUrl)}
              className="text-sm text-[#6B8FC2] flex items-center gap-1 flex-shrink-0 hover:underline"
            >
              ← {backLabel || 'Volver'}
            </button>
          )}
          {title && (
            <span className="text-sm font-medium text-[#141414] truncate">{title}</span>
          )}
        </div>
        {rightContent && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  )
}