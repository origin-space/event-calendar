"use client"

import { useState } from "react"
import dayjs from 'dayjs'

import { EventCalendar } from "@/components/event-calendar"
import { type CalendarEventProps } from "@/components/event-calendar/types/calendar"
import ThemeToggle from "@/components/theme-toggle"

const today = dayjs()

// Sample events data with hardcoded times
const sampleEvents: CalendarEventProps[] = [
  {
    id: "1",
    title: "Annual Planning",
    description: "Strategic planning for next year",
    start: today.subtract(24, 'day').toDate(), // 24 days before today
    end: today.subtract(23, 'day').toDate(), // 23 days before today
    allDay: true,
    color: "sky",
    location: "Main Conference Hall",
  },
  {
    id: "2",
    title: "Project Deadline",
    description: "Submit final deliverables",
    start: today.subtract(9, 'day').set('hour', 13).set('minute', 0).toDate(), // 1:00 PM, 9 days before
    end: today.subtract(9, 'day').set('hour', 15).set('minute', 30).toDate(), // 3:30 PM, 9 days before
    color: "amber",
    location: "Office",
  },
  {
    id: "3",
    title: "Quarterly Budget Review",
    description: "Strategic planning for next year",
    start: today.subtract(13, 'day').toDate(), // 13 days before today
    end: today.subtract(13, 'day').toDate(), // 13 days before today
    allDay: true,
    color: "orange",
    location: "Main Conference Hall",
  },
  {
    id: "4",
    title: "Team Meeting",
    description: "Weekly team sync",
    start: today.set('hour', 10).set('minute', 0).toDate(), // 10:00 AM today
    end: today.set('hour', 11).set('minute', 0).toDate(), // 11:00 AM today
    color: "sky",
    location: "Conference Room A",
  },
  {
    id: "5",
    title: "Lunch with Client",
    description: "Discuss new project requirements",
    start: today.add(1, 'day').set('hour', 12).set('minute', 0).toDate(), // 12:00 PM, 1 day from now
    end: today.add(1, 'day').set('hour', 13).set('minute', 15).toDate(), // 1:15 PM, 1 day from now
    color: "emerald",
    location: "Downtown Cafe",
  },
  {
    id: "6",
    title: "Product Launch",
    description: "New product release",
    start: today.add(3, 'day').toDate(), // 3 days from now
    end: today.add(4, 'day').toDate(), // 6 days from now
    allDay: true,
    color: "violet",
  },
  {
    id: "7",
    title: "Sales Conference",
    description: "Discuss about new clients",
    start: today.add(4, 'day').set('hour', 14).set('minute', 30).toDate(), // 2:30 PM, 4 days from now
    end: today.add(7, 'day').set('hour', 14).set('minute', 45).toDate(), // 2:45 PM, 5 days from now
    color: "rose",
    location: "Downtown Cafe",
  },
  {
    id: "8",
    title: "Team Meeting",
    description: "Weekly team sync",
    start: today.add(5, 'day').set('hour', 9).set('minute', 0).toDate(), // 9:00 AM, 5 days from now
    end: today.add(5, 'day').set('hour', 10).set('minute', 30).toDate(), // 10:30 AM, 5 days from now
    color: "orange",
    location: "Conference Room A",
  },
  {
    id: "9",
    title: "Review contracts",
    description: "Weekly team sync",
    start: today.add(5, 'day').set('hour', 14).set('minute', 0).toDate(), // 2:00 PM, 5 days from now
    end: today.add(5, 'day').set('hour', 15).set('minute', 30).toDate(), // 3:30 PM, 5 days from now
    color: "sky",
    location: "Conference Room A",
  },
  {
    id: "10",
    title: "Team Meeting",
    description: "Weekly team sync",
    start: today.add(5, 'day').set('hour', 9).set('minute', 45).toDate(), // 9:45 AM, 5 days from now
    end: today.add(5, 'day').set('hour', 11).set('minute', 0).toDate(), // 11:00 AM, 5 days from now
    color: "amber",
    location: "Conference Room A",
  },
  {
    id: "11",
    title: "Marketing Strategy Session",
    description: "Quarterly marketing planning",
    start: today.add(9, 'day').set('hour', 10).set('minute', 0).toDate(), // 10:00 AM, 9 days from now
    end: today.add(9, 'day').set('hour', 15).set('minute', 30).toDate(), // 3:30 PM, 9 days from now
    color: "emerald",
    location: "Marketing Department",
  },
  {
    id: "12",
    title: "Annual Shareholders Meeting",
    description: "Presentation of yearly results",
    start: today.add(17, 'day').toDate(), // 17 days from now
    end: today.add(17, 'day').toDate(), // 17 days from now
    allDay: true,
    color: "sky",
    location: "Grand Conference Center",
  },
  {
    id: "13",
    title: "Product Development Workshop",
    description: "Brainstorming for new features",
    start: today.add(26, 'day').set('hour', 9).set('minute', 0).toDate(), // 9:00 AM, 26 days from now
    end: today.add(27, 'day').set('hour', 17).set('minute', 0).toDate(), // 5:00 PM, 27 days from now
    color: "rose",
    location: "Innovation Lab",
  },
]

export default function Home() {
  const [events, setEvents] = useState<CalendarEventProps[]>(sampleEvents)

  const handleEventAdd = (event: CalendarEventProps) => {
    setEvents([...events, event])
  }

  const handleEventUpdate = (updatedEvent: CalendarEventProps) => {
    setEvents(
      events.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    )
  }

  const handleEventDelete = (eventId: string) => {
    setEvents(events.filter((event) => event.id !== eventId))
  }

  return (
    <EventCalendar
      events={events}
      onEventAdd={handleEventAdd}
      onEventUpdate={handleEventUpdate}
      onEventDelete={handleEventDelete}
    />
  )
}
