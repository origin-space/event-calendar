import { type CalendarViewProps } from './types/calendar'

interface AgendaViewProps extends CalendarViewProps {
  daysInAgenda?: number
}

export function AgendaView({ currentDate, daysInAgenda = 30 }: AgendaViewProps) {
  const dates = Array.from({ length: daysInAgenda }, (_, i) => 
    currentDate.add(i, 'day')
  )

  return (
    <div data-slot="agenda-view">
      {dates.map((date) => (
        <div key={date.toString()} className="border-b">
          <div className="p-4">
            <div className="text-lg font-semibold">
              {date.format('dddd, MMMM D')}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              No events scheduled
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
