import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { CalendarEventProps, type CalendarCell } from '../types/calendar'

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
    `${String(i).padStart(2, '0')}:00`
  );
}

/**
 * Creates an array of calendar cells for a week containing the provided date
 * @param date - A dayjs object representing any date within the target week
 * @returns Array of CalendarCell objects for the entire week
 */
export function getWeekDays(date: dayjs.Dayjs): CalendarCell[] {
  const startOfWeek = date.startOf('week')
  const today = dayjs()

  return getWeekDayNames().map((_, i) => {
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
  const today = dayjs();
  const firstDayOfMonth = date.startOf('month');
  const firstDayOfCalendar = firstDayOfMonth.startOf('week'); // Locale-aware start
  const lastDayOfMonth = date.endOf('month');
  const lastDayOfCalendar = lastDayOfMonth.endOf('week'); // Locale-aware end

  const monthGrid: CalendarCell[][] = [];
  let currentDay = firstDayOfCalendar;
  // Calculate the exact number of days in the grid
  const totalDaysInGrid = lastDayOfCalendar.diff(firstDayOfCalendar, 'day') + 1;

  if (totalDaysInGrid <= 0 || totalDaysInGrid % 7 !== 0) {
      // Basic sanity check, should typically be 28, 35, or 42
      console.warn("Calculated grid days seem unusual:", totalDaysInGrid);
      return []
  }

  const weeksInGrid = totalDaysInGrid / 7; // Should be an integer

  for (let i = 0; i < weeksInGrid; i++) {
      const week: CalendarCell[] = [];
      for (let j = 0; j < 7; j++) {
          week.push({
              date: currentDay,
              isCurrentMonth: currentDay.month() === date.month(),
              isToday: currentDay.isSame(today, 'day'),
          });
          currentDay = currentDay.add(1, 'day');
      }
      monthGrid.push(week);
  }
  return monthGrid;
}

/**
 * Returns an array of events that are happening on a specific day
 * @param date - A dayjs object representing any date
 * @param events - An array of CalendarEventProps objects
 * @returns Array of CalendarEventProps objects that are happening on the specified day
 */
export function getEventsForDay(date: dayjs.Dayjs, events: CalendarEventProps[]): CalendarEventProps[] {
  return events.filter(event => {
    const start = dayjs(event.start)
    const end = dayjs(event.end)
    return date.isSame(start, 'day') || 
           date.isSame(end, 'day') || 
           (date.isAfter(start, 'day') && date.isBefore(end, 'day'))
  })
}

/**
 * Calculates the position of an event on a calendar cell
 * @param event - The event to calculate the position for
 * @param cellDate - The date of the calendar cell
 * @returns An object containing the position of the event
 */
export function getEventInfo(event: CalendarEventProps, cellDate: dayjs.Dayjs) {
  const start = dayjs(event.start)
  const end = dayjs(event.end)
  const isStartDay = cellDate.isSame(start, 'day')
  const isNewWeekStart = cellDate.day() === 0 // Sunday
  const daysInWeek = 7 - cellDate.day() // Days remaining in current week
  const daysDiff = end.diff(start, 'day') + 1
  const remainingDays = end.diff(cellDate, 'day') + 1
  
  // If it's the start day or a new week start, show the event
  if (isStartDay || (isNewWeekStart && remainingDays > 0)) {
    const widthDays = isStartDay ? Math.min(daysDiff, daysInWeek) : Math.min(remainingDays, 7)
    
    // Determine if event spans multiple weeks
    let multiWeek: 'previous' | 'next' | 'both' | undefined
    const startWeek = start.startOf('week')
    const endWeek = end.startOf('week')
    const currentWeek = cellDate.startOf('week')        
    
    if (startWeek.isSame(currentWeek) && !endWeek.isSame(currentWeek)) {
      multiWeek = 'next'
    } else if (!startWeek.isSame(currentWeek) && endWeek.isSame(currentWeek)) {
      multiWeek = 'previous'
    } else if (!startWeek.isSame(currentWeek) && !endWeek.isSame(currentWeek)) {
      multiWeek = 'both'
    }

    return {
      left: isStartDay ? `${((cellDate.day() * 100) / 7).toFixed(2)}%` : '0%',
      width: `${((widthDays * 100) / 7).toFixed(2)}%`,
      isStartDay,
      isMultiDay: daysDiff > 1,
      multiWeek,
      show: true
    }
  }
  
  return { show: false }
}