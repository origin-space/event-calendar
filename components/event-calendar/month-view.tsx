import React, { useMemo } from "react"
import {
  DndContext,
  DragOverlay,
} from "@dnd-kit/core"
import { useCalendarDnd, useCalendarDndConfig } from "./calendar-dnd-context"

import { DroppableCell } from "./droppable-cell"
import dayjs from "dayjs"
import isBetween from 'dayjs/plugin/isBetween';

// Extend dayjs with required plugins
dayjs.extend(isBetween);

import { useEventVisibility } from "./hooks/use-event-visibility"
import { type CalendarViewProps, CalendarEventProps, type CalendarCell } from './types/calendar'
import { getDaysInMonth, getWeekDayNames, calculateWeeklyEventLayout, getDayVisibilityData, calculateHiddenIdsForWeek } from './utils/calendar'
import { EventItem } from "./event-item";

export function MonthView({
  currentDate,
  events = [],
  eventHeight = 24, // xxx: replace these with constants?
  eventGap = 2, // xxx: replace these with constants?
  onEventUpdate,
  onEventSelect,
  onEventCreate
}: CalendarViewProps) {
  
  //Get weekday names for the header row
  const weekDays = getWeekDayNames()

  // Generate the calendar grid structure based on current month
  const weeks = getDaysInMonth(currentDate)

  // Calculate how many events can be displayed in each cell based on available height
  const { contentRef, getVisibleEventCount } = useEventVisibility({
    eventHeight,
    eventGap,
    currentDate, // Pass currentDate to the hook
  });

  // Get the number of events that can be displayed in each cell
  const visibleCount = getVisibleEventCount();

  // Use the calendar drag hook for drag-and-drop functionality
  const eventDrag = useCalendarDnd({
    events,
    onEventUpdate
  });

  // Get common DnD configuration
  const { sensors, collisionDetection } = useCalendarDndConfig();

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
    // We'll use the event drag hook's active dragged event
    return eventDrag.activeDraggedEvent;
  }, [eventDrag.activeDraggedEvent]);

  // We'll use the event drag hook's potential drop range for highlighting cells
  const potentialDropRange = eventDrag.potentialDropRange;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={eventDrag.handleDragStart}
      onDragOver={eventDrag.handleDragOver}
      onDragEnd={eventDrag.handleDragEnd}
    >
      <div
        data-slot="month-view"
        className="flex-1 flex h-full flex-col"
        style={{
          '--event-height': `${eventHeight}px`,
          '--event-gap': `${eventGap}px`,
        } as React.CSSProperties}
      >
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
                    const cellDate = cell.date;
                    const { visibleEvents, hiddenEventsCount, sortedEvents } = getDayVisibilityData(
                      cellDate,
                      layoutForThisWeek,
                      hiddenIdsThisWeek,
                      visibleCount
                    );
                    const uniqueCellId = cellDate.format('YYYY-MM-DD') 

                    return (
                      <DroppableCell
                        key={uniqueCellId}
                        id={uniqueCellId}
                        cellDate={cellDate}
                        ref={weekIndex === 0 && dayIndex === 0 ? contentRef : null}
                        onClick={() => onEventCreate?.(cellDate.toDate())}
                      >
                        <>
                          <h2 className="sr-only">
                            {sortedEvents.length === 0 ? "No events, " :
                              sortedEvents.length === 1 ? "1 event, " :
                                `${sortedEvents.length} events, `}
                            {cellDate.format('dddd, MMMM D')}
                          </h2>

                          {visibleEvents.map((event) => {
                            const uniqueSegmentId = `${event.id}-${cellDate.format('YYYYMMDD')}`; // Use consistent format for ID
                            return (
                              <EventItem
                                key={uniqueSegmentId}
                                uniqueId={uniqueSegmentId}
                                event={event}
                                cellDate={cellDate}
                                eventHeight={eventHeight}
                                eventGap={eventGap}
                                onEventSelect={onEventSelect}
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
                              className="absolute left-0 top-(--event-top) w-full px-0.5"
                            >
                              <button className="w-full h-(--event-height) px-1 flex items-center text-xs bg-gray-200 text-gray-700 rounded cursor-default">
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
      <DragOverlay dropAnimation={null} className="cursor-move">
        {eventDrag.activeDragItem && eventDrag.activeDraggedEvent ? (
          <EventItem
            event={eventDrag.activeDraggedEvent}
            cellDate={dayjs(eventDrag.activeDraggedEvent.start)}
            isOverlay
            activeDragItemForOverlay={eventDrag.activeDragItem}
            eventHeight={eventHeight}
            eventGap={eventGap}
            uniqueId={`overlay-${eventDrag.activeDraggedEvent.id}`}
            displayContext="month"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
