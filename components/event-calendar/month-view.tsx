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
} from "@dnd-kit/core"
import dayjs from "dayjs"

import { useEventVisibility } from "./hooks/use-event-visibility"
import { type CalendarViewProps, CalendarEventProps } from './types/calendar'
import { getDaysInMonth, getWeekDayNames, getEventInfo, calculateWeeklyEventLayout, getDayVisibilityData, calculateHiddenIdsForWeek } from './utils/calendar'

// --- Draggable Event Component ---
interface DraggableEventProps {
  event: CalendarEventProps;
  cellDate: dayjs.Dayjs;
  isBeingDragged: boolean;
  renderEvent: (event: CalendarEventProps, cellDate: dayjs.Dayjs, isProjection?: boolean, isDragging?: boolean) => React.ReactNode;
}

function DraggableEvent({ event, cellDate, isBeingDragged, renderEvent }: DraggableEventProps) {
  const uniqueSegmentId = `${event.id}-${cellDate.format('YYYY-MM-DD')}`;
  const { attributes, listeners, setNodeRef } = useDraggable({ // Removed 'transform'
    id: uniqueSegmentId, // Use unique ID per segment
    data: {
      event: event, // Keep the original event object
      type: 'event',
      dragDate: cellDate.toISOString(), // Store the specific date segment being dragged
    },
  });

  // Apply only listeners and attributes, no transform style
  // Cursor style is handled by dnd-kit automatically based on listeners/attributes
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {/* isDragging prop controls opacity in renderEvent */}
      {renderEvent(event, cellDate, false, isBeingDragged)}
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
    <div ref={setNodeRef} className="h-full w-full">
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
  const renderEvent = (event: CalendarEventProps, cellDate: dayjs.Dayjs, isProjection = false, isDragging = false) => {
    const { left, width, isStartDay, isMultiDay, multiWeek, show } = getEventInfo(event, cellDate)
    const topPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;
    // Apply opacity only to the original event segments being dragged, not the projection
    const opacityClass = isDragging ? 'opacity-50' : '';
    // Projections should not block pointer events and be fully opaque
    const pointerEventsClass = isProjection ? 'pointer-events-none' : '';

    return (
      <div
        key={isProjection ? `${event.id}-projection` : event.id}
        style={{
          '--event-left': left,
          '--event-width': width,
          '--event-top': `${topPosition}px`,
          '--event-height': `${eventHeight}px`,
        } as React.CSSProperties}
        className={`absolute left-[var(--event-left)] top-[var(--event-top)] w-[calc(var(--event-width)-1px)] data-[multiweek=next]:w-(--event-width) px-0.5 data-[multiweek=previous]:ps-0 data-[multiweek=next]:pe-0 data-[multiweek=both]:px-0 group-last/row:w-(--event-width) ${opacityClass} ${pointerEventsClass}`}
        title={event.title}
        data-cell-slot={event.cellSlot}
        data-start-day={isStartDay || undefined}
        data-multiday={isMultiDay || undefined}
        data-multiweek={multiWeek}
        data-hidden={!show || undefined}
        data-projection={isProjection || undefined}
      >
        {/* The button itself is not draggable, the wrapper DraggableEvent handles it */}
        <div className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded in-data-[multiweek=previous]:rounded-s-none in-data-[multiweek=next]:rounded-e-none in-data-[multiweek=both]:rounded-none in-data-[hidden=true]:sr-only">
          <span className="truncate">{event.title}</span>
        </div>
      </div>
    );
  }

  const activeDraggedEvent = useMemo(() => {
    // Find event based on the event object stored in data
    if (!activeDragItem || activeDragItem.data.current?.type !== 'event') return null;
    const draggedEventObject = activeDragItem.data.current?.event as CalendarEventProps | undefined;
    if (!draggedEventObject) return null;
    // Find the corresponding event in the main events array to ensure we have the latest state
    return events.find(e => e.id === draggedEventObject.id);
  }, [activeDragItem, events]);

  const projectionEvent = useMemo(() => {    
    if (!activeDraggedEvent || !currentOverDate) return null;

    const originalStartDate = dayjs(activeDraggedEvent.start);

    // Since currentOverDate already has the offset subtracted in handleDragOver,
    // we can use it directly as the new start date
    const newStartDate = currentOverDate;

    // Calculate the duration of the original event
    const duration = dayjs(activeDraggedEvent.end).diff(originalStartDate);

    // Add the duration to the new start date to get the new end date
    const newEndDate = newStartDate.add(duration);

    // Placeholder for slot calculation - might need refinement
    const projectedLayoutSlot = activeDraggedEvent.cellSlot ?? 0;

    return {
      ...activeDraggedEvent,
      start: newStartDate.toDate(),
      end: newEndDate.toDate(),
      cellSlot: projectedLayoutSlot,
    };
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
                  {week.map((cell, dayIndex) => (
                    <span
                      key={dayIndex}
                      className="not-last:border-e p-2 data-[today]:bg-blue-50 data-[outside-month]:bg-gray-50 data-[outside-month]:text-gray-400 overflow-hidden flex flex-col"
                      data-today={cell.isToday || undefined}
                      data-outside-month={!cell.isCurrentMonth || undefined}
                    >
                      <span className="text-sm font-medium">{cell.date.date()}</span>
                    </span>
                  ))}
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
                        {/* Removed 'relative' class */}
                        <div className="h-full w-full group/row">
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
                                key={uniqueSegmentKey} // Use unique key per segment
                                event={event}
                                cellDate={cell.date} // Pass the specific date of this cell segment
                                isBeingDragged={isEventBeingDragged} // Pass flag if the event is dragged
                                renderEvent={renderEvent} // Pass render function
                              />
                            );
                          })}

                          {/* Render projection segment if this cell's date falls within the projection's range */}
                          {projectionEvent && cell.date.isBetween(dayjs(projectionEvent.start), dayjs(projectionEvent.end), 'day', '[]') &&
                            renderEvent(projectionEvent, cell.date, true) // Render projection segment (not draggable)
                          }
                          {/* Hidden events count */}
                          {hiddenEventsCount > 0 && (
                            <div
                              // Revert to original positioning and styles for hidden count
                              style={{
                                '--event-top': `${visibleCount * (eventHeight + eventGap)}px`, // Use visibleCount from hook
                                '--event-height': `${eventHeight}px`,
                                // Original calculation used event info, but let's try simpler positioning first
                                // '--event-left': left, // Assuming left is 0 for this button now
                                // '--event-width': 'calc((100%/7) - 1px)', // Original width calc
                              } as React.CSSProperties}
                              // Revert container classes
                              className="absolute left-0 top-[var(--event-top)] w-[calc((100%/7)-1px)] px-0.5 pointer-events-none"
                            >
                              {/* Revert button classes */}
                              <button className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded" tabIndex={-1}>
                                <span className="truncate">+{hiddenEventsCount}<span className="max-sm:sr-only"> more</span></span>
                              </button>
                            </div>
                          )}
                        </div>
                      </DroppableCell>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* No DragOverlay needed as per requirements */}
    </DndContext>
  );
}
