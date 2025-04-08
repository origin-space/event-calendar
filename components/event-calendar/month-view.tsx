import { type CalendarViewProps } from './types/calendar'
import { getDaysInMonth, getWeekDayNames } from './utils/calendar'

export function MonthView({ currentDate }: CalendarViewProps) {
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
          <div key={weekIndex} className="grid grid-cols-7 not-last:border-b">
            {week.map((cell, dayIndex) => (
              <div
                key={dayIndex}
                data-today={cell.isToday || undefined}
                data-outside-month={!cell.isCurrentMonth || undefined}
                className="not-last:border-e p-2 data-[today]:bg-blue-50 data-[outside-month]:bg-gray-50 data-[outside-month]:text-gray-400 overflow-hidden"
              >
                <span className="text-sm font-medium">{cell.date.date()}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
