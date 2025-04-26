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

// Apply the plugin
dayjs.extend(isBetween);

import { useEventVisibility } from "./hooks/use-event-visibility"
import { type CalendarViewProps, CalendarEventProps, type CalendarCell } from './types/calendar'
import { getDaysInMonth, getWeekDayNames, calculateWeeklyEventLayout, getDayVisibilityData, calculateHiddenIdsForWeek } from './utils/calendar'
import { EventItem } from "./event-item"; // Import the new component

// Removed the EventRenderProps interface and internal render helpers

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
    weeks.forEach((week: CalendarCell[]) => {
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

  // --- DND Handlers --- 
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'event') {
      setActiveDragItem(event.active)
      setCurrentOverDate(null)
      offsetRef.current = null;
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event

    if (!over || !active?.data?.current?.type) { 
      setCurrentOverDate(null); 
      if (!over) return;
    }

    if (offsetRef.current === null && over?.data?.current?.type === 'cell' && active.data.current?.type === 'event') {
      const startDate = active?.data?.current?.event.start;
      const grabDate = over?.data?.current?.date;
      if (startDate && grabDate) {
        const startDateObj = dayjs(startDate).startOf('day');
        const grabDateObj = dayjs(grabDate).startOf('day');
        offsetRef.current = grabDateObj.diff(startDateObj, 'day');
      }
    }

    if (over?.data?.current?.type === 'cell') {
      const overDate = dayjs(over.data.current.date);
      const currentOffset = offsetRef.current;
      setCurrentOverDate(currentOffset !== null ? overDate.subtract(currentOffset, 'day') : overDate);
    } else {
      setCurrentOverDate(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over?.data?.current?.type === 'cell' && active.data.current?.type === 'event' && active.data.current?.event) {
      const originalEvent = active.data.current.event as CalendarEventProps
      const originalStartDate = dayjs(originalEvent.start)
      const dropDate = dayjs(over.data.current.date)
      const currentOffset = offsetRef.current ?? 0;
      const newStartDate = dropDate.subtract(currentOffset, 'day')

      if (onEventUpdate && !newStartDate.isSame(originalStartDate, 'day')) {
        const duration = dayjs(originalEvent.end).diff(originalEvent.start)
        const newEndDate = newStartDate.add(duration)
        onEventUpdate({ ...originalEvent, start: newStartDate.toDate(), end: newEndDate.toDate() })
      }
    }
    setActiveDragItem(null)
    setCurrentOverDate(null)
    offsetRef.current = null;
  }

  // --- Memoized Values --- 
  const activeDraggedEvent = useMemo(() => {
    if (!activeDragItem || activeDragItem.data.current?.type !== 'event') return null;
    const draggedEventObject = activeDragItem.data.current?.event as CalendarEventProps | undefined;
    return events.find(e => e.id === draggedEventObject?.id);
  }, [activeDragItem, events]);

  const potentialDropRange = useMemo(() => {
    if (!activeDraggedEvent || !currentOverDate) return null;
    const originalStartDate = dayjs(activeDraggedEvent.start);
    const newStartDate = currentOverDate;
    const duration = dayjs(activeDraggedEvent.end).diff(originalStartDate);
    const newEndDate = newStartDate.add(duration);
    return { start: newStartDate, end: newEndDate };
  }, [activeDraggedEvent, currentOverDate]);

  // --- Main JSX --- 
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
                    const highlightClass = isPotentialDropTarget ? 'bg-gray-200 transition-colors duration-150 ease-in-out' : '';

                    return (
                      <span
                        key={dayIndex}
                        className={`not-last:border-e p-2 data-[today]:bg-blue-50 data-[outside-month]:bg-gray-50 data-[outside-month]:text-gray-400 overflow-hidden flex flex-col ${highlightClass}`}
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

                          {/* Render actual draggable events using EventItem via render prop */}
                          {visibleEvents.map((event) => {
                            const isEventBeingDragged = activeDragItem?.data.current?.event?.id === event.id;
                            const uniqueSegmentKey = `${event.id}-${cell.date.format('YYYY-MM-DD')}`;
                            return (
                              <DraggableEvent
                                key={uniqueSegmentKey}
                                event={event}
                                cellDate={cell.date} // Pass cellDate context
                                renderEvent={() => ( // No args needed from DraggableEvent anymore
                                  <EventItem
                                    event={event}          // Event from map scope
                                    cellDate={cell.date}   // Cell date from map scope
                                    eventHeight={eventHeight}
                                    eventGap={eventGap}
                                  />
                                )}
                                eventHeight={eventHeight}
                                eventGap={eventGap}
                              />
                            );
                          })}
                          {/* Hidden events count */}
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
          // Render EventItem directly for the overlay
          <EventItem
            event={activeDraggedEvent}
            cellDate={dayjs(activeDraggedEvent.start)} // Provide a base cell date
            isOverlay={true}
            activeDragItemForOverlay={activeDragItem}
            eventHeight={eventHeight}
            eventGap={eventGap}
          // isDragging and isProjection are implicitly false or irrelevant for overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
