import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { CalendarEventProps, CalendarCell } from './types/calendar';
import { DraggableEventItem } from './draggable-event-item';
import { getEventInfo } from './utils/calendar';

// Type for the projection data stored in MonthView state
export interface ProjectionData {
  event: CalendarEventProps;
  targetDate: Dayjs;
  dayDifference: number;
}

interface DroppableDayCellProps {
  cell: CalendarCell;
  visibleEvents: CalendarEventProps[];
  hiddenEventsCount: number;
  eventHeight: number;
  eventGap: number;
  activeId: string | number | null;
  projection: ProjectionData | null; // The calculated projection data
}

export function DroppableDayCell({
  cell,
  visibleEvents,
  hiddenEventsCount,
  eventHeight,
  eventGap,
  activeId,
  projection,
}: DroppableDayCellProps) {
  const cellDateStr = cell.date.format('YYYY-MM-DD');

  // --- Droppable Setup ---
  const { setNodeRef, isOver } = useDroppable({
    id: cellDateStr,
  });

  // --- Render Projection ---
  // #Reason: Check if a projection exists and if this cell's date falls *within* the projected event's date range.
  const projectionInfo = React.useMemo(() => {
    if (!projection || !projection.event) return null;

    const projectedStartDate = dayjs(projection.event.start).add(projection.dayDifference, 'day');
    const projectedEndDate = dayjs(projection.event.end).add(projection.dayDifference, 'day');

    // Check if the current cell's date is within the projected range (inclusive)
    const isWithinProjectedRange =
      (cell.date.isSame(projectedStartDate, 'day') || cell.date.isAfter(projectedStartDate, 'day')) &&
      (cell.date.isSame(projectedEndDate, 'day') || cell.date.isBefore(projectedEndDate, 'day'));

    if (isWithinProjectedRange) {
      // Create a temporary event object representing the *entire* projected event
      // getEventInfo inside the render will handle slicing it for *this specific cell*
      const fullProjectedEvent: CalendarEventProps = {
        ...projection.event, // Use original ID but potentially modify appearance
        start: projectedStartDate.toDate(),
        end: projectedEndDate.toDate(),
        // Assign a consistent slot if possible, or recalculate. Using original for now.
        cellSlot: projection.event.cellSlot
      };
      return {
        projectedEvent: fullProjectedEvent,
        // Pass positioning info calculated for *this cell*
        positioning: getEventInfo(fullProjectedEvent, cell.date)
      };
    }
    return null;
  }, [projection, cell.date]);

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 h-full mt-6 ${isOver ? 'bg-primary/10' : ''}`}
      data-date={cellDateStr}
      data-is-over={isOver || undefined}
    >
      {/* Screen Reader heading */}
      <h2 className="sr-only">
        {visibleEvents.length === 0 ? 'No events, ' : `${visibleEvents.length} events, `}
        {cell.date.format('dddd, MMMM D')}
      </h2>

      {/* Render visible events */}
      {visibleEvents.map((event) => (
        <DraggableEventItem
          key={event.id}
          event={event}
          cellDate={cell.date}
          eventHeight={eventHeight}
          eventGap={eventGap}
          isOriginalDraggedItem={activeId === event.id}
        />
      ))}

      {/* Render "more" button for hidden events */}
      {hiddenEventsCount > 0 && (
        <div
          style={{
            '--event-top': `${visibleEvents.length * (eventHeight + eventGap)}px`,
            '--event-height': `${eventHeight}px`,
          } as React.CSSProperties}
          className="absolute left-0 top-[var(--event-top)] w-[calc((100%/7)-1px)] px-0.5"
        >
          <button className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded">
            <span className="truncate">+{hiddenEventsCount}<span className="max-sm:sr-only"> more</span></span>
          </button>
        </div>
      )}

      {/* Render Opaque Projection Segment if applicable */}
      {projectionInfo && (
        <div
          style={{
            '--event-left': projectionInfo.positioning.left,
            '--event-width': projectionInfo.positioning.width,
            '--event-top': `${projectionInfo.projectedEvent.cellSlot ? projectionInfo.projectedEvent.cellSlot * (eventHeight + eventGap) : 0}px`,
            '--event-height': `${eventHeight}px`,
            pointerEvents: 'none', // Prevent interaction with the projection itself
          } as React.CSSProperties}
          className={`
            absolute left-[var(--event-left)] top-[var(--event-top)]
            w-[calc(var(--event-width)-1px)]
            data-[multiweek=next]:w-[var(--event-width)]
            px-0.5
            data-[multiweek=previous]:ps-0 data-[multiweek=next]:pe-0 data-[multiweek=both]:px-0
            group-last/row:w-[var(--event-width)]
            opacity-100 z-20
          `}
          data-projection-for={projectionInfo.projectedEvent.id}
          data-multiweek={projectionInfo.positioning.multiWeek}
        >
          <div
            className={`
              w-full h-[var(--event-height)] px-1 flex items-center text-xs
              bg-primary/50 text-primary-foreground rounded border border-primary/80 shadow-md
              in-data-[multiweek=previous]:rounded-s-none
              in-data-[multiweek=next]:rounded-e-none
              in-data-[multiweek=both]:rounded-none
            `}
          >
            <span className="truncate">{projectionInfo.projectedEvent.title}</span>
          </div>
        </div>
      )}


    </div>
  );
}