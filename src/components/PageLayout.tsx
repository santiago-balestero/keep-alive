type Props = {
  children: React.ReactNode
  className?: string
  narrow?: boolean
}

export default function PageLayout({ children, className = '', narrow = false }: Props) {
  return (
    <div className={`w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 ${narrow ? 'max-w-xl' : 'max-w-3xl'} ${className}`}>
      {children}
    </div>
  )
}