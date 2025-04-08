import { type CalendarViewProps } from './types/calendar'
import { getDaysInMonth, getWeekDayNames, getEventInfo, getEventsForDay } from './utils/calendar'

export function MonthView({ currentDate, events = [], eventHeight = 1.5, eventGap = 0.125 }: CalendarViewProps) {
  const weekDays = getWeekDayNames()
  const weeks = getDaysInMonth(currentDate)  

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
          <div key={weekIndex} className="relative grid grid-cols-7 not-last:border-b">
            {week.map((cell, dayIndex) => {
              const dayEvents = getEventsForDay(cell.date, events)
              return (
                <div
                  key={dayIndex}
                  data-today={cell.isToday || undefined}
                  data-outside-month={!cell.isCurrentMonth || undefined}
                  className="not-last:border-e p-2 data-[today]:bg-blue-50 data-[outside-month]:bg-gray-50 data-[outside-month]:text-gray-400 overflow-hidden flex flex-col"
                >
                  <span className="text-sm font-medium">{cell.date.date()}</span>
                  {dayEvents.map((event, eventIndex) => {
                    const { left, width, isStartDay, isMultiDay, multiWeek, show } = getEventInfo(event, cell.date)
                    if (!show) return null
                    
                    return (
                      <div
                        key={event.id}
                        style={{
                          '--event-left': left,
                          '--event-width': width,
                          '--event-top': `${eventIndex * (eventHeight + eventGap) + 2}rem`,
                          '--event-height': `${eventHeight}rem`,
                          '--event-gap': `${eventGap}rem`
                        } as React.CSSProperties}
                        className={`absolute left-(--event-left) top-(--event-top) w-(--event-width) px-0.5 data-[multiweek=previous]:ps-0 data-[multiweek=next]:pe-0 data-[multiweek=both]:px-0`}
                        title={event.title}
                        data-start-day={isStartDay || undefined}
                        data-multiday={isMultiDay || undefined}
                        data-multiweek={multiWeek}
                      >
                        <span className="h-(--event-height) px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded in-data-[multiweek=previous]:rounded-s-none in-data-[multiweek=next]:rounded-e-none in-data-[multiweek=both]:rounded-none">
                          <span className="truncate">{event.title}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
