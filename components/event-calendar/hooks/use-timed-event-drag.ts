import { useState, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { 
  type DragStartEvent, 
  type DragOverEvent, 
  type DragEndEvent, 
  type Active 
} from '@dnd-kit/core';
import { type CalendarEventProps } from '../types/calendar';
import { WeekCellsHeight, StartHour } from '../constants';

interface UseTimedEventDragProps {
  events: CalendarEventProps[];
  onEventUpdate?: (event: CalendarEventProps) => void;
}

export function useTimedEventDrag({ events, onEventUpdate }: UseTimedEventDragProps) {
  // Currently active item being dragged
  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null);

  // Reference to track the minute offset between where an event was grabbed and its start time
  const offsetRef = useRef<number | null>(null);

  // Potential start date/time if the dragged item were dropped at the current hover position
  const [potentialStartDateTime, setPotentialStartDateTime] = useState<dayjs.Dayjs | null>(null);

  /**
   * Find the full event object for the currently dragged item
   */
  const activeDraggedEvent = useMemo(() => {
    if (!activeDragItem || !activeDragItem.data.current?.event) return null;
    const draggedEventObject = activeDragItem.data.current.event as CalendarEventProps | undefined;
    // Find the event from the main events array to ensure we have the latest version
    return events.find(e => e.id === draggedEventObject?.id);
  }, [activeDragItem, events]);

  /**
   * Handle the start of a drag operation
   */
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.event) {
      setActiveDragItem(event.active);
      setPotentialStartDateTime(null);
      offsetRef.current = null;
    }
  };

  /**
   * Handle drag over events to calculate potential drop positions
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;

    // Ensure we have an active item and it's an event
    if (!active?.data?.current?.event) {
      setPotentialStartDateTime(null);
      return;
    }

    // Clear potential start date if not hovering over a droppable time slot
    if (!over?.data?.current?.dateTime) {
      setPotentialStartDateTime(null);
      return;
    }

    // Calculate the offset between grab point and event start time (only once per drag)
    if (offsetRef.current === null && over.data.current.dateTime && active.data.current.event) {
      const eventStartDateTime = dayjs(active.data.current.event.start);
      
      // For timed events, we need to calculate the time offset
      const initialGrabPixelPosition = active.data.current.initialTopPosition as number;
      const hoursFromTop = initialGrabPixelPosition / WeekCellsHeight; // Convert pixels to hours
      const initialGrabTime = dayjs(active.data.current.dragDate)
                              .hour(StartHour) // Calendar's visual start hour
                              .add(hoursFromTop * 60, 'minute'); // Convert hour offset to minutes and add
      
      offsetRef.current = initialGrabTime.diff(eventStartDateTime, 'minute'); // Offset in minutes
    }

    // Update the potential start date/time based on the time slot being hovered over
    if (over.data.current.dateTime) {
      const overDateTime = dayjs(over.data.current.dateTime);
      const currentOffsetMinutes = offsetRef.current || 0;

      // Calculate the potential start date/time by subtracting the offset from the hovered date/time
      const newPotentialStartDateTime = overDateTime.subtract(currentOffsetMinutes, 'minute');
      setPotentialStartDateTime(newPotentialStartDateTime);
    } else {
      setPotentialStartDateTime(null);
    }
  };

  /**
   * Handle the end of a drag operation
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Check if dropped over a time slot and dragging an event
    if (over?.data?.current?.dateTime && active.data.current?.event) {
      const originalEvent = active.data.current.event as CalendarEventProps;
      const originalStartDateTime = dayjs(originalEvent.start);

      // Use the final potentialStartDateTime calculated during dragOver
      const finalPotentialDropDateTime = potentialStartDateTime;

      // Only update if the drop target is valid and the time actually changed by at least a minute
      if (onEventUpdate && finalPotentialDropDateTime && 
          Math.abs(finalPotentialDropDateTime.diff(originalStartDateTime, 'minute')) > 0) {
        
        const duration = dayjs(originalEvent.end).diff(originalEvent.start); // Duration in milliseconds
        const newEndDateTime = finalPotentialDropDateTime.add(duration, 'millisecond');

        onEventUpdate({
          ...originalEvent,
          start: finalPotentialDropDateTime.toDate(),
          end: newEndDateTime.toDate(),
        });
      }
    }

    // Reset drag state regardless of drop success
    setActiveDragItem(null);
    setPotentialStartDateTime(null);
    offsetRef.current = null;
  };

  return {
    activeDragItem,
    activeDraggedEvent,
    potentialStartDateTime,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}
