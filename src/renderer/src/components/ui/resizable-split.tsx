import { useCallback, useEffect, useRef, useState, ReactNode } from 'react'

interface ResizableSplitProps {
  left: ReactNode
  right: ReactNode
  defaultLeftWidth?: number   // px (ignored if defaultLeftPercent set)
  defaultLeftPercent?: number // 0–100, e.g. 50 for half/half
  minLeft?: number            // px
  minRight?: number           // px
  className?: string
}

export function ResizableSplit({
  left,
  right,
  defaultLeftWidth = 288,
  defaultLeftPercent,
  minLeft = 140,
  minRight = 200,
  className = ''
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized || defaultLeftPercent == null || !containerRef.current) return
    const w = containerRef.current.getBoundingClientRect().width
    setLeftWidth(Math.floor((w * defaultLeftPercent) / 100))
    setInitialized(true)
  }, [defaultLeftPercent, initialized])
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = leftWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [leftWidth])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const containerWidth = containerRef.current.getBoundingClientRect().width
      const delta = e.clientX - startX.current
      const next = Math.min(
        containerWidth - minRight - 4,
        Math.max(minLeft, startWidth.current + delta)
      )
      setLeftWidth(next)
    }
    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [minLeft, minRight])

  return (
    <div ref={containerRef} className={`flex flex-1 overflow-hidden ${className}`}>
      {/* Left pane */}
      <div style={{ width: leftWidth, minWidth: leftWidth, maxWidth: leftWidth }} className="overflow-y-auto">
        {left}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 shrink-0 cursor-col-resize bg-[hsl(var(--border))] hover:bg-[hsl(var(--primary))] transition-colors active:bg-[hsl(var(--primary))]"
        title="Drag to resize"
      />

      {/* Right pane */}
      <div className="flex-1 overflow-hidden">
        {right}
      </div>
    </div>
  )
}
