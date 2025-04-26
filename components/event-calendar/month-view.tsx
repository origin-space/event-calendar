import React, { useMemo, useState, useRef } from "react"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragEndEvent,
  type Active,
  type Over,
  CollisionDetection,
  pointerWithin,
  useDraggable, // Added useDraggable
  useDroppable, // Added useDroppable
  DragOverlay,
  closestCorners, // Import DragOverlay
} from "@dnd-kit/core"
import dayjs from "dayjs"
import isBetween from 'dayjs/plugin/isBetween'; // Import isBetween plugin

// Apply the plugin
dayjs.extend(isBetween);

import { useEventVisibility } from "./hooks/use-event-visibility"
import { type CalendarViewProps, CalendarEventProps } from './types/calendar'
import { getDaysInMonth, getWeekDayNames, getEventInfo, calculateWeeklyEventLayout, getDayVisibilityData, calculateHiddenIdsForWeek } from './utils/calendar'

// --- Draggable Event Component ---
interface DraggableEventProps {
  event: CalendarEventProps;
  cellDate: dayjs.Dayjs;
  isBeingDragged: boolean;
  renderEvent: (event: CalendarEventProps, cellDate: dayjs.Dayjs, isProjection?: boolean, isDragging?: boolean) => React.ReactNode;
  eventHeight: number; // Added: Needed for position calculation
  eventGap: number; // Added: Needed for position calculation
}

function DraggableEvent({ event, cellDate, isBeingDragged, renderEvent, eventHeight, eventGap }: DraggableEventProps) {
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
      segmentDaysInPrevWeeks: segmentDaysInPrevWeeks, // Store the segment-specific value
    },
  });

  // Apply listeners and attributes
  // Apply transitions for opacity and scale on drag start/end
  const style: React.CSSProperties = isBeingDragged
    ? { opacity: 0.2, transition: 'opacity 0.15s ease-out, transform 0.15s ease-out' } // Fade out and shrink slightly
    : { opacity: 1, transition: 'opacity 0.15s ease-out, transform 0.15s ease-out' }; // Fade in and grow back

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      {/* Render event normally, isDragging is not needed here anymore for styling */}
      {renderEvent(event, cellDate, false, false)}
    </div>
  );
}

// --- Droppable Cell Component ---
interface DroppableCellProps {
  cellDate: dayjs.Dayjs;
  children: React.ReactNode;
}

function DroppableCell({ cellDate, children }: DroppableCellProps) {
  const { setNodeRef } = useDroppable({
    id: `cell-${cellDate.format('YYYY-MM-DD')}`,
    data: {
      date: cellDate.toISOString(), // Store the date this cell represents
      type: 'cell',
    },
  });

  return (
    <div ref={setNodeRef} className="group/row">
      {children}
    </div>
  );
}


// --- MonthView Component ---
export function MonthView({ currentDate, events = [], eventHeight = 24, eventGap = 2, onEventUpdate }: CalendarViewProps) {
  const weekDays = getWeekDayNames()
  const weeks = getDaysInMonth(currentDate)

  const { contentRef, getVisibleEventCount } = useEventVisibility({
    eventHeight: eventHeight,
    eventGap: eventGap,
  });

  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null)
  const [currentOverDate, setCurrentOverDate] = useState<dayjs.Dayjs | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  )

  const weeklyLayouts = useMemo(() => {
    const layouts = new Map<string, CalendarEventProps[]>();
    if (!weeks || weeks.length === 0) {
        return layouts;
    }
    weeks.forEach(week => {
      if (week && week.length > 0 && week[0]?.date) {
        const weekStartDate = week[0].date.startOf('week');
        const layoutForWeek = calculateWeeklyEventLayout(events, weekStartDate);
        layouts.set(weekStartDate.format('YYYY-MM-DD'), layoutForWeek);
      }
    });
    return layouts;
  }, [events, weeks]);

  const visibleCount = getVisibleEventCount();

  const offsetRef = useRef<number | null>(null);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    // Check the type from data, as id is now compound
    if (event.active.data.current?.type === 'event') {
      setActiveDragItem(event.active) // Store the full active object
      setCurrentOverDate(null)
    // Reset the offset when a new drag starts
    offsetRef.current = null;
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event

    // If we don't have a valid over target or active item, exit early
    if (!over?.data?.current?.type || !active?.data?.current?.type) {
      return;
    }

    // Calculate offset only once during a drag operation
    if (offsetRef.current === null && over?.data?.current?.type === 'cell') {
      const startDate = active?.data?.current?.event.start;
      const grabDate = over?.data?.current?.date;      

      if (startDate && grabDate) {
        // Calculate the offset between dragDate and grabDate, ignoring time
        const startDateObj = dayjs(startDate).startOf('day'); // Set to start of day
        const grabDateObj = dayjs(grabDate).startOf('day');   // Set to start of day
        offsetRef.current = grabDateObj.diff(startDateObj, 'day'); // Now calculates calendar day difference
      }
    }

    // Use the offset value in your drag logic
    const currentOffset = offsetRef.current;    

    // Update the current over date for projection rendering
    if (over?.data?.current?.type === 'cell') {
      const overDate = dayjs(over.data.current.date);

      // If we have an offset, subtract it from the over date
      if (currentOffset !== null) {
        // Subtract the offset from the over date
        setCurrentOverDate(overDate.subtract(currentOffset, 'day'));
      } else {
        // If no offset yet, just use the over date as is
        setCurrentOverDate(overDate);
      }
    } else {
      // If hovering over something else (like another event), clear the date
      setCurrentOverDate(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // Ensure we dropped onto a cell and were dragging an event
    if (over?.data?.current?.type === 'cell' && active.data.current?.type === 'event' && active.data.current?.event) {
      const originalEvent = active.data.current.event as CalendarEventProps
      const originalStartDate = dayjs(originalEvent.start)
      const dropDate = dayjs(over.data.current.date)

      // Use the stored offset if available
      const currentOffset = offsetRef.current;
      const newStartDate = dropDate.subtract(currentOffset || 0, 'day')
      const duration = dayjs(originalEvent.end).diff(originalEvent.start)
      const newEndDate = newStartDate.add(duration)

      if (onEventUpdate && !newStartDate.isSame(originalStartDate, 'day')) {
        onEventUpdate({
          ...originalEvent,
          start: newStartDate.toDate(),
          end: newEndDate.toDate(),
        })
      }
    }

    // Reset all drag state
    setActiveDragItem(null)
    setCurrentOverDate(null)
    offsetRef.current = null; // Reset the offset ref
  }

  // --- Render Logic ---
  // Added activeDragItemForOverlay: Active | null = null
  const renderEvent = (
    event: CalendarEventProps,
    cellDate: dayjs.Dayjs,
    isProjection = false,
    isDragging = false,
    isOverlay = false,
    activeDragItemForOverlay: Active | null = null // Add optional param for overlay context
  ) => {
    const { left, width, days = 1, isStartDay, isMultiDay, multiWeek, show } = getEventInfo(event, cellDate)
    // Calculate topPosition normally for grid elements
    const gridTopPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;

    // Retrieve stored position for overlay, otherwise use grid calculation
    const topPosition = isOverlay
        ? activeDragItemForOverlay?.data.current?.initialTopPosition ?? 0
        : gridTopPosition;

    // Opacity only for the overlay item now, original is hidden via visibility
    const opacityClass = isDragging && isOverlay ? 'opacity-75' : ''; // Example: slightly transparent overlay
    // Projections should not block pointer events and be fully opaque
    const pointerEventsClass = isProjection || isOverlay ? 'pointer-events-none' : ''; // Overlay shouldn't block pointer events either

    // --- Conditional Rendering based on context ---
    if (isOverlay) {
      // Retrieve the stored daysInPreviousWeeks for the specific segment that was dragged
      const daysInPrevWeeks = activeDragItemForOverlay?.data.current?.segmentDaysInPrevWeeks ?? 0;
      console.log(daysInPrevWeeks);
      // Render simplified version for DragOverlay
      return (
        <div
          style={{
            transform: `translateX(-${daysInPrevWeeks * 100}%)`,
          }}
        >
          <div
            style={{
              height: `${eventHeight}px`,
              width: `${100*days}%`,
              // Apply the retrieved topPosition
              position: 'relative', // Ensure positioning context if needed by style below
              top: `${topPosition}px` // Use standard top property
            }} // Use fixed height
            // Keep original overlay styles
            className={`px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded shadow-lg opacity-75 ${pointerEventsClass}`}
            title={event.title}
          >
            <span className="truncate">{event.title}</span>
          </div>
        </div>
      );
    } else {
      // Render standard version for the grid
      return (
        <div
          key={isProjection ? `${event.id}-projection` : event.id}
          style={{
            '--event-left': left,
            '--event-width': width,
            '--event-top': `${gridTopPosition}px`, // Use grid-specific position
            '--event-height': `${eventHeight}px`,
          } as React.CSSProperties}
          // Added transition classes for smooth width/position changes
          className={`absolute left-[var(--event-left)] top-[var(--event-top)] w-[calc(var(--event-width)-1px)] data-[multiweek=next]:w-(--event-width) px-0.5 data-[multiweek=previous]:ps-0 data-[multiweek=next]:pe-0 data-[multiweek=both]:px-0 group-last/row:w-(--event-width) ${pointerEventsClass} transition-all duration-200 ease-out`} // Removed opacityClass here, handled by DraggableEvent visibility
          title={event.title}
          data-cell-slot={event.cellSlot}
        data-start-day={isStartDay || undefined}
        data-multiday={isMultiDay || undefined}
        data-multiweek={multiWeek}
        data-hidden={!show || undefined}
        data-projection={isProjection || undefined}
      >
          {/* Inner content - structure remains similar */}
          <div className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded in-data-[multiweek=previous]:rounded-s-none in-data-[multiweek=next]:rounded-e-none in-data-[multiweek=both]:rounded-none in-data-[hidden=true]:sr-only">
            <span className="truncate">{event.title}</span>
          </div>
        </div>
      );
    }
  }

  // Find the full event object being dragged
  const activeDraggedEvent = useMemo(() => {
    if (!activeDragItem || activeDragItem.data.current?.type !== 'event') return null;
    const draggedEventObject = activeDragItem.data.current?.event as CalendarEventProps | undefined;
    if (!draggedEventObject) return null;
    return events.find(e => e.id === draggedEventObject.id);
  }, [activeDragItem, events]);

  // Calculate the potential drop range for highlighting cells
  const potentialDropRange = useMemo(() => {
    if (!activeDraggedEvent || !currentOverDate) return null;

    const originalStartDate = dayjs(activeDraggedEvent.start);
    const newStartDate = currentOverDate; // Already offset-adjusted
    const duration = dayjs(activeDraggedEvent.end).diff(originalStartDate);
    const newEndDate = newStartDate.add(duration);

    return { start: newStartDate, end: newEndDate };
  }, [activeDraggedEvent, currentOverDate]);


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
            const hiddenIdsThisWeek = calculateHiddenIdsForWeek(week, layoutForThisWeek, visibleCount);

            return (
              <div key={weekIndex} className="flex flex-col relative not-last:border-b">
                {/* Background grid cells */}
                <div className="absolute inset-0 grid grid-cols-7" aria-hidden="true">
                  {week.map((cell, dayIndex) => {
                    // Check if this cell falls within the potential drop range
                    const isPotentialDropTarget = potentialDropRange && cell.date.isBetween(potentialDropRange.start, potentialDropRange.end, 'day', '[]');
                    const highlightClass = isPotentialDropTarget ? 'bg-gray-200' : ''; // Subtle gray highlight

                    return (
                      <span
                        key={dayIndex}
                        className={`not-last:border-e p-2 data-[today]:bg-blue-50 data-[outside-month]:bg-gray-50 data-[outside-month]:text-gray-400 overflow-hidden flex flex-col ${highlightClass}`} // Add highlight class
                        data-today={cell.isToday || undefined}
                        data-outside-month={!cell.isCurrentMonth || undefined}
                        data-potential-drop={isPotentialDropTarget || undefined} // Optional data attribute
                      >
                        <span className="text-sm font-medium">{cell.date.date()}</span>
                      </span>
                    );
                  })}
                </div>
                {/* Foreground grid for events and drop zones */}
                <div className="relative flex-1 grid grid-cols-7 mt-8" ref={weekIndex === 0 ? contentRef : null}>
                  {week.map((cell, dayIndex) => {
                    const { visibleEvents, hiddenEventsCount, sortedEvents } = getDayVisibilityData(
                        cell.date,
                        layoutForThisWeek,
                        hiddenIdsThisWeek,
                        visibleCount
                    );

                    return (
                      <DroppableCell key={dayIndex} cellDate={cell.date}>
                        <>
                          <h2 className="sr-only">
                            {sortedEvents.length === 0 ? "No events, " :
                            sortedEvents.length === 1 ? "1 event, " :
                            `${sortedEvents.length} events, `}
                            {cell.date.format('dddd, MMMM D')}
                          </h2>

                          {/* Render actual draggable events */}
                          {visibleEvents.map((event) => {
                            // Check if the *event* (not segment) is being dragged
                            const isEventBeingDragged = activeDragItem?.data.current?.event?.id === event.id;
                            const uniqueSegmentKey = `${event.id}-${cell.date.format('YYYY-MM-DD')}`;
                            return (
                              <DraggableEvent
                                key={uniqueSegmentKey}
                                event={event}
                                cellDate={cell.date}
                                isBeingDragged={isEventBeingDragged}
                                renderEvent={renderEvent}
                                eventHeight={eventHeight} // Pass prop
                                eventGap={eventGap} // Pass prop
                              />
                            );
                          })}

                          {/* Hidden events count */}
                          {hiddenEventsCount > 0 && (
                            <div
                              // Revert to original positioning and styles for hidden count
                              style={{
                                '--event-top': `${visibleCount * (eventHeight + eventGap)}px`,
                                '--event-height': `${eventHeight}px`,
                              } as React.CSSProperties}
                              className="absolute left-[var(--event-left)] top-[var(--event-top)] w-[calc((100%/7)-1px)] px-0.5 in-data-[multiweek=previous]:ps-0 in-data-[multiweek=next]:pe-0 in-data-[multiweek=both]:px-0"
                            >
                              <button className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded data-[multiweek=previous]:rounded-s-none data-[multiweek=next]:rounded-e-none data-[multiweek=both]:rounded-none" tabIndex={-1}>
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
      {/* Drag Overlay for the event being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem && activeDraggedEvent ? (
          // Render the event using the overlay-specific logic in renderEvent
          renderEvent(
            activeDraggedEvent,
            dayjs(activeDraggedEvent.start), // Use original start date for rendering appearance
            false, // Not a projection
            true,  // Indicate it's being dragged
            true,  // Indicate it's rendering in the overlay
            activeDragItem // Pass activeDragItem to access initialTopPosition
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
