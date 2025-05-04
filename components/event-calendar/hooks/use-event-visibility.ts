"use client"

import { useCallback, useEffect, useRef, useState } from 'react';
import { type Dayjs } from 'dayjs'; // Import Dayjs type

interface UseEventVisibilityProps {
  eventHeight: number;
  eventGap: number;
  currentDate: Dayjs; // Add currentDate dependency
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
export function useEventVisibility({
  eventHeight,
  eventGap,
  currentDate, // Destructure currentDate
}: UseEventVisibilityProps): EventVisibilityResultProps {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (!contentRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(contentRef.current)

    // Reset height when currentDate changes, forcing recalculation
    setContentHeight(0);

    // Ensure the observer is attached to the current ref
    const currentRef = contentRef.current;
    if (currentRef) {
      resizeObserver.observe(currentRef);
    }

    return () => {
      // Disconnect observer on cleanup or before re-running effect
      resizeObserver.disconnect();
    };
  }, [currentDate]); // Add currentDate to dependency array

  const getVisibleEventCount = useCallback((): number => {
    if (!contentHeight) return 0
    
    // Calculate how many events can fit in the container
    return Math.max(0, Math.floor(contentHeight / (eventHeight + eventGap)))
  }, [contentHeight, eventHeight, eventGap])

  return {
    contentRef,
    contentHeight,
    getVisibleEventCount
  } as EventVisibilityResultProps
}
