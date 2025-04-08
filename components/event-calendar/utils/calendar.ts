import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { type CalendarCell } from '../types/calendar'

// Extend dayjs with required plugins
dayjs.extend(localeData)
dayjs.extend(weekOfYear)
dayjs.extend(isSameOrBefore)

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
 * @returns Array of arrays, where each inner array represents a week of CalendarCell objects
 */
export function getDaysInMonth(date: dayjs.Dayjs): CalendarCell[][] {
  const today = dayjs()
  const firstDayOfMonth = date.startOf('month')
  const firstDayOfCalendar = firstDayOfMonth.startOf('week')
  const lastDayOfMonth = date.endOf('month')
  const lastDayOfCalendar = lastDayOfMonth.endOf('week')
  
  // Get the number of weeks to display
  const weeksToDisplay = lastDayOfCalendar.week() - firstDayOfCalendar.week() + 1

  // Generate weeks
  return Array.from({ length: weeksToDisplay }, (_, weekIndex) => {
    const weekStart = firstDayOfCalendar.add(weekIndex, 'week')
    
    // Generate days for this week
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const currentDate = weekStart.add(dayIndex, 'day')
      return {
        date: currentDate,
        isCurrentMonth: currentDate.month() === date.month(),
        isToday: currentDate.isSame(today, 'day')
      }
    })
  })
}
