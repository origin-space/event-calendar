import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { CalendarEventProps, CalendarCell } from './types/calendar'; // Adjust path if needed
import { getDayVisibilityData } from './utils/calendar'; // Adjust path if needed
import { DraggableEvent } from './draggable-event'; // Adjust path if needed

interface DroppableDayCellProps {
  cell: CalendarCell;
  layoutForThisWeek: CalendarEventProps[];
  hiddenIdsThisWeek: Set<string | number>;
  visibleCount: number;
  eventHeight: number;
  eventGap: number;
  dayIndex: number; // Pass dayIndex for the key
}

export function DroppableDayCell({ cell, layoutForThisWeek, hiddenIdsThisWeek, visibleCount, eventHeight, eventGap, dayIndex }: DroppableDayCellProps) {
  // Hook called at Top Level of DroppableDayCell
  const droppableId = cell.date.format('YYYY-MM-DD');
  const { setNodeRef } = useDroppable({
    id: droppableId,
  });

  // Calculation remains within this component
  const { visibleEvents, hiddenEventsCount, sortedEvents } = getDayVisibilityData(
    cell.date,
    layoutForThisWeek,
    hiddenIdsThisWeek,
    visibleCount
  );

  // Render the original day cell structure
  return (
    <div
      ref={setNodeRef} // Assign droppable ref
      key={dayIndex} // Use passed dayIndex for key
      className="group/row" // Keep original class
    >
      {/* Keep original sr-only heading */}
      <h2 className="sr-only">
        {sortedEvents.length === 0 ? "No events, " :
          sortedEvents.length === 1 ? "1 event, " :
            `${sortedEvents.length} events, `}
        {cell.date.format('dddd, MMMM D')}
      </h2>
      {/* Map over visibleEvents and render DraggableEvent */}
      {visibleEvents.map((event) => (
        <DraggableEvent
          key={event.id} // Event ID is the key for draggable items
          event={event}
          cellDate={cell.date}
          eventHeight={eventHeight}
          eventGap={eventGap}
        />
      ))}
      {/* Keep original "+N more" button logic/rendering */}
      {hiddenEventsCount > 0 && (
        <div
          style={{
            '--event-top': `${visibleEvents.length * (eventHeight + eventGap)}px`,
            '--event-height': `${eventHeight}px`,
          } as React.CSSProperties}
          className="absolute left-[var(--event-left)] top-[var(--event-top)] w-[calc((100%/7)-1px)] px-0.5 in-data-[multiweek=previous]:ps-0 in-data-[multiweek=next]:pe-0 in-data-[multiweek=both]:px-0"
        >
          <button className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded data-[multiweek=previous]:rounded-s-none data-[multiweek=next]:rounded-e-none data-[multiweek=both]:rounded-none">
            <span className="truncate">+{hiddenEventsCount}<span className="max-sm:sr-only"> more</span></span>
          </button>
        </div>
      )}
    </div>
  );
}