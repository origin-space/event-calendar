'use client'

import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { type CalendarView, type CalendarProps, type CalendarEventProps } from './types/calendar'
import { MonthView } from './month-view'
import { WeekView } from './week-view'
import { DayView } from './day-view'
import { AgendaView } from './agenda-view'

export function EventCalendar({
  initialView = 'month',
  daysInAgenda = 30,
  events,
}: CalendarProps) {
  const today = dayjs()
  const [currentDate, setCurrentDate] = useState(today)
  const [view, setView] = useState<CalendarView>(initialView)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState<CalendarEventProps[]>(events || [])

  // Add keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea or contentEditable element
      // or if the event dialog is open
      if (
        isEventDialogOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case "m":
          setView("month")
          break
        case "w":
          setView("week")
          break
        case "d":
          setView("day")
          break
        case "a":
          setView("agenda")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isEventDialogOpen])  

  const handlePrevious = () => {
    switch (view) {
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
    switch (view) {
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
    switch (view) {
      case 'month':
        return <MonthView currentDate={currentDate} events={selectedEvents} onEventUpdate={handleEventUpdate} />
      case 'week':
        return <WeekView currentDate={currentDate} events={events} />
      case 'day':
        return <DayView currentDate={currentDate} events={events} />
      case 'agenda':
        return <AgendaView currentDate={currentDate} events={events} daysInAgenda={daysInAgenda} />
    }
  }

  const handleEventUpdate = (updatedEvent: CalendarEventProps) => {
    console.log("Parent: handleEventUpdate called with:", updatedEvent);
    setSelectedEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
  };

  return (
    <div className="flex h-[100svh] flex-col">
      {/* Header with navigation and view selector */}
      <div className="shrink-0 flex items-center justify-between border-b overflow-hidden">
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
            {view === 'month' && currentDate.format('MMMM YYYY')}
            {view === 'week' && `Week of ${currentDate.format('MMM D, YYYY')}`}
            {view === 'day' && currentDate.format('dddd, MMMM D')}
            {view === 'agenda' && `${daysInAgenda} days from ${currentDate.format('MMM D')}`}
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
              onClick={() => setView(view)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize',
                view === view
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
      {renderView()}
    </div>
  )
}