import { cn } from '@/lib/utils'
import { type CalendarEventProps, type CalendarViewProps } from './types/calendar'
import { getWeekDays, getHours, calculateWeeklyEventLayout } from './utils/calendar' 
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween';
import { EventItem } from './event-item'; 
import { StartHour, EndHour, WeekCellsHeight, EventHeight, EventGap } from './constants';
import React, { useMemo, useState, useRef } from 'react'; 
import { DroppableCell } from './droppable-cell'; 
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type Active,
  DragOverlay,
  pointerWithin,
  useDroppable,
} from "@dnd-kit/core";

dayjs.extend(isBetween);

interface PositionedEvent {
  event: CalendarEventProps;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

export function WeekView({ 
  currentDate,
  events = [], 
  onEventUpdate,
  onEventSelect,
  onEventCreate
}: CalendarViewProps) {
  const days = getWeekDays(currentDate)
  const hours = getHours() 
  const weekStart = useMemo(() => dayjs(currentDate).startOf('week'), [currentDate]);

  /**
   * Reference to track the day offset between where an event was grabbed and its start date
   * This ensures events can be grabbed from any day they span and maintain proper positioning
   */
  const offsetRef = useRef<number | null>(null);

  // Currently active item being dragged
  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null);

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

  const allDayEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
        const isMulti = !eventStart.isSame(eventEnd, 'day');
        return event.allDay || isMulti;
      })
      .filter((event) => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
        return days.some(
          (day) =>
            day.date.isSame(eventStart, 'day') ||
            day.date.isSame(eventEnd, 'day') ||
            day.date.isAfter(eventStart) && day.date.isBefore(eventEnd)
        );
      });
  }, [events, days]);

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

    // Ensure we have an active item and it's an event (has 'event' property)
    if (!active?.data?.current?.event) {
      setPotentialStartDate(null); // Clear potential date if not dragging an event
      return;
    }

    // Clear potential start date if not hovering over a droppable cell (has 'date' property)
    if (!over?.data?.current?.date) {
      setPotentialStartDate(null);
      return; // Exit if not hovering over a valid cell
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

    // Update the potential start date based on the cell being hovered over and the calculated offset
    if (over.data.current.date) {
      const overDate = dayjs(over.data.current.date).startOf('day'); // Date of the cell being hovered
      const currentOffset = offsetRef.current || 0; // Use 0 as default if offset hasn't been calculated

      // Calculate the potential start date by subtracting the offset from the hovered date
      const newPotentialStartDate = overDate.subtract(currentOffset, 'day');
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

    // Check if dropped over a cell ('date' property) and dragging an event ('event' property)
    if (over?.data?.current?.date && active.data.current?.event) {
      const originalEvent = active.data.current.event as CalendarEventProps;
      const originalStartDateDayOnly = dayjs(originalEvent.start).startOf('day');

      // Use the final potentialStartDate calculated during dragOver
      const finalPotentialDropDate = potentialStartDate; // This is the new DATE part

      // Only update if the drop target is valid and the date actually changed
      if (onEventUpdate && finalPotentialDropDate && !finalPotentialDropDate.isSame(originalStartDateDayOnly, 'day')) {
        const duration = dayjs(originalEvent.end).diff(dayjs(originalEvent.start)); // Calculate duration in milliseconds
        
        // Preserve original time
        const originalStartTime = dayjs(originalEvent.start);
        const newStartDateTime = finalPotentialDropDate
          .hour(originalStartTime.hour())
          .minute(originalStartTime.minute())
          .second(originalStartTime.second())
          .millisecond(originalStartTime.millisecond());

        const newEndDateTime = newStartDateTime.add(duration); // Calculate new end date with preserved time

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
  }

  const processedDayEvents = useMemo(() => {
    const result = days.map((day) => {
      const dayEvents = events.filter((event) => {
        if (event.allDay) return false; 

        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
        const isMulti = !eventStart.isSame(eventEnd, 'day');
        if (isMulti) return false; 

        return eventStart.isSame(day.date, 'day'); 
      });

      const sortedEvents = [...dayEvents].sort((a, b) => {
        const aStart = dayjs(a.start);
        const bStart = dayjs(b.start);
        if (aStart.isBefore(bStart)) return -1;
        if (aStart.isAfter(bStart)) return 1;

        const aDuration = dayjs(a.end).diff(aStart, 'minute');
        const bDuration = dayjs(b.end).diff(bStart, 'minute');
        return bDuration - aDuration; 
      });

      const positionedEvents: PositionedEvent[] = [];
      const columns: { event: CalendarEventProps; end: dayjs.Dayjs }[][] = [];

      sortedEvents.forEach((event) => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);

        const startHourFloat = eventStart.hour() + eventStart.minute() / 60;
        const endHourFloat = eventEnd.hour() + eventEnd.minute() / 60;

        const top = (startHourFloat - StartHour) * WeekCellsHeight;
        let height = (endHourFloat - startHourFloat) * WeekCellsHeight;
        if (height === 0) height = WeekCellsHeight / 4; 

        let columnIndex = 0;
        let placed = false;

        while (!placed) {
          const col = columns[columnIndex] || [];
          if (col.length === 0) {
            columns[columnIndex] = col;
            placed = true;
          } else {
            const overlaps = col.some((c) =>
              eventStart.isBefore(c.end) && eventEnd.isAfter(dayjs(c.event.start))
            );
            if (!overlaps) {
              placed = true;
            } else {
              columnIndex++;
            }
          }
        }

        const currentColumn = columns[columnIndex] || [];
        columns[columnIndex] = currentColumn;
        currentColumn.push({ event, end: eventEnd });

        const widthPercentage = 100 / (columns.length); 
        const leftPercentage = columnIndex * widthPercentage;

        positionedEvents.push({
          event,
          top,
          height,
          left: leftPercentage, 
          width: widthPercentage, 
          zIndex: 10 + columnIndex,
        });
      });

      return positionedEvents;
    });
    return result;
  }, [days, events]);

  const handleEventClick = (event: CalendarEventProps) => {
    if (onEventSelect) {
      onEventSelect(event); 
    }
  };

  // Calculate layout for all-day events (assigns cellSlot property for vertical stacking)
  const allDayEventsWithLayout = useMemo(() => {
    if (allDayEvents.length === 0) return [];
    return calculateWeeklyEventLayout(allDayEvents, weekStart);
  }, [allDayEvents, weekStart]);

  // Calculate the maximum cell slot used + 1 to determine the height of the all-day section
  const maxAllDaySlot = useMemo(() => {
    if (allDayEventsWithLayout.length === 0) return 0;
    const maxSlot = Math.max(...allDayEventsWithLayout.map(event => event.cellSlot || 0));
    return maxSlot + 1; // Add 1 because slots are zero-indexed
  }, [allDayEventsWithLayout]);

  // Calculate the height of the all-day section based on the number of slots
  const allDaySectionHeight = useMemo(() => {
    if (maxAllDaySlot === 0) return EventHeight + (2 * EventGap);
    return (maxAllDaySlot * EventHeight) + ((maxAllDaySlot + 1) * EventGap);
  }, [maxAllDaySlot, EventHeight, EventGap]);

  const showAllDaySection = allDayEvents.length > 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div data-slot="week-view">
        <div className="sticky top-0 z-30 grid grid-cols-8 border-b bg-gray-50 backdrop-blur-md">
          <div className="border-r p-2 text-center text-xs text-gray-500"> 
             <span className="max-[479px]:sr-only">{dayjs().format('Z')}</span> 
          </div>
          {days.map((day) => (
            <div
              key={day.date.toString()}
              className={cn(
                "p-2 text-center text-sm font-medium",
                day.isToday && "text-blue-600"
              )}
            >
              <div className="text-gray-500">
                {day.date.format('ddd')}
              </div>
              <div
                data-today={day.isToday || undefined}
                className={cn(
                  "rounded-full p-1",
                  day.isToday && "bg-blue-600 text-white"
                )}
              >
                {day.date.date()}
              </div>
            </div>
          ))}
        </div>

        {showAllDaySection && (
          <div
            className="border-b border-gray-200 relative"
            style={{
              '--event-height': `${EventHeight}px`,
              '--event-gap': `${EventGap}px`,
            } as React.CSSProperties}
          >
            {/* Background grid cells */}
            <div className="absolute inset-0 grid grid-cols-8" aria-hidden="true">
            <span></span>
              {days.map((cell, dayIndex) => {
                const isPotentialDropTarget = potentialDropRange && cell.date.isBetween(potentialDropRange.start, potentialDropRange.end, 'day', '[]');
                
                return (
                  <span
                    key={dayIndex}
                    className="not-last:border-e p-2 data-[today]:bg-blue-50 overflow-hidden flex flex-col data-[potential-drop=true]:bg-gray-100"
                    data-today={cell.isToday || undefined}
                    data-potential-drop={isPotentialDropTarget || undefined}
                  ></span>
                )
              })}
            </div>
            {/* Foreground grid for events and drop zones */}
            <div className="grid grid-cols-8" style={{ height: `${allDaySectionHeight}px` }}>
              <div className="relative border-r border-gray-200">
                <span className="absolute bottom-0 left-0 h-6 w-full pe-2 text-right text-[10px] text-gray-400 sm:pe-4 sm:text-xs">
                  All day
                </span>
              </div>
              {days.map((cell, dayIndex) => {
                const cellDate = cell.date;
                // Filter the events with layout that apply to this specific day
                const dayAllDayEvents = allDayEventsWithLayout.filter((event) => {
                  const eventStart = dayjs(event.start);
                  const eventEnd = dayjs(event.end);
                  return (
                    eventStart.isSame(cellDate, 'day') ||
                    eventEnd.isSame(cellDate, 'day') ||
                    (cellDate.isAfter(eventStart) && cellDate.isBefore(eventEnd))
                  );
                });

                const uniqueCellId = `all-day-${cellDate.format('YYYY-MM-DD')}`;

                return (
                  <DroppableCell
                    key={uniqueCellId}
                    id={uniqueCellId}
                    cellDate={cellDate}
                    ref={null}
                    displayContext="weekAllDay"
                  >
                    <>
                       {/* <h2 className="sr-only">
                        {sortedEvents.length === 0 ? "No events, " :
                          sortedEvents.length === 1 ? "1 event, " :
                            `${sortedEvents.length} events, `}
                        {cellDate.format('dddd, MMMM D')}
                      </h2>                     */}
                      {dayAllDayEvents.map((event) => {
                        // Create a consistent ID format for the event segment
                        const uniqueSegmentId = `all-day-${event.id}-${cellDate.format('YYYY-MM-DD')}`;

                        return (
                          <EventItem
                            key={uniqueSegmentId}
                            uniqueId={uniqueSegmentId}
                            event={event} // This event object now includes cellSlot from calculateWeeklyEventLayout
                            cellDate={cellDate} 
                            eventHeight={EventHeight} 
                            eventGap={EventGap} 
                            onEventSelect={handleEventClick}
                            displayContext="month" 
                          />
                        );
                      })}
                    </>
                  </DroppableCell>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid flex-1 grid-cols-8 overflow-hidden">
          <div className="border-r border-gray-200">
            {Array.from({ length: EndHour - StartHour }).map((_, hourIndex) => {
              const currentHour = StartHour + hourIndex;
              // Find the matching hour string for display, or format directly
              const hourLabel = hours.find(h => parseInt(h.split(':')[0]) === currentHour) || `${String(currentHour).padStart(2, '0')}:00`;
              
              return (
                <div
                  key={`${dayjs(currentDate).date()}-h${currentHour}`}
                  className="relative border-b border-gray-200 p-1 text-right text-xs text-gray-400"
                  style={{ height: `${WeekCellsHeight}px` }}
                >
                  {hourIndex > 0 && (
                    <span className="absolute -top-2.5 right-1">
                      {hourLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {days.map((day, dayIndex) => (
            <div 
              key={day.date.toString()} 
              className={cn(
                  "relative border-r border-gray-200 last:border-r-0",
                  day.isToday && "bg-blue-50"
              )}
            >
              {/* Render timed events for the current day column */}
              {(processedDayEvents[dayIndex] ?? []).map((positionedEvent) => {
                return (
                  <EventItem
                    key={`timed-${positionedEvent.event.id}-${day.date.toString()}`}
                    event={positionedEvent.event}
                    cellDate={day.date} // Keep for context if needed by EventItem
                    eventHeight={positionedEvent.height} // Pass the calculated height as eventHeight prop
                    eventGap={0} // Keep if EventItem uses it for internal calculations
                    uniqueId={`timed-${positionedEvent.event.id}-${day.date.toString()}-${dayIndex}`}
                    onEventSelect={handleEventClick}
                    displayContext="weekTimed" // New prop to indicate rendering mode
                    style={{
                      '--event-top': `${positionedEvent.top}px`,
                      '--event-height': `${positionedEvent.height}px`,
                      '--event-left': `${positionedEvent.left}%`,
                      '--event-width': `${positionedEvent.width}%`,
                      zIndex: positionedEvent.zIndex, // Pass zIndex directly
                    } as React.CSSProperties}
                  />
                );
              })}

              {Array.from({ length: EndHour - StartHour }).map((_, hourIndex) => {
                const currentHour = StartHour + hourIndex;
                // Find the matching hour string for display, or format directly
                const hourLabel = hours.find(h => parseInt(h.split(':')[0]) === currentHour) || `${String(currentHour).padStart(2, '0')}:00`;
                
                return (
                  <div
                    key={`${day.date.toString()}-h${currentHour}`}
                    className="relative border-b border-gray-200"
                    style={{ height: `${WeekCellsHeight}px` }}
                  >
                    {[0, 1, 2, 3].map((quarter) => {
                      const slotDateTime = day.date.hour(currentHour).minute(quarter * 15).second(0).millisecond(0);
                      const TimedSlotDroppable = ({ children }: { children?: React.ReactNode }) => {
                        const { setNodeRef, isOver } = useDroppable({
                          id: `timed-slot-${slotDateTime.format('YYYY-MM-DD-HH-mm')}`,
                          data: {
                            dateTime: slotDateTime.toISOString(),
                            isAllDaySlot: false,
                          },
                        });
                        return (
                          <div
                            ref={setNodeRef}
                            className={cn(
                              "absolute w-full not-first:border-t border-gray-100",
                              isOver && activeDragItem?.data.current?.displayContext === 'weekTimed' && "bg-blue-100/50 ring-1 ring-blue-500 z-10",
                              "hover:bg-blue-200/30 cursor-pointer" // Generic hover for visual feedback
                            )}
                            style={{
                              height: `${WeekCellsHeight / 4}px`,
                              top: `${(quarter * WeekCellsHeight) / 4}px`,
                            }}
                            onClick={() => {
                              if (onEventCreate) {
                                onEventCreate(slotDateTime.toDate());
                              }
                            }}
                          >
                            {children}
                          </div>
                        );
                      };
                      return <TimedSlotDroppable key={slotDateTime.format('YYYY-MM-DD-HH-mm')} />;
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragItem && activeDraggedEvent ? (
          <EventItem
            event={activeDraggedEvent}
            cellDate={dayjs(activeDraggedEvent.start)}
            isOverlay
            activeDragItemForOverlay={activeDragItem}
            eventHeight={EventHeight}
            eventGap={EventGap}
            uniqueId={`overlay-${activeDraggedEvent.id}`}
            displayContext="month" // Usemonth for all-day events to ensure consistent behavior
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}