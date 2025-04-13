"use client"

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseEventVisibilityProps {
  eventHeight: number
  eventGap: number
}

interface EventVisibilityResultProps {
  contentRef: React.RefObject<HTMLDivElement>
  contentHeight: number
  getVisibleEventCount: () => number
}

/**
 * Hook for calculating event visibility based on container height
 * Uses ResizeObserver for efficient updates
 */
export function useEventVisibility({ eventHeight, eventGap }: UseEventVisibilityProps): EventVisibilityResultProps {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number>(0)

  useEffect(() => {
    if (!contentRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(contentRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const getVisibleEventCount = useCallback((): number => {
    if (!contentHeight) return 0
    
    // Calculate how many events can fit in the container
    // Subtract 1 to reserve space for the "more" button
    return Math.max(0, Math.floor(contentHeight / (eventHeight + eventGap)))
  }, [contentHeight, eventHeight, eventGap])

  return {
    contentRef,
    contentHeight,
    getVisibleEventCount
  } as EventVisibilityResultProps
}