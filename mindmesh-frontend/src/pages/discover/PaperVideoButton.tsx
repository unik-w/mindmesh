import { type MouseEvent as ReactMouseEvent } from 'react'
import { VideoCameraIcon } from './icons'

export function PaperVideoButton({
  onClick,
  className = '',
  title = 'Video explainer (Beyond Presence)',
}: {
  onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onClick(e)
      }}
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 ${className}`}
    >
      <VideoCameraIcon className="size-4.5" />
    </button>
  )
}
