import dayjs from 'dayjs'

export type CalendarView = 'month' | 'week' | 'day' | 'agenda'

export interface CalendarCell {
  date: dayjs.Dayjs
  isCurrentMonth?: boolean
  isToday?: boolean
}

export interface CalendarViewProps {
  currentDate: dayjs.Dayjs
}

export interface EventCalendarProps {
  initialDate?: dayjs.Dayjs
  initialView?: CalendarView
  daysInAgenda?: number
} 