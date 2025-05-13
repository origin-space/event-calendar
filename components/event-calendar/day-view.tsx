import { type CalendarViewProps } from './types/calendar'
import { getHours } from './utils/calendar'

export function DayView({ currentDate }: CalendarViewProps) {
  const hours = getHours()

  return (
    <div data-slot="day-view">
      {/* Day header */}
      <div className="border-b p-4 text-center">
        <div className="text-2xl font-semibold">
          {currentDate.format('dddd, MMMM D')}
        </div>
      </div>

      {/* Time grid */}
      <div className="grid flex-1 grid-cols-12">
        {/* Time column */}
        <div className="col-span-1 border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-16 border-b p-1 text-right text-sm text-gray-500"
            >
              {hour}
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div className="col-span-11">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-16 border-b p-1"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
