import { useState, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { 
  type DragStartEvent, 
  type DragOverEvent, 
  type DragEndEvent, 
  type Active 
} from '@dnd-kit/core';
import { type CalendarEventProps } from '../types/calendar';

interface UseEventDragProps {
  events: CalendarEventProps[];
  onEventUpdate?: (event: CalendarEventProps) => void;
}

export function useEventDrag({ events, onEventUpdate }: UseEventDragProps) {
  // Currently active item being dragged
  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null);

  // Reference to track the day offset between where an event was grabbed and its start date
  const offsetRef = useRef<number | null>(null);

  // Potential start date if the dragged item were dropped at the current hover position
  const [potentialStartDate, setPotentialStartDate] = useState<dayjs.Dayjs | null>(null);

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
   * Calculate the potential new date range for the dragged event
   */
  const potentialDropRange = useMemo(() => {
    if (!activeDraggedEvent || !potentialStartDate) return null;

    const originalEventDuration = dayjs(activeDraggedEvent.end).diff(dayjs(activeDraggedEvent.start));
    const newPotentialEndDate = potentialStartDate.add(originalEventDuration);

    return { start: potentialStartDate, end: newPotentialEndDate }; 
  }, [activeDraggedEvent, potentialStartDate]);

  /**
   * Handle the start of a drag operation
   */
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.event) {
      setActiveDragItem(event.active);
      setPotentialStartDate(null);
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
      setPotentialStartDate(null);
      return;
    }

    // Clear potential start date if not hovering over a droppable cell
    if (!over?.data?.current?.date) {
      setPotentialStartDate(null);
      return;
    }

    // Calculate the offset between grab point and event start date (only once per drag)
    if (offsetRef.current === null && over.data.current.date && active.data.current.event) {
      const startDate = active.data.current.event.start;
      const grabDate = over.data.current.date;
      if (startDate && grabDate) {
        const startDateObj = dayjs(startDate).startOf('day');
        const grabDateObj = dayjs(grabDate).startOf('day');
        offsetRef.current = grabDateObj.diff(startDateObj, 'day');
      }
    }

    // Update the potential start date based on the cell being hovered over
    if (over.data.current.date) {
      const overDate = dayjs(over.data.current.date).startOf('day');
      const currentOffset = offsetRef.current || 0;

      // Calculate the potential start date by subtracting the offset from the hovered date
      const newPotentialStartDate = overDate.subtract(currentOffset, 'day');
      setPotentialStartDate(newPotentialStartDate);
    } else {
      setPotentialStartDate(null);
    }
  };

  /**
   * Handle the end of a drag operation
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Check if dropped over a cell and dragging an event
    if (over?.data?.current?.date && active.data.current?.event) {
      const originalEvent = active.data.current.event as CalendarEventProps;
      const originalStartDateDayOnly = dayjs(originalEvent.start).startOf('day');

      // Use the final potentialStartDate calculated during dragOver
      const finalPotentialDropDate = potentialStartDate;

      // Only update if the drop target is valid and the date actually changed
      if (onEventUpdate && finalPotentialDropDate && !finalPotentialDropDate.isSame(originalStartDateDayOnly, 'day')) {
        const duration = dayjs(originalEvent.end).diff(dayjs(originalEvent.start));
        
        // Preserve original time
        const originalStartTime = dayjs(originalEvent.start);
        const newStartDateTime = finalPotentialDropDate
          .hour(originalStartTime.hour())
          .minute(originalStartTime.minute())
          .second(originalStartTime.second())
          .millisecond(originalStartTime.millisecond());

        const newEndDateTime = newStartDateTime.add(duration);

        onEventUpdate({
          ...originalEvent,
          start: newStartDateTime.toDate(),
          end: newEndDateTime.toDate(),
        });
      }
    }

    // Reset drag state regardless of drop success
    setActiveDragItem(null);
    setPotentialStartDate(null);
    offsetRef.current = null;
  };

  return {
    activeDragItem,
    activeDraggedEvent,
    potentialStartDate,
    potentialDropRange,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}
