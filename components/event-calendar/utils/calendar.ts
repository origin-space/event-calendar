import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import { type CalendarCell } from '../types/calendar'

// Extend dayjs with the localeData plugin to access weekday names
dayjs.extend(localeData)

/**
 * Returns an array of all weekday names (Sunday to Saturday)
 * @returns Array of weekday names as strings
 */
export function getWeekDayNames(): string[] {
  return dayjs.weekdays()
}

/**
 * Returns an array of 24 hour strings formatted as "HH:00"
 * @returns Array of hour strings (00:00 to 23:00)
 */
export function getHours(): string[] {
  return Array.from({ length: 24 }, (_, i) => 
    dayjs().hour(i).format('HH:00')
  )
}

/**
 * Creates an array of calendar cells for a week containing the provided date
 * @param date - A dayjs object representing any date within the target week
 * @returns Array of CalendarCell objects for the entire week
 */
export function getWeekDays(date: dayjs.Dayjs): CalendarCell[] {
  const startOfWeek = date.startOf('week')
  const today = dayjs()

  return Array.from({ length: 7 }, (_, i) => {
    const currentDate = startOfWeek.clone().add(i, 'day')  
    return {
      date: currentDate,
      isToday: currentDate.isSame(today, 'day')
    }
  })
}

/**
 * Creates an array of calendar cells for an entire month view (including padding days)
 * @param date - A dayjs object representing any date within the target month
 * @returns Array of CalendarCell objects from the first day of the first week to the last day of the last week
 */
export function getDaysInMonth(date: dayjs.Dayjs): CalendarCell[] {
  const startOfMonth = date.startOf('month')
  const endOfMonth = date.endOf('month')
  const startDate = startOfMonth.startOf('week')
  const endDate = endOfMonth.endOf('week')
  
  const days: CalendarCell[] = []
  const today = dayjs()
  const targetMonth = date.month()

  let currentDate = startDate.clone()
  
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
    days.push({
      date: currentDate,
      isCurrentMonth: currentDate.month() === targetMonth,
      isToday: currentDate.isSame(today, 'day')
    })
    currentDate = currentDate.add(1, 'day')
  }
  
  return days
}
