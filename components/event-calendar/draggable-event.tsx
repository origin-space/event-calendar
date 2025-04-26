import { CalendarEventProps } from "./types/calendar";
import { getEventInfo } from "./utils/calendar";
import { useDraggable } from "@dnd-kit/core";
import { Dayjs } from "dayjs";

interface DraggableEventProps {
  event: CalendarEventProps;
  cellDate: Dayjs;
  isBeingDragged: boolean;
  renderEvent: (event: CalendarEventProps, cellDate: Dayjs) => React.ReactNode;
  eventHeight: number;
  eventGap: number;
}

export function DraggableEvent({ event, cellDate, isBeingDragged, renderEvent, eventHeight, eventGap }: DraggableEventProps) {
  const uniqueSegmentId = `${event.id}-${cellDate.format('YYYY-MM-DD')}`;

  // Calculate topPosition based on the event's slot *before* drag starts
  const initialTopPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;

  // Calculate daysInPreviousWeeks for this specific segment
  const segmentInfo = getEventInfo(event, cellDate);
  const segmentDaysInPrevWeeks = segmentInfo.show ? segmentInfo.daysInPreviousWeeks : 0;

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: uniqueSegmentId,
    data: {
      event: event,
      type: 'event',
      dragDate: cellDate.toISOString(),
      initialTopPosition: initialTopPosition,
      segmentDaysInPrevWeeks: segmentDaysInPrevWeeks,
    },
  });

  // Apply listeners and attributes
  // Apply transitions for opacity and scale on drag start/end
  const style: React.CSSProperties = isBeingDragged
    ? { opacity: 0.2, transition: 'opacity 0.15s ease-out' } // Simplified transition
    : { opacity: 1, transition: 'opacity 0.15s ease-out' };

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      {/* Render event normally, isDragging is not needed here anymore for styling */}
      {renderEvent(event, cellDate)}
    </div>
  );
}