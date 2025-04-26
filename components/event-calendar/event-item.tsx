import React from 'react';
import dayjs from 'dayjs';
import { type Active } from '@dnd-kit/core';
import { type CalendarEventProps } from './types/calendar';
import { getEventInfo } from './utils/calendar'; // Assuming getEventInfo is here

interface EventItemProps {
  event: CalendarEventProps;
  cellDate: dayjs.Dayjs; // The specific date cell this instance is related to
  isOverlay?: boolean;
  activeDragItemForOverlay?: Active | null; // Only relevant for overlay
  eventHeight: number;
  eventGap: number;
}

/**
 * Renders a single calendar event segment, handling its appearance
 * in the grid, as a projection, or in the drag overlay.
 */
export function EventItem({
  event,
  cellDate,
  isOverlay = false,
  activeDragItemForOverlay,
  eventHeight,
  eventGap,
}: EventItemProps): React.ReactNode {

  // #Reason: Calculate positioning, visibility, and multi-week details for the event segment on this specific cellDate.
  const eventInfoResult = getEventInfo(event, cellDate);

  // #Reason: For grid rendering, if getEventInfo determines the event segment shouldn't be shown in this cell, render nothing.
  if (!isOverlay && !eventInfoResult.show) {
    return null;
  }

  // We need the detailed info for rendering. Assume 'show' is true if we reach here for grid, or always proceed for overlay.
  // Use optional chaining and default values for safety, although `show: false` case is handled above for non-overlays.
  const info = eventInfoResult as Extract<ReturnType<typeof getEventInfo>, { show: true }>; // More specific type assertion
  const { width = '100%', days = 1, isStartDay = false, isMultiDay = false, multiWeek, show = true } = info ?? {};

  // #Reason: Calculate vertical position based on the event's assigned slot in the layout.
  const gridTopPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;

  // --- Overlay Rendering ---
  if (isOverlay) {
    // #Reason: For the overlay, use the initial top position captured at drag start.
    const overlayTopPosition = activeDragItemForOverlay?.data.current?.initialTopPosition ?? 0;
    // #Reason: Retrieve segment offset needed to correctly position multi-week events in the overlay.
    const daysInPrevWeeks = activeDragItemForOverlay?.data.current?.segmentDaysInPrevWeeks ?? 0;
    const opacityClass = 'opacity-75'; // Overlay is always slightly transparent
    const pointerEventsClass = 'pointer-events-none'; // Overlay never intercepts pointer events

    return (
      // #Reason: Outer div handles horizontal translation for multi-week events based on dragged segment.
      <div
        style={{
          transform: `translateX(-${daysInPrevWeeks * 100 / 7}%)`,
          width: `${100 * days}%`, // Set width based on total event days
        }}
        data-testid={`event-overlay-${event.id}`} // Test ID for overlay
      >
        {/* #Reason: Inner div handles height, vertical position, and visual styling. */}
        <div
          style={{
            height: `${eventHeight}px`,
            top: `${overlayTopPosition}px`, // Use initial captured top position
            position: 'relative', // Position relative to the translated outer div
          }}
          className={`px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded shadow-lg ${opacityClass} ${pointerEventsClass}`}
          title={event.title}
        >
          <span className="truncate">{event.title}</span>
        </div>
      </div>
    );
  }

  // --- Grid/Projection Rendering ---
  // #Reason: Pointer events disabled for projections to allow interaction with underlying cells.
  // const pointerEventsClass = isProjection ? 'pointer-events-none' : '';

  return (
    <div
      key={`${event.id}-${cellDate.format('YYYYMMDD')}`}
      style={{
        '--event-width': width,
        '--event-top': `${gridTopPosition}px`,
        '--event-height': `${eventHeight}px`,
      } as React.CSSProperties}
      className={`absolute top-[var(--event-top)] w-[calc(var(--event-width)-1px)] px-0.5 transition-all duration-200 ease-out z-10`}
      title={event.title}
      data-testid={`event-item-${event.id}-${cellDate.format('YYYYMMDD')}`}
      data-cell-slot={event.cellSlot}
      data-start-day={isStartDay || undefined}
      data-multiday={isMultiDay || undefined}
      data-multiweek={multiWeek}
      data-hidden={(!show) || undefined}
    >
      {/* #Reason: Inner div for background, text, and rounded corners. Uses `invisible` when hidden to maintain layout space. */}
      <div className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded in-data-[multiweek=previous]:rounded-s-none in-data-[multiweek=next]:rounded-e-none in-data-[multiweek=both]:rounded-none in-data-[hidden=true]:invisible in-aria-pressed:opacity-50">
        <span className="truncate">{event.title}</span>
      </div>
    </div>
  );
} 