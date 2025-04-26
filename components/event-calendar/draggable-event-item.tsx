import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Dayjs } from 'dayjs';
import type { CalendarEventProps } from './types/calendar';
import { getEventInfo } from './utils/calendar';

interface DraggableEventItemProps {
  event: CalendarEventProps;
  cellDate: Dayjs;
  eventHeight: number;
  eventGap: number;
  isOriginalDraggedItem: boolean;
}

export function DraggableEventItem({
  event,
  cellDate,
  eventHeight,
  eventGap,
  isOriginalDraggedItem,
}: DraggableEventItemProps) {
  // Get positioning info for this event segment on this specific day
  const { left, width, isStartDay, isMultiDay, multiWeek, show } = getEventInfo(event, cellDate);
  
  // Only make the event draggable if it's the start day or a new week start
  const isDraggableSegment = show;
  
  // Calculate top position based on the event's cell slot
  const topPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;

  // Set up draggable (only for draggable segments)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: {
      event,
      cellDate,
    },
    disabled: !isDraggableSegment,
  });

  // Don't render if this segment shouldn't be shown
  if (!show) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        '--event-left': left,
        '--event-width': width,
        '--event-top': `${topPosition}px`,
        '--event-height': `${eventHeight}px`,
        opacity: isDragging || isOriginalDraggedItem ? 0.5 : 1,
        cursor: isDraggableSegment ? 'move' : 'default',
      } as React.CSSProperties}
      className={`
        absolute left-[var(--event-left)] top-[var(--event-top)] 
        w-[calc(var(--event-width)-1px)] 
        data-[multiweek=next]:w-[var(--event-width)]
        px-0.5 
        data-[multiweek=previous]:ps-0 data-[multiweek=next]:pe-0 data-[multiweek=both]:px-0
        group-last/row:w-[var(--event-width)]
        ${isDragging ? 'z-30' : 'z-10'}
      `}
      title={event.title}
      data-cell-slot={event.cellSlot}
      data-start-day={isStartDay || undefined}
      data-multiday={isMultiDay || undefined}
      data-multiweek={multiWeek}
      data-dragging={isDragging || undefined}
      {...(isDraggableSegment ? { ...attributes, ...listeners } : {})}
    >
      <div 
        className={`
          w-full h-[var(--event-height)] px-1 flex items-center text-xs 
          bg-primary/30 text-primary-foreground rounded 
          in-data-[multiweek=previous]:rounded-s-none 
          in-data-[multiweek=next]:rounded-e-none 
          in-data-[multiweek=both]:rounded-none
        `}
      >
        <span className="truncate">{event.title}</span>
      </div>
    </div>
  );
}
