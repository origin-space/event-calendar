import { CalendarEventProps } from "./types/calendar";
import { getEventInfo } from "./utils/calendar";
import { useDraggable } from "@dnd-kit/core";
import { Dayjs } from "dayjs";

interface DraggableEventProps {
  event: CalendarEventProps;
  cellDate: Dayjs;
  renderEvent: (event: CalendarEventProps, cellDate: Dayjs) => React.ReactNode;
  eventHeight: number;
  eventGap: number;
}

export function DraggableEvent({ event, cellDate, renderEvent, eventHeight, eventGap }: DraggableEventProps) {
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
      dragDate: cellDate.toISOString(),
      initialTopPosition: initialTopPosition,
      segmentDaysInPrevWeeks: segmentDaysInPrevWeeks,
    },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {/* Render event normally, isDragging is not needed here anymore for styling */}
      {renderEvent(event, cellDate)}
    </div>
  );
}
