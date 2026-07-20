import { useState } from 'react'

interface PosterProps {
  src: string | null
  alt: string
  className?: string
}

/** Image with graceful fallback to an initial-letter tile when missing/broken. */
export function Poster({ src, alt, className = '' }: PosterProps): JSX.Element {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 text-3xl font-bold text-zinc-400 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-600 ${className}`}
        aria-label={alt}
      >
        {alt.trim().charAt(0).toUpperCase() || '?'}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
      draggable={false}
    />
  )
}
