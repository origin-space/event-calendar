'use client'

import { useEffect, useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { type CalendarView, type CalendarProps, type CalendarEventProps } from './types/calendar'
import { MonthView } from './month-view'
import { WeekView } from './week-view'
import { DayView } from './day-view'
import { AgendaView } from './agenda-view'
import { EventDialog } from './event-dialog'
import { toast } from "sonner"

export function EventCalendar({
  events = [],
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  initialView = 'month',
  daysInAgenda = 30,
}: CalendarProps) {
  const today = dayjs()
  const [currentDate, setCurrentDate] = useState(today)
  const [view, setView] = useState<CalendarView>(initialView)
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventProps | null>(null)

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

  const handleEventSelect = (event: CalendarEventProps) => {
    console.log("Event selected:", event) // Debug log
    setSelectedEvent(event)
    setIsEventDialogOpen(true)
  }

  const handleEventCreate = (startTime: Date) => {
    console.log("Creating new event at:", startTime) // Debug log

    // Snap to 15-minute intervals
    const minutes = startTime.getMinutes()
    const remainder = minutes % 15
    if (remainder !== 0) {
      if (remainder < 7.5) {
        // Round down to nearest 15 min
        startTime.setMinutes(minutes - remainder)
      } else {
        // Round up to nearest 15 min
        startTime.setMinutes(minutes + (15 - remainder))
      }
      startTime.setSeconds(0)
      startTime.setMilliseconds(0)
    }

    const newEvent: CalendarEventProps = {
      id: "",
      title: "",
      start: startTime,
      end: dayjs(startTime).add(1, 'hour').toDate(),
      allDay: false,
    }
    setSelectedEvent(newEvent)
    setIsEventDialogOpen(true)
  }

  const handleEventSave = (event: CalendarEventProps) => {
    if (event.id) {
      onEventUpdate?.(event)
      // Show toast notification when an event is updated
      toast(`Event "${event.title}" updated`, {
        description: dayjs(event.start).format("MMM D, YYYY"),
        position: "bottom-left",
      })
    } else {
      onEventAdd?.({
        ...event,
        id: Math.random().toString(36).substring(2, 11),
      })
      // Show toast notification when an event is added
      toast(`Event "${event.title}" added`, {
        description: dayjs(event.start).format("MMM D, YYYY"),
        position: "bottom-left",
      })
    }
    setIsEventDialogOpen(false)
    setSelectedEvent(null)
  }

  const handleEventDelete = (eventId: string) => {
    const deletedEvent = events.find((e) => e.id === eventId)
    onEventDelete?.(eventId)
    setIsEventDialogOpen(false)
    setSelectedEvent(null)

    // Show toast notification when an event is deleted
    if (deletedEvent) {
      toast(`Event "${deletedEvent.title}" deleted`, {
        description: dayjs(deletedEvent.start).format("MMM D, YYYY"),
        position: "bottom-left",
      })
    }
  }

  const handleEventUpdate = (eventToUpdate: CalendarEventProps) => {
    const modifiedEvent = { ...eventToUpdate };

    // If the event is not an all-day event, ensure cellSlot is undefined.
    // cellSlot is primarily for MonthView or all-day sections for row stacking.
    if (!modifiedEvent.allDay) {
      delete modifiedEvent.cellSlot;
    }

    onEventUpdate?.(modifiedEvent);

    // Show toast notification when an event is updated via drag and drop
    toast(`Event "${modifiedEvent.title}" moved`, {
      description: dayjs(modifiedEvent.start).format("MMM D, YYYY"),
      position: "bottom-left",
    })
  }

  const viewTitle = useMemo(() => {
    if (view === "month") {
      return currentDate.format("MMMM YYYY")
    } else if (view === "week") {
      const start = currentDate.startOf('week')
      const end = currentDate.endOf('week')
      if (start.isSame(end, 'month')) {
        return start.format("MMMM YYYY")
      } else {
        return `${start.format("MMM")} - ${end.format("MMM YYYY")}`
      }
    } else if (view === "day") {
      return (
        <>
          <span className="min-[480px]:hidden" aria-hidden="true">
            {currentDate.format("MMM D, YYYY")}
          </span>
          <span className="max-[479px]:hidden min-md:hidden" aria-hidden="true">
            {currentDate.format("MMMM D, YYYY")}
          </span>
          <span className="max-md:hidden">
            {currentDate.format("ddd MMMM D, YYYY")}
          </span>
        </>
      )
    } else if (view === "agenda") {
      // Show the month range for agenda view
      const start = currentDate
      const end = currentDate.add(daysInAgenda - 1, 'day')

      if (start.isSame(end, 'month')) {
        return start.format("MMMM YYYY")
      } else {
        return `${start.format("MMM")} - ${end.format("MMM YYYY")}`
      }
    } else {
      return currentDate.format("MMMM YYYY")
    }
  }, [currentDate, view, daysInAgenda])  

  const renderView = () => {
    switch (view) {
      case 'month':
        return <MonthView currentDate={currentDate} events={events} onEventUpdate={handleEventUpdate} onEventSelect={handleEventSelect} onEventCreate={handleEventCreate} />
      case 'week':
        return <WeekView currentDate={currentDate} events={events} onEventSelect={handleEventSelect} onEventCreate={handleEventCreate} />
      case 'day':
        return <DayView currentDate={currentDate} events={events} onEventSelect={handleEventSelect} onEventCreate={handleEventCreate} />
      case 'agenda':
        return <AgendaView currentDate={currentDate} events={events} daysInAgenda={daysInAgenda} onEventSelect={handleEventSelect} />
    }
  }

  return (
    <div className="flex min-h-[100svh] flex-col">
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

      <EventDialog
        event={selectedEvent}
        isOpen={isEventDialogOpen}
        onClose={() => {
          setIsEventDialogOpen(false)
          setSelectedEvent(null)
        }}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
      />      
    </div>
  )
}