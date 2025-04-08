import { type CalendarViewProps } from './types/calendar'
import { getDaysInMonth, getWeekDayNames } from './utils/calendar'

export function MonthView({ currentDate }: CalendarViewProps) {
  const weekDays = getWeekDayNames()
  const days = getDaysInMonth(currentDate)  

  return (
    <div data-slot="month-view" className="flex h-full min-h-screen flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((cell, index) => (
          <div
            key={index}
            data-today={cell.isToday || undefined}
            data-outside-month={!cell.isCurrentMonth || undefined}
            className="min-h-[120px] border p-2 data-[today]:bg-blue-50 data-[outside-month]:bg-gray-50 data-[outside-month]:text-gray-400"
          >
            <span className="text-sm font-medium">{cell.date.date()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
