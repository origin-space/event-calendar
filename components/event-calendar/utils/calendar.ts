import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isBetween from 'dayjs/plugin/isBetween'
import { CalendarEventProps, type CalendarCell } from '../types/calendar'

// Extend dayjs with required plugins
dayjs.extend(localeData)
dayjs.extend(weekOfYear)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(isBetween)

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
    const start = dayjs(event.start);
    const end = dayjs(event.end);
    // Check if the date is between start and end (inclusive)
    return date.isSame(start, 'day') || date.isSame(end, 'day') || date.isBetween(start, end, 'day', '()'); // Use '()' for exclusive start/end check with isBetween
  });
}

/**
 * Calculates the vertical layout position for events within a given month view.
 * Augments event objects with a `layout` property containing the `cellSlot`.
 * @param events - The original array of CalendarEventProps.
 * @param monthDate - A dayjs object representing the month being viewed.
 * @returns An array of CalendarEventProps objects.
 */
export function calculateEventLayout(
  events: CalendarEventProps[],
  monthDate: dayjs.Dayjs
): CalendarEventProps[] {
  // 1. Determine the date range of the calendar view
  const firstDayOfMonth = monthDate.startOf('month');
  const firstDayOfCalendar = firstDayOfMonth.startOf('week');
  const lastDayOfMonth = monthDate.endOf('month');
  const lastDayOfCalendar = lastDayOfMonth.endOf('week');

  // 2. Filter events that fall within the calendar view range
  const relevantEvents = events.filter(event => {
    const start = dayjs(event.start);
    const end = dayjs(event.end);
    // Check if event overlaps with the calendar view range at all
    return start.isBefore(lastDayOfCalendar.add(1, 'day')) && end.isSameOrAfter(firstDayOfCalendar);
  });

  // 3. Sort events: primarily by start date, secondarily by duration (longer first)
  const sortedEvents = [...relevantEvents].sort((a, b) => {
    const startDiff = dayjs(a.start).diff(dayjs(b.start));
    if (startDiff !== 0) return startDiff;
    const endDiff = dayjs(b.end).diff(dayjs(a.end)); // Longer events first
    return endDiff;
  });

  // 4. Calculate layout
  const occupiedSlots = new Map<string, Set<number>>(); // Key: 'YYYY-MM-DD', Value: Set of occupied cellSlots
  const eventsWithLayout: CalendarEventProps[] = [];

  for (const event of sortedEvents) {
    const start = dayjs(event.start);
    const end = dayjs(event.end);
    let currentY = 0;
    let positionFound = false;

    // Find the first available vertical position (cellSlot)
    while (!positionFound) {
      let slotAvailable = true;
      // Iterate through each day the event spans *within the calendar view*
      let currentDay = start.isBefore(firstDayOfCalendar) ? firstDayOfCalendar : start;
      const lastDay = end.isAfter(lastDayOfCalendar) ? lastDayOfCalendar : end;

      while (currentDay.isSameOrBefore(lastDay, 'day')) {
        const dateStr = currentDay.format('YYYY-MM-DD');
        const dailyOccupied = occupiedSlots.get(dateStr);
        if (dailyOccupied?.has(currentY)) {
          slotAvailable = false;
          break; // Slot is occupied on this day, try next cellSlot
        }
        currentDay = currentDay.add(1, 'day');
      }

      if (slotAvailable) {
        // Found a free slot for the entire duration within the view
        positionFound = true;
        // Mark the slot as occupied for all relevant days
        currentDay = start.isBefore(firstDayOfCalendar) ? firstDayOfCalendar : start; // Reset loop
         while (currentDay.isSameOrBefore(lastDay, 'day')) {
          const dateStr = currentDay.format('YYYY-MM-DD');
          if (!occupiedSlots.has(dateStr)) {
            occupiedSlots.set(dateStr, new Set());
          }
          occupiedSlots.get(dateStr)!.add(currentY);
          currentDay = currentDay.add(1, 'day');
        }
        // Add layout info to the event
        eventsWithLayout.push({
          ...event,
          cellSlot: currentY
        });
      } else {
        // Increment cellSlot and check again
        currentY++;
      }
    }
  }

  return eventsWithLayout;
}


/**
 * Calculates display properties for an event segment on a specific calendar cell date.
 * Determines width, horizontal position, multi-week status, and visibility for that day.
 * Assumes the event *does* occur on this cellDate.
 * @param event - The event object (must occur on cellDate).
 * @param cellDate - The specific date of the calendar cell being rendered.
 * @returns An object containing display properties for the event segment on this day.
 */
export function getEventInfo(event: CalendarEventProps, cellDate: dayjs.Dayjs) {
  const start = dayjs(event.start);
  const end = dayjs(event.end);

  // --- Visibility Check ---
  // An event segment should be shown if:
  // 1. It's the actual start day of the event.
  // OR
  // 2. It's the start of a new week (e.g., Sunday/Monday depending on locale)
  //    AND the event continues into this week.
  const isStartDay = cellDate.isSame(start, 'day');
  const isNewWeekStart = cellDate.day() === dayjs().startOf('week').day(); // Locale-aware start of week
  const show = isStartDay || (isNewWeekStart && cellDate.isAfter(start, 'day') && cellDate.isSameOrBefore(end, 'day'));

  if (!show) {
    return { show: false }; // Don't render this segment visually
  }

  // --- Calculate Width and Position ---
  const startOfWeek = cellDate.startOf('week');
  const endOfWeek = cellDate.endOf('week');

  // Determine the effective start and end for *this week's segment*
  const segmentStart = start.isBefore(startOfWeek) ? startOfWeek : start;
  const segmentEnd = end.isAfter(endOfWeek) ? endOfWeek : end;

   // Calculate the start day for *this specific segment* relative to the week start
  const segmentStartDayOfWeek = segmentStart.isSameOrAfter(startOfWeek) ? segmentStart.day() : 0;

  // Calculate the number of days this segment spans *within this week*
  const daysInSegmentThisWeek = segmentEnd.diff(segmentStart, 'day') + 1;

  // Calculate left offset based on the segment's start day within the week
  const left = `${((segmentStartDayOfWeek * 100) / 7).toFixed(2)}%`;

  // Calculate width based on the number of days in the segment for this week
  const width = `${((daysInSegmentThisWeek * 100) / 7).toFixed(2)}%`;


  // --- Determine Multi-Week Status ---
  let multiWeek: 'previous' | 'next' | 'both' | undefined;
  const eventStartWeek = start.startOf('week');
  const eventEndWeek = end.startOf('week');
  const currentCellWeek = cellDate.startOf('week');

  const startsBeforeThisWeek = eventStartWeek.isBefore(currentCellWeek);
  const endsAfterThisWeek = eventEndWeek.isAfter(currentCellWeek);

  if (startsBeforeThisWeek && endsAfterThisWeek) {
    multiWeek = 'both'; // Spans across previous, current, and next weeks
  } else if (startsBeforeThisWeek && eventEndWeek.isSame(currentCellWeek)) {
    multiWeek = 'previous'; // Starts in a previous week, ends in this week
  } else if (eventStartWeek.isSame(currentCellWeek) && endsAfterThisWeek) {
    multiWeek = 'next'; // Starts in this week, ends in a future week
  }
  // else: Starts and ends within the same week (multiWeek is undefined)

  return {
    left: left,
    width: width,
    isStartDay: cellDate.isSame(start, 'day'), // Still useful for potential styling
    isMultiDay: end.diff(start, 'day') > 0,
    multiWeek: multiWeek,
    show: true // We already determined it should be shown
  };
}

