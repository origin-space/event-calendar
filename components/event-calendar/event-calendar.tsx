'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { type CalendarView, type EventCalendarProps } from './types/calendar'
import { MonthView } from './month-view'
import { WeekView } from './week-view'
import { DayView } from './day-view'
import { AgendaView } from './agenda-view'

export function EventCalendar({
  initialDate,
  initialView = 'month',
  daysInAgenda = 30
}: EventCalendarProps) {
  const today = dayjs()
  const [currentDate, setCurrentDate] = useState(initialDate || today)
  const [currentView, setCurrentView] = useState<CalendarView>(initialView)

  const handlePrevious = () => {
    switch (currentView) {
      case 'month':
        setCurrentDate(currentDate.subtract(1, 'month'))
        break
      case 'week':
        setCurrentDate(currentDate.subtract(1, 'week'))
        break
      case 'day':
        setCurrentDate(currentDate.subtract(1, 'day'))
        break
      case 'agenda':
        setCurrentDate(currentDate.subtract(daysInAgenda, 'day'))
        break
    }
  }

  const handleNext = () => {
    switch (currentView) {
      case 'month':
        setCurrentDate(currentDate.add(1, 'month'))
        break
      case 'week':
        setCurrentDate(currentDate.add(1, 'week'))
        break
      case 'day':
        setCurrentDate(currentDate.add(1, 'day'))
        break
      case 'agenda':
        setCurrentDate(currentDate.add(daysInAgenda, 'day'))
        break
    }
  }

  const handleToday = () => {
    setCurrentDate(today)
  }

  const renderView = () => {
    switch (currentView) {
      case 'month':
        return <MonthView currentDate={currentDate} />
      case 'week':
        return <WeekView currentDate={currentDate} />
      case 'day':
        return <DayView currentDate={currentDate} />
      case 'agenda':
        return <AgendaView currentDate={currentDate} daysInAgenda={daysInAgenda} />
    }
  }

  return (
    <div className="flex min-h-[100svh] flex-col">
      {/* Header with navigation and view selector */}
      <div className="flex items-center justify-between border-b p-4">
        {/* Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevious}
            className="rounded-lg border p-2 text-gray-600 hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={handleToday}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Today
          </button>
          <div className="text-lg font-semibold">
            {currentView === 'month' && currentDate.format('MMMM YYYY')}
            {currentView === 'week' && `Week of ${currentDate.format('MMM D, YYYY')}`}
            {currentView === 'day' && currentDate.format('dddd, MMMM D')}
            {currentView === 'agenda' && `${daysInAgenda} days from ${currentDate.format('MMM D')}`}
          </div>
          <button
            onClick={handleNext}
            className="rounded-lg border p-2 text-gray-600 hover:bg-gray-50"
          >
            →
          </button>
        </div>

        {/* View selector */}
        <div className="flex">
          {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize',
                currentView === view
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar view */}
      <div className="flex-1">
        {renderView()}
      </div>
    </div>
  )
}
