import { useState, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  type DragStartEvent, 
  type DragOverEvent, 
  type DragEndEvent, 
  type Active,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type CollisionDetection
} from '@dnd-kit/core';
import { type CalendarEventProps } from './types/calendar';

/**
 * Hook to provide common DnD configuration
 */
export function useCalendarDndConfig() {
  // Configure drag sensors with activation constraints
  // The distance constraint prevents accidental drags on small movements
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  // Use pointerWithin as the default collision detection algorithm
  const collisionDetection = pointerWithin;

  return {
    sensors,
    collisionDetection
  };
}

/**
 * A reusable hook for handling drag-and-drop operations for calendar events
 */
export function useCalendarDnd({
  events,
  onEventUpdate,
}: {
  events: CalendarEventProps[];
  onEventUpdate?: (event: CalendarEventProps) => void;
}) {
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
   * Calculate the potential new date range for the dragged event based on the potential start date.
   * This is used to highlight cells that would be covered by the event if dropped.
   */
  const potentialDropRange = useMemo(() => {
    if (!activeDraggedEvent || !potentialStartDate) return null;

    const originalEventDuration = dayjs(activeDraggedEvent.end).diff(dayjs(activeDraggedEvent.start));
    const newPotentialEndDate = potentialStartDate.add(originalEventDuration);

    return { start: potentialStartDate, end: newPotentialEndDate }; 
  }, [activeDraggedEvent, potentialStartDate]);

  /**
   * Handle the start of a drag operation
   * Sets the active drag item and resets related state
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
   * Maintains the offset between where the event was grabbed and its start date
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
    
    // Make sure we're only handling all-day events in this hook
    // If the target is not an all-day slot, don't update the potential date
    if (over.data.current.isAllDaySlot === false) {
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
   * Updates the event with new dates if dropped on a valid target
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Check if dropped over a cell ('date' property) and dragging an event ('event' property)
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

/**
 * A specialized hook for handling timed events in the week view
 */
export function useTimedEventDnd({
  events,
  onEventUpdate,
}: {
  events: CalendarEventProps[];
  onEventUpdate?: (event: CalendarEventProps) => void;
}) {
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
    
    // Make sure we're only handling timed events in this hook
    // If the event is an all-day event or the target is an all-day slot, don't update
    const draggedEvent = active.data.current.event as CalendarEventProps;
    if (draggedEvent.allDay || over.data.current.isAllDaySlot) {
      setPotentialStartDateTime(null);
      return;
    }

    // For timed events, we use the dateTime property instead of date
    if (over.data.current.dateTime) {
      setPotentialStartDateTime(dayjs(over.data.current.dateTime));
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

      // Only update if the drop target is valid and the time actually changed
      if (onEventUpdate && finalPotentialDropDateTime && 
          !finalPotentialDropDateTime.isSame(originalStartDateTime)) {
        
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
