'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Props = {
  backUrl?: string
  backLabel?: string
  rightContent?: React.ReactNode
}

export default function Header({ backUrl, backLabel, rightContent }: Props) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[#EEEEEE] px-4 sm:px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Image
          src="/logo.jpg"
          alt="Keep Alive"
          width={44}
          height={44}
          className="object-contain cursor-pointer"
          onClick={() => router.push('/dashboard')}
        />
        {backUrl && (
          <button
            onClick={() => router.push(backUrl)}
            className="text-sm text-[#6B8FC2] hover:text-[#4A7AB5] flex items-center gap-1"
          >
            ← {backLabel || 'Volver'}
          </button>
        )}
      </div>
      {rightContent && (
        <div className="flex items-center gap-3">
          {rightContent}
        </div>
      )}
    </header>
  )
}