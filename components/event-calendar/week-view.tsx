import { cn } from '@/lib/utils'
import { type CalendarEventProps, type CalendarViewProps } from './types/calendar'
import { getWeekDays, getHours, calculateWeeklyEventLayout } from './utils/calendar' 
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween';
import { EventItem } from './event-item'; 
import { StartHour, EndHour, WeekCellsHeight, EventHeight, EventGap } from './constants';
import React, { useMemo } from 'react'; 
import { DroppableCell } from './droppable-cell'; 
import { useCalendarDnd, useTimedEventDnd, useCalendarDndConfig } from './calendar-dnd-context';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
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

  // Get common DnD configuration
  const { sensors, collisionDetection } = useCalendarDndConfig();
  
  // Hook for all-day events drag and drop
  const allDayDrag = useCalendarDnd({
    events,
    onEventUpdate
  });
  
  // Hook for timed events drag and drop
  const timedDrag = useTimedEventDnd({
    events,
    onEventUpdate
  });

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

  // We'll use the all-day drag context's potential drop range for highlighting cells
  const potentialDropRange = allDayDrag.potentialDropRange;

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
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={allDayDrag.handleDragStart}
            onDragEnd={allDayDrag.handleDragEnd}
            onDragOver={allDayDrag.handleDragOver}
          >
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
                    onClick={() => {
                      if (onEventCreate) {
                        // Create an all-day event starting at the beginning of this day
                        onEventCreate(cellDate.startOf('day').toDate());
                      }
                    }}
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
                            event={event}
                            cellDate={cellDate} 
                            eventHeight={EventHeight} 
                            eventGap={EventGap} 
                            onEventSelect={handleEventClick}
                            displayContext="weekAllDay"
                          />
                        );
                      })}
                    </>
                  </DroppableCell>
                );
              })}
            </div>
            </div>
            <DragOverlay dropAnimation={null}>
              {allDayDrag.activeDragItem && allDayDrag.activeDraggedEvent ? (
                <EventItem
                  event={allDayDrag.activeDraggedEvent}
                  cellDate={dayjs(allDayDrag.activeDraggedEvent.start)}
                  isOverlay
                  activeDragItemForOverlay={allDayDrag.activeDragItem}
                  eventHeight={EventHeight}
                  eventGap={EventGap}
                  uniqueId={`overlay-${allDayDrag.activeDraggedEvent.id}`}
                  displayContext="weekAllDay"
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={timedDrag.handleDragStart}
          onDragEnd={timedDrag.handleDragEnd}
          onDragOver={timedDrag.handleDragOver}
        >
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
                    cellDate={day.date}
                    eventHeight={positionedEvent.height}
                    eventGap={0}
                    uniqueId={`timed-${positionedEvent.event.id}-${day.date.toString()}-${dayIndex}`}
                    onEventSelect={handleEventClick}
                    displayContext="weekTimed"
                    style={{
                      '--event-top': `${positionedEvent.top}px`,
                      '--event-height': `${positionedEvent.height}px`,
                      '--event-left': `${positionedEvent.left}%`,
                      '--event-width': `${positionedEvent.width}%`,
                      zIndex: positionedEvent.zIndex,
                    } as React.CSSProperties}
                  />
                );
              })}

              {/* Create one droppable per hour instead of 4 per hour */}
              {Array.from({ length: EndHour - StartHour }).map((_, hourIndex) => {
                const currentHour = StartHour + hourIndex;
                const hourDateTime = day.date.hour(currentHour).minute(0).second(0).millisecond(0);
                
                // Create a single droppable for the entire hour
                const { setNodeRef, isOver } = useDroppable({
                  id: `timed-slot-${hourDateTime.format('YYYY-MM-DD-HH')}`,
                  data: {
                    dateTime: hourDateTime.toISOString(),
                    isAllDaySlot: false,
                    displayContext: 'weekTimed',
                  },
                });
                
                return (
                  <div
                    key={`${day.date.toString()}-h${currentHour}`}
                    ref={setNodeRef}
                    className={cn(
                      "relative border-b border-gray-200",
                      isOver && timedDrag.activeDragItem?.data.current?.displayContext === 'weekTimed' && "bg-blue-100/50 ring-1 ring-blue-500 z-10",
                      "hover:bg-blue-200/30 cursor-pointer"
                    )}
                    style={{ height: `${WeekCellsHeight}px` }}
                    onClick={() => {
                      if (onEventCreate) {
                        onEventCreate(hourDateTime.toDate());
                      }
                    }}
                  >
                    {/* We still render the hour markers but don't make them droppable */}
                    {hourIndex > 0 && dayIndex === 0 && (
                      <span className="absolute -top-2.5 left-1 text-xs text-gray-400">
                        {hours.find(h => parseInt(h.split(':')[0]) === currentHour) || `${String(currentHour).padStart(2, '0')}:00`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          </div>
          <DragOverlay dropAnimation={null} className="cursor-move">
            {timedDrag.activeDragItem && timedDrag.activeDraggedEvent ? (
              <EventItem
                event={timedDrag.activeDraggedEvent}
                cellDate={dayjs(timedDrag.activeDraggedEvent.start)}
                isOverlay
                activeDragItemForOverlay={timedDrag.activeDragItem}
                eventHeight={EventHeight}
                eventGap={EventGap}
                uniqueId={`overlay-timed-${timedDrag.activeDraggedEvent.id}`}
                displayContext="weekTimed"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
    </div>
  )
}