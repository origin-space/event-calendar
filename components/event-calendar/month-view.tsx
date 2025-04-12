

import React, { useMemo } from "react"
import { useEventVisibility } from "./hooks/use-event-visibility"
import { type CalendarViewProps } from './types/calendar'
import { getDaysInMonth, getWeekDayNames, getEventInfo, getEventsForDay, calculateEventLayout } from './utils/calendar'

export function MonthView({ currentDate, events = [], eventHeight = 24, eventGap = 2 }: CalendarViewProps) {
  const weekDays = getWeekDayNames()
  const weeks = getDaysInMonth(currentDate)

  const { contentRef, getVisibleEventCount } = useEventVisibility({
    eventHeight: eventHeight,
    eventGap: eventGap,
  })

  const eventsWithLayout = useMemo(() => {
    return calculateEventLayout(events, currentDate);
  }, [events, currentDate]);

  const visibleCount = getVisibleEventCount(events.length);

  return (
    <div data-slot="month-view" className="flex-1 flex h-full flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-500 overflow-hidden"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 min-h-0 grid grid-flow-row auto-rows-[minmax(64px,_1fr)]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col relative not-last:border-b">
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
            <div className="relative flex-1 grid grid-cols-7 mt-8" ref={weekIndex === 0 ? contentRef : null}>
              {week.map((cell, dayIndex) => {
                const dayEvents = getEventsForDay(cell.date, eventsWithLayout);
                return (
                  <div
                    key={dayIndex}
                  >
                    <h2 className="sr-only">
                      {dayEvents.length === 0 ? "No events, " :
                       dayEvents.length === 1 ? "1 event, " :
                       `${dayEvents.length} events, `}
                      {cell.date.format('dddd, MMMM D')}
                    </h2>
                    {dayEvents.map((event) => { 
                      const { left, width, isStartDay, isMultiDay, multiWeek, show } = getEventInfo(event, cell.date)

                      if (!show) return null;

                      const topPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;

                      return (
                        <div
                          key={event.id}
                          style={{
                            '--event-left': left,
                            '--event-width': width,
                            '--event-top': `${topPosition}px`,
                            '--event-height': `${eventHeight}px`,
                          } as React.CSSProperties}
                          className="absolute left-(--event-left) top-(--event-top) w-[calc(var(--event-width)-1px)] px-0.5 data-[multiweek=previous]:ps-0 data-[multiweek=next]:pe-0 data-[multiweek=both]:px-0"
                          title={event.title}
                          data-start-day={isStartDay || undefined}
                          data-multiday={isMultiDay || undefined}
                          data-multiweek={multiWeek}
                        >
                          <span className="h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded data-[multiweek=previous]:rounded-s-none data-[multiweek=next]:rounded-e-none data-[multiweek=both]:rounded-none">
                            <span className="truncate">{event.title}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}