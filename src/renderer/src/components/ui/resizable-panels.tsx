import { useCallback, useEffect, useRef, useState, ReactNode } from 'react'

interface PanelSpec {
  id: string
  content: ReactNode
  minWidth?: number
}

interface ResizablePanelsProps {
  panels: PanelSpec[]
  defaultRatios?: number[]
  className?: string
}

const HANDLE_W = 4

export function ResizablePanels({
  panels,
  defaultRatios,
  className = ''
}: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const count = panels.length
  const ratios =
    defaultRatios?.length === count
      ? defaultRatios
      : Array(count).fill(1 / count)

  const [widths, setWidths] = useState<number[]>([])
  const drag = useRef<{ handle: number; startX: number; startWidths: number[] } | null>(null)

  const initWidths = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const total = el.getBoundingClientRect().width - (count - 1) * HANDLE_W
    if (total <= 0) return
    setWidths(ratios.map((r) => Math.max(panels[0].minWidth ?? 120, Math.floor(total * r))))
  }, [count, ratios, panels])

  useEffect(() => {
    initWidths()
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(initWidths)
    ro.observe(el)
    return () => ro.disconnect()
  }, [initWidths])

  const onHandleDown = (handleIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    drag.current = { handle: handleIndex, startX: e.clientX, startWidths: [...widths] }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      const delta = e.clientX - d.startX
      const i = d.handle
      const minL = panels[i].minWidth ?? 120
      const minR = panels[i + 1].minWidth ?? 120
      const next = [...d.startWidths]
      next[i] = Math.max(minL, d.startWidths[i] + delta)
      next[i + 1] = Math.max(minR, d.startWidths[i + 1] - delta)
      if (next[i + 1] === minR && next[i] > d.startWidths[i]) return
      setWidths(next)
    }
    const onUp = () => {
      drag.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [panels])

  if (widths.length !== count) {
    return <div ref={containerRef} className={`flex flex-1 min-h-0 overflow-hidden ${className}`} />
  }

  const nodes: ReactNode[] = []
  panels.forEach((panel, i) => {
    nodes.push(
      <div
        key={panel.id}
        style={{ width: widths[i], minWidth: widths[i], maxWidth: widths[i] }}
        className="overflow-y-auto overflow-x-hidden h-full"
      >
        {panel.content}
      </div>
    )
    if (i < count - 1) {
      nodes.push(
        <div
          key={`handle-${i}`}
          onMouseDown={(e) => onHandleDown(i, e)}
          className="shrink-0 w-1 cursor-col-resize bg-[hsl(var(--border))] hover:bg-[hsl(var(--primary))] active:bg-[hsl(var(--primary))]"
          title="Drag to resize"
        />
      )
    }
  })

  return (
    <div ref={containerRef} className={`flex flex-1 min-h-0 overflow-hidden ${className}`}>
      {nodes}
    </div>
  )
}
