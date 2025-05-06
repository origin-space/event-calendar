import React from 'react';
import dayjs from 'dayjs';
import { useDraggable, type Active } from '@dnd-kit/core';
import { type CalendarEventProps } from './types/calendar';
import { getEventInfo } from './utils/calendar';
import { cn } from '@/lib/utils'; // Assuming cn utility exists

interface EventItemProps {
  event: CalendarEventProps;
  cellDate: dayjs.Dayjs; // The specific date cell this instance is related to
  isOverlay?: boolean;
  activeDragItemForOverlay?: Active | null; // Keep for overlay logic
  eventHeight: number;
  eventGap: number;
  uniqueId: string; // Unique ID for dnd-kit, passed from parent
  onEventSelect?: (event: CalendarEventProps) => void;
}

/**
 * Renders a single calendar event segment, handling its appearance
 * in the grid, as a projection, or in the drag overlay.
 * Now includes draggable functionality.
 */
export function EventItem({
  event,
  cellDate,
  isOverlay = false,
  activeDragItemForOverlay,
  eventHeight,
  eventGap,
  uniqueId, // Use the unique ID passed from the parent
  onEventSelect,
}: EventItemProps): React.ReactNode {
  // #Reason: Calculate positioning, visibility, and multi-week details for the event segment on this specific cellDate.
  const eventInfoResult = getEventInfo(event, cellDate);  

  // Use optional chaining and default values for safety.
  const info = eventInfoResult as Extract<ReturnType<typeof getEventInfo>, { show: true } | { isMultiDay: true }>;
  const {
    width = '100%',
    days = 1,
    isStartDay = false,
    isMultiDay = false,
    multiWeek,
    show = false, // Default to false if not explicitly shown
    daysInPreviousWeeks = 0,
  } = info ?? {};

  // #Reason: Calculate vertical position based on the event's assigned slot in the layout.
  const gridTopPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;

  // --- Draggable Setup (only for non-overlay items) ---
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: uniqueId, // Use the unique ID passed from parent
    data: {
      event: event,
      dragDate: cellDate.toISOString(),
      initialTopPosition: gridTopPosition, // Capture initial position based on slot
      segmentDaysInPrevWeeks: daysInPreviousWeeks,
    },
    // Disable dragging for overlay items AND for hidden grid items
    disabled: isOverlay || !show,
  });

  // --- Overlay Rendering ---
  if (isOverlay) {
    // #Reason: For the overlay, use the initial top position captured at drag start.
    const overlayTopPosition = activeDragItemForOverlay?.data.current?.initialTopPosition ?? 0;
    // #Reason: Retrieve segment offset needed to correctly position multi-week events in the overlay.
    const overlayDaysInPrevWeeks = activeDragItemForOverlay?.data.current?.segmentDaysInPrevWeeks ?? 0;
    const opacityClass = 'opacity-75'; // Overlay is always slightly transparent
    const pointerEventsClass = 'pointer-events-none'; // Overlay never intercepts pointer events        

    return (
      // #Reason: Outer div handles horizontal translation for multi-week events based on dragged segment.
      // The translation percentage is calculated relative to the total width of the event overlay.
      <div
        style={{
          '--event-translate': `-${days > 0 ? (overlayDaysInPrevWeeks / days) * 100 : 0}%`,
          '--event-width': `${100 * days}%`,
          '--event-top': `${overlayTopPosition}px`,
          '--event-height': `${eventHeight}px`,
        } as React.CSSProperties}      
        className="px-0.5 top-(--event-top) w-(--event-width) relative translate-x-(--event-translate)"
      >
        {/* #Reason: Inner div handles height, vertical position, and visual styling. */}
        <div
          style={{
            height: `${eventHeight}px`,
          }}
          className={cn(
            'h-(--event-height) px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded shadow-lg',
            opacityClass,
            pointerEventsClass
          )}
        >
          <span className="truncate">{event.title}</span>
        </div>
      </div>
    );
  }

  // --- Grid Rendering ---


  // #Reason: Render the grid item container. Apply drag handles only if shown.
  return (
    <div
      ref={setNodeRef} // Apply ref unconditionally
      // Conditionally apply listeners and attributes only when draggable
      {...(show && !isOverlay ? listeners : {})}
      draggable
    >
      <div
        style={{
          '--event-width': width,
          '--event-top': `${gridTopPosition}px`,
          '--event-height': `${eventHeight}px`,
        } as React.CSSProperties}
        data-cell-slot={event.cellSlot}
        data-start-day={isStartDay || undefined}
        data-multiday={isMultiDay || undefined}
        data-multiweek={multiWeek}
        aria-hidden={!show || undefined}      
        className={cn(
          'absolute top-(--event-top) w-[calc(var(--event-width)-1px)] px-0.5 transition-[top] z-10',
          !show && 'sr-only'
        )}      
      >
        {show ? (
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEventSelect?.(event);
            }}
            className={cn(
              'w-full h-(--event-height) px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded cursor-pointer',
              // Handle multi-week rounding
              multiWeek === 'previous' && 'rounded-s-none',
              multiWeek === 'next' && 'rounded-e-none',
              multiWeek === 'both' && 'rounded-none',
              // Style when dragging
              isDragging && 'opacity-50',
            )}
          >
            <span className="truncate">{event.title}</span>
          </button>
        ) : (
          event.title
        )}
      </div>
    </div>
  );
}
