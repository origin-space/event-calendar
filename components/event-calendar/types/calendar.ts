import dayjs from 'dayjs'

export type CalendarView = 'month' | 'week' | 'day' | 'agenda'

export interface CalendarCell {
  date: dayjs.Dayjs
  isCurrentMonth?: boolean
  isToday?: boolean
}

export interface CalendarViewProps {
  currentDate: dayjs.Dayjs
  events?: CalendarEventProps[]
  eventHeight?: number
  eventGap?: number
}

export interface CalendarProps {
  initialDate?: dayjs.Dayjs
  initialView?: CalendarView
  daysInAgenda?: number
  events?: CalendarEventProps[]
  onEventAdd?: (event: CalendarEventProps) => void
  onEventUpdate?: (event: CalendarEventProps) => void
  onEventDelete?: (eventId: string) => void  
} 

export interface CalendarEventProps {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay?: boolean
  color?: EventColorProps
  location?: string
}

export type EventColorProps =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange"