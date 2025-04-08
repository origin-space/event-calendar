import { cn } from '@/lib/utils'
import { type CalendarViewProps } from './types/calendar'
import { getWeekDays, getHours } from './utils/calendar'

export function WeekView({ currentDate }: CalendarViewProps) {
  const days = getWeekDays(currentDate)
  const hours = getHours()

  return (
    <div data-slot="week-view" className="flex h-full min-h-screen flex-col">
      {/* Time column and day headers */}
      <div className="grid grid-cols-8 border-b">
        <div className="border-r p-2" />
        {days.map((day) => (
          <div
            key={day.date.toString()}
            className="p-2 text-center text-sm font-medium"
          >
            <div className="text-gray-500">
              {day.date.format('ddd')}
            </div>
            <div
              data-today={day.isToday || undefined}
              className="rounded-full p-1 data-[today]:bg-blue-500 data-[today]:text-white">
              {day.date.date()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid flex-1 grid-cols-8">
        {/* Time column */}
        <div className="border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-16 border-b p-1 text-right text-sm text-gray-500"
            >
              {hour}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <div key={day.date.toString()} className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b p-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}