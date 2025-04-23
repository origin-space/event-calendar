import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CalendarEventProps } from './types/calendar'; // Adjust path if needed
import { getEventInfo } from './utils/calendar'; // Adjust path if needed
import dayjs from 'dayjs';

interface DraggableEventProps {
  event: CalendarEventProps;
  cellDate: dayjs.Dayjs;
  eventHeight: number;
  eventGap: number;
}

export function DraggableEvent({ event, cellDate, eventHeight, eventGap }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: {
      cellDate: cellDate.format('YYYY-MM-DD'),
    }
  });

  const { left, width, isStartDay, isMultiDay, multiWeek, show } = getEventInfo(event, cellDate);
  const topPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;

  // --- Check if the event spans this day at all ---
  const start = dayjs(event.start);
  const end = dayjs(event.end);
  const isWithinEventSpan = cellDate.isSameOrAfter(start, 'day') && cellDate.isSameOrBefore(end, 'day');

  // If the event doesn't even cover this day, render nothing
  if (!isWithinEventSpan) {
    return null;
  }
  // --- End check ---

  // Render the container div if the event spans this day, apply dragging opacity etc.
  // This div acts as the drag handle and covers the event's calculated area for the day.
  return (
    <div
      ref={setNodeRef}
      key={event.id}
      style={{
        '--event-left': left,
        '--event-width': width,
        '--event-top': `${topPosition}px`,
        '--event-height': `${eventHeight}px`,
        // Hide original completely only if show is true (visual part exists) AND dragging
        // Otherwise, if show is false, it's already visually hidden, keep opacity 1 for drop target
        opacity: isDragging && show ? 0 : 1,
        touchAction: 'none',
        // Ensure the div exists even if button is hidden for DnD hit detection
        // background: 'rgba(0, 0, 255, 0.0)', // Optional: uncomment for debugging drop zone
      } as React.CSSProperties}
      className="absolute left-[var(--event-left)] top-[var(--event-top)] w-[calc(var(--event-width)-1px)] data-[multiweek=next]:w-(--event-width) px-0.5 data-[multiweek=previous]:ps-0 data-[multiweek=next]:pe-0 data-[multiweek=both]:px-0 group-last/row:w-(--event-width)"
      title={event.title}
      data-cell-slot={event.cellSlot}
      data-start-day={isStartDay || undefined}
      data-multiday={isMultiDay || undefined}
      data-multiweek={multiWeek}
      data-hidden={!show}
      {...attributes}
      {...listeners}
    >
      {show ? (
        <button className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded in-data-[multiweek=previous]:rounded-s-none in-data-[multiweek=next]:rounded-e-none in-data-[multiweek=both]:rounded-none in-data-[hidden=true]:sr-only">
          <span className="truncate">{event.title}</span>
        </button>
      ): (
        <span className="sr-only">{event.title}</span>
      )}
    </div>
  );
}