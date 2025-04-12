import React, { useMemo } from "react"
import { useEventVisibility } from "./hooks/use-event-visibility"
import { type CalendarViewProps, CalendarEventProps } from './types/calendar'
import { getDaysInMonth, getWeekDayNames, getEventInfo, getEventsForDay, calculateWeeklyEventLayout } from './utils/calendar'

export function MonthView({ currentDate, events = [], eventHeight = 24, eventGap = 2 }: CalendarViewProps) {
  const weekDays = getWeekDayNames()
  const weeks = getDaysInMonth(currentDate)

  const { contentRef, getVisibleEventCount } = useEventVisibility({
    eventHeight: eventHeight,
    eventGap: eventGap,
  });

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
      <div className="flex-1 min-h-0 grid grid-flow-row auto-rows-[minmax(85px,_1fr)]">
        {weeks.map((week, weekIndex) => {
          const weekStartDateStr = week[0]?.date?.startOf('week').format('YYYY-MM-DD');
          const layoutForThisWeek = weekStartDateStr ? weeklyLayouts.get(weekStartDateStr) || [] : [];
          const hiddenIdsThisWeek = new Set<string | number>();
          if (visibleCount > 0 && week) {
              week.forEach(cellInWeek => {
                  const dayEventsForCheck = getEventsForDay(cellInWeek.date, layoutForThisWeek);
                  const sortedEventsForCheck = [...dayEventsForCheck].sort((a, b) => (a.cellSlot ?? 0) - (b.cellSlot ?? 0));
                  const overflowingItemsCheck = Math.max(0, sortedEventsForCheck.length - visibleCount);

                  if (overflowingItemsCheck > 0) {
                      const hiddenOnThisDay = sortedEventsForCheck.slice(visibleCount - 1);
                      hiddenOnThisDay.forEach(event => hiddenIdsThisWeek.add(event.id));
                  }
              });
          }

          return (
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
                const dayEvents = getEventsForDay(cell.date, layoutForThisWeek);
                const originalOverflowingItems = Math.max(0, dayEvents.length - visibleCount);
                const sortedEvents = [...dayEvents].sort((a, b) => {
                  const slotA = a.cellSlot ?? 0;
                  const slotB = b.cellSlot ?? 0;
                  return slotA - slotB;
                });
                const displayableEvents = sortedEvents.filter(event => !hiddenIdsThisWeek.has(event.id));
                const visibleEvents = originalOverflowingItems > 0
                  ? displayableEvents.slice(0, visibleCount > 0 ? visibleCount - 1 : 0)
                  : displayableEvents;
                const hiddenEventsCount = sortedEvents.length - visibleEvents.length;

                return (
                  <div
                    key={dayIndex}
                    className="group/row"
                  >
                    <h2 className="sr-only">
                      {sortedEvents.length === 0 ? "No events, " :
                      sortedEvents.length === 1 ? "1 event, " :
                      `${sortedEvents.length} events, `}
                      {cell.date.format('dddd, MMMM D')}
                    </h2>
                    {visibleEvents.map((event) => {
                      const { left, width, isStartDay, isMultiDay, multiWeek, show } = getEventInfo(event, cell.date)
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
                          className="absolute left-[var(--event-left)] top-[var(--event-top)] w-[calc(var(--event-width)-1px)] data-[multiweek=next]:w-(--event-width) px-0.5 data-[multiweek=previous]:ps-0 data-[multiweek=next]:pe-0 data-[multiweek=both]:px-0 group-last/row:w-(--event-width)"
                          title={event.title}
                          data-cell-slot={event.cellSlot}
                          data-start-day={isStartDay || undefined}
                          data-multiday={isMultiDay || undefined}
                          data-multiweek={multiWeek}
                          data-hidden={!show || undefined}
                        >
                          <button className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded in-data-[multiweek=previous]:rounded-s-none in-data-[multiweek=next]:rounded-e-none in-data-[multiweek=both]:rounded-none in-data-[hidden=true]:sr-only">
                            <span className="truncate">{event.title}</span>
                          </button>
                        </div>
                      );
                    })}
                    {hiddenEventsCount > 0 && (
                      <div
                        style={{
                          '--event-top': `${visibleEvents.length * (eventHeight + eventGap)}px`,
                          '--event-height': `${eventHeight}px`,
                        } as React.CSSProperties}
                        className="absolute left-[var(--event-left)] top-[var(--event-top)] w-[calc((100%/7)-1px)] px-0.5 in-data-[multiweek=previous]:ps-0 in-data-[multiweek=next]:pe-0 in-data-[multiweek=both]:px-0"
                      >
                        <button className="w-full h-[var(--event-height)] px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded data-[multiweek=previous]:rounded-s-none data-[multiweek=next]:rounded-e-none data-[multiweek=both]:rounded-none">
                          <span className="truncate">+{hiddenEventsCount}<span className="max-sm:sr-only"> more</span></span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}