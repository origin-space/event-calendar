import React, { useMemo, useState, useRef } from "react"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type Active,
  pointerWithin,
  DragOverlay,
} from "@dnd-kit/core"
import { DraggableEvent } from "./draggable-event"
import { DroppableCell } from "./droppable-cell"
import dayjs from "dayjs"
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

import { useEventVisibility } from "./hooks/use-event-visibility"
import { type CalendarViewProps, CalendarEventProps, type CalendarCell } from './types/calendar'
import { getDaysInMonth, getWeekDayNames, calculateWeeklyEventLayout, getDayVisibilityData, calculateHiddenIdsForWeek } from './utils/calendar'
import { EventItem } from "./event-item";

export function MonthView({
  currentDate,
  events = [],
  eventHeight = 24,
  eventGap = 2,
  onEventUpdate
}: CalendarViewProps) {
  
  //Get weekday names for the header row
  const weekDays = getWeekDayNames()

  // Generate the calendar grid structure based on current month
  const weeks = getDaysInMonth(currentDate)

  // Calculate how many events can be displayed in each cell based on available height
  const { contentRef, getVisibleEventCount } = useEventVisibility({
    eventHeight,
    eventGap,
  });

  // Get the number of events that can be displayed in each cell
  const visibleCount = getVisibleEventCount();

  /**
   * Reference to track the day offset between where an event was grabbed and its start date
   * This ensures events can be grabbed from any day they span and maintain proper positioning
   */
  const offsetRef = useRef<number | null>(null);

  // Currently active item being dragged
  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null)

  // Potential start date if the dragged item were dropped at the current hover position (adjusted for grab offset)
  const [potentialStartDate, setPotentialStartDate] = useState<dayjs.Dayjs | null>(null)

  /**
   * Configure drag sensors with activation constraints
   * The distance constraint prevents accidental drags on small movements
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  )

  /**
   * Calculate and memoize the layout of events for each week
   * This organizes events into rows to prevent overlapping
   */
  const weeklyLayouts = useMemo(() => {
    const layouts = new Map<string, CalendarEventProps[]>();
    if (!weeks || weeks.length === 0) {
      return layouts;
    }

    weeks.forEach((week: CalendarCell[]) => {
      if (week && week.length > 0 && week[0]?.date) {
        const weekStartDate = week[0].date.startOf('week');
        const layoutForWeek = calculateWeeklyEventLayout(events, weekStartDate);
        layouts.set(weekStartDate.format('YYYY-MM-DD'), layoutForWeek);
      }
    });

    return layouts;
  }, [events, weeks]);

  /**
   * Find the full event object for the currently dragged item
   * This provides access to all event properties during drag operations
   */
  const activeDraggedEvent = useMemo(() => {
    if (!activeDragItem || activeDragItem.data.current?.type !== 'event') return null;
    const draggedEventObject = activeDragItem.data.current?.event as CalendarEventProps | undefined;
    return events.find(e => e.id === draggedEventObject?.id);
  }, [activeDragItem, events]);

  /**
   * Calculate the potential new date range for the dragged event based on the potential start date.
   * This is used to highlight cells that would be covered by the event if dropped.
   */
  const potentialDropRange = useMemo(() => {
    if (!activeDraggedEvent || !potentialStartDate) return null;

    const originalStartDate = dayjs(activeDraggedEvent.start);
    const duration = dayjs(activeDraggedEvent.end).diff(originalStartDate); // Calculate duration
    const newEndDate = potentialStartDate.add(duration); // Calculate potential end date

    return { start: potentialStartDate, end: newEndDate };
  }, [activeDraggedEvent, potentialStartDate]);


  /**
   * Handle the start of a drag operation
   * Sets the active drag item and resets related state
   */
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'event') {
      setActiveDragItem(event.active)
      setPotentialStartDate(null) // Reset potential start date
      offsetRef.current = null; // Reset offset
    }
  }

  /**
   * Handle drag over events to calculate potential drop positions
   * Maintains the offset between where the event was grabbed and its start date
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event

    // Clear potential start date if not over a valid target or no active item
    if (!over || !active?.data?.current?.type) {
      setPotentialStartDate(null);
      if (!over) return; // Exit if not hovering over anything
    }

    // Ensure we are dragging an event
    if (active.data.current?.type !== 'event') return;

    // Calculate the offset between grab point and event start date (only once per drag)
    if (offsetRef.current === null && over?.data?.current?.type === 'cell' && active.data.current?.type === 'event') {
      const startDate = active?.data?.current?.event.start;
      const grabDate = over?.data?.current?.date;
      if (startDate && grabDate) {
        const startDateObj = dayjs(startDate).startOf('day');
        const grabDateObj = dayjs(grabDate).startOf('day');
        offsetRef.current = grabDateObj.diff(startDateObj, 'day');
      }
    }

    // Update the potential start date based on the cell being hovered over and the calculated offset
    if (over?.data?.current?.type === 'cell') {
      const overDate = dayjs(over.data.current.date).startOf('day'); // Date of the cell being hovered
      const currentOffset = offsetRef.current; // Offset calculated above

      // Calculate the potential start date by subtracting the offset from the hovered date
      const newPotentialStartDate = currentOffset !== null ? overDate.subtract(currentOffset, 'day') : overDate;
      setPotentialStartDate(newPotentialStartDate);
    } else {
      // If not hovering over a cell, clear the potential start date
      setPotentialStartDate(null)
    }
  }

  /**
   * Handle the end of a drag operation
   * Updates the event with new dates if dropped on a valid target
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over?.data?.current?.type === 'cell' && active.data.current?.type === 'event' && active.data.current?.event) {
      const originalEvent = active.data.current.event as CalendarEventProps;
      const originalStartDate = dayjs(originalEvent.start).startOf('day');

      // Use the final potentialStartDate calculated during dragOver
      const finalPotentialStartDate = potentialStartDate;

      // Only update if the drop target is valid and the date actually changed
      if (onEventUpdate && finalPotentialStartDate && !finalPotentialStartDate.isSame(originalStartDate, 'day')) {
        const duration = dayjs(originalEvent.end).diff(originalEvent.start); // Calculate duration
        const newEndDate = finalPotentialStartDate.add(duration); // Calculate new end date
        onEventUpdate({
          ...originalEvent,
          start: finalPotentialStartDate.toDate(),
          end: newEndDate.toDate()
        });
      }
    }

    // Reset drag state regardless of drop success
    setActiveDragItem(null);
    setPotentialStartDate(null);
    offsetRef.current = null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div data-slot="month-view" className="flex-1 flex h-full flex-col">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 overflow-hidden">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 min-h-0 grid grid-flow-row auto-rows-[minmax(85px,_1fr)]">
          {weeks.map((week, weekIndex) => {
            const weekStartDateStr = week[0]?.date?.startOf('week').format('YYYY-MM-DD');
            const layoutForThisWeek = weekStartDateStr ? weeklyLayouts.get(weekStartDateStr) || [] : [];
            const hiddenIdsThisWeek = calculateHiddenIdsForWeek(week as CalendarCell[], layoutForThisWeek, visibleCount) as Set<string>;

            return (
              <div key={weekIndex} className="flex flex-col relative not-last:border-b">
                {/* Background grid cells */}
                <div className="absolute inset-0 grid grid-cols-7" aria-hidden="true">
                  {week.map((cell, dayIndex) => {
                    const isPotentialDropTarget = potentialDropRange && cell.date.isBetween(potentialDropRange.start, potentialDropRange.end, 'day', '[]');

                    return (
                      <span
                        key={dayIndex}
                        className="not-last:border-e p-2 data-[today]:bg-blue-50 data-[outside-month]:bg-gray-50 data-[outside-month]:text-gray-400 overflow-hidden flex flex-col data-[potential-drop=true]:bg-gray-100"
                        data-today={cell.isToday || undefined}
                        data-outside-month={!cell.isCurrentMonth || undefined}
                        data-potential-drop={isPotentialDropTarget || undefined}
                      >
                        <span className="text-sm font-medium">{cell.date.date()}</span>
                      </span>
                    );
                  })}
                </div>
                {/* Foreground grid for events and drop zones */}
                <div className="relative flex-1 grid grid-cols-7">
                  {week.map((cell, dayIndex) => {
                    const { visibleEvents, hiddenEventsCount, sortedEvents } = getDayVisibilityData(
                      cell.date,
                      layoutForThisWeek,
                      hiddenIdsThisWeek,
                      visibleCount
                    );

                    return (
                      <DroppableCell key={dayIndex} cellDate={cell.date} ref={weekIndex === 0 && dayIndex === 0 ? contentRef : null}>
                        <>
                          <h2 className="sr-only">
                            {sortedEvents.length === 0 ? "No events, " :
                              sortedEvents.length === 1 ? "1 event, " :
                                `${sortedEvents.length} events, `}
                            {cell.date.format('dddd, MMMM D')}
                          </h2>

                          {visibleEvents.map((event) => {
                            const isEventBeingDragged = activeDragItem?.data.current?.event?.id === event.id;
                            const uniqueSegmentKey = `${event.id}-${cell.date.format('YYYY-MM-DD')}`;
                            return (
                              <DraggableEvent
                                key={uniqueSegmentKey}
                                event={event}
                                cellDate={cell.date}
                                renderEvent={() => (
                                  <EventItem
                                    event={event}
                                    cellDate={cell.date}
                                    eventHeight={eventHeight}
                                    eventGap={eventGap}
                                  />
                                )}
                                eventHeight={eventHeight}
                                eventGap={eventGap}
                              />
                            );
                          })}
                          {/* More events button */}
                          {hiddenEventsCount > 0 && (
                            <div
                              style={{
                                '--event-top': `${(visibleCount - 1) * (eventHeight + eventGap)}px`,
                                '--event-height': `${eventHeight}px`,
                              } as React.CSSProperties}
                              className="absolute left-0 top-[var(--event-top)] w-full px-0.5"
                            >
                              <button className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-gray-200 text-gray-700 rounded cursor-default">
                                <span className="truncate">+{hiddenEventsCount}<span className="max-sm:sr-only"> more</span></span>
                              </button>
                            </div>
                          )}
                        </>
                      </DroppableCell>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem && activeDraggedEvent ? (
          <EventItem
            event={activeDraggedEvent}
            cellDate={dayjs(activeDraggedEvent.start)}
            isOverlay={true}
            activeDragItemForOverlay={activeDragItem}
            eventHeight={eventHeight}
            eventGap={eventGap}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
