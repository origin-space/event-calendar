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
  if (!events) return [];
  return events.filter(event => {
    const start = dayjs(event.start);
    const end = dayjs(event.end);
    // Check if the date is between start and end (inclusive)
    return date.isSame(start, 'day') || date.isSame(end, 'day') || date.isBetween(start, end, 'day', '()'); // Use '()' for exclusive start/end check with isBetween
  });
}

/**
 * Calculates the vertical layout position for events within a given WEEK view.
 * Augments event objects with a `cellSlot` property.
 * @param allEvents - The original array of CalendarEventProps potentially relevant.
 * @param weekStartDate - A dayjs object representing the start of the week being viewed.
 * @returns An array of CalendarEventProps objects relevant to the week, augmented with `cellSlot`.
 */
export function calculateWeeklyEventLayout(
  allEvents: CalendarEventProps[],
  weekStartDate: dayjs.Dayjs
): CalendarEventProps[] {
  // 1. Determine the date range of the specific WEEK view
  const viewStartDate = weekStartDate.startOf('week');
  const viewEndDate = weekStartDate.endOf('week');

  // 2. Filter events that fall within the WEEK view range
  const relevantEvents = allEvents.filter(event => {
    const start = dayjs(event.start);
    const end = dayjs(event.end);
    // Check if event overlaps with the week view range at all
    return end.isSameOrAfter(viewStartDate, 'day') && start.isSameOrBefore(viewEndDate, 'day');
  });

  // 3. Sort events: All-day first (multi > single), then non-all-day (multi > single), then by start date, then duration
  const sortedEvents = [...relevantEvents].sort((a, b) => {
    const aAllDay = a.allDay ?? false;
    const bAllDay = b.allDay ?? false;

    // Prioritize all-day events
    if (aAllDay !== bAllDay) {
      return aAllDay ? -1 : 1; // All-day comes first
    }

    // Within the same allDay status, prioritize multi-day events
    const aIsMultiDay = dayjs(a.end).diff(dayjs(a.start), 'day') > 0;
    const bIsMultiDay = dayjs(b.end).diff(dayjs(b.start), 'day') > 0;
    if (aIsMultiDay !== bIsMultiDay) {
      return aIsMultiDay ? -1 : 1; // Multi-day comes first
    }

    // If allDay and multi-day status are the same, sort by start date
    const startDiff = dayjs(a.start).diff(dayjs(b.start));
    if (startDiff !== 0) {
      return startDiff; // Earlier start date comes first
    }

    // If start dates are the same, sort by duration (longer first)
    const endDiff = dayjs(b.end).diff(dayjs(a.end));
    return endDiff; // Longer event comes first
  });

  // 4. Calculate layout FOR THIS WEEK
  const occupiedSlots = new Map<string, Set<number>>();
  const eventsWithLayout: CalendarEventProps[] = [];

  for (const event of sortedEvents) {
    const start = dayjs(event.start);
    const end = dayjs(event.end);
    let currentY = 0;
    let positionFound = false;

    // Find the first available vertical position (cellSlot)
    while (!positionFound) {
      let slotAvailable = true;
      // Iterate through each day the event spans *within the week view*
      let currentDay = start.isBefore(viewStartDate) ? viewStartDate : start;
      const lastDayInWeek = end.isAfter(viewEndDate) ? viewEndDate : end;

      while (currentDay.isSameOrBefore(lastDayInWeek, 'day')) {
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
        currentDay = start.isBefore(viewStartDate) ? viewStartDate : start;
         while (currentDay.isSameOrBefore(lastDayInWeek, 'day')) {
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

/**
 * Determines the events to be displayed and the count of hidden events for a specific day cell.
 * Considers the maximum visible count and events hidden elsewhere within the same week.
 * @param cellDate The date of the cell being processed.
 * @param layoutForThisWeek Events layout calculated for the entire week containing cellDate.
 * @param hiddenIdsThisWeek Set of event IDs hidden elsewhere in the same week.
 * @param visibleCount Maximum number of events to display before showing "+N more".
 * @returns An object containing { visibleEvents, hiddenEventsCount, sortedEvents }.
 */
export function getDayVisibilityData(
    cellDate: dayjs.Dayjs,
    layoutForThisWeek: CalendarEventProps[],
    hiddenIdsThisWeek: Set<string | number>,
    visibleCount: number
): { visibleEvents: CalendarEventProps[]; hiddenEventsCount: number; sortedEvents: CalendarEventProps[] } {

    const dayEvents = getEventsForDay(cellDate, layoutForThisWeek);

    // Return early if no events for the day
    if (dayEvents.length === 0) {
        return { visibleEvents: [], hiddenEventsCount: 0, sortedEvents: [] };
    }

    // Calculate original overflow based on all events for the day (used for slicing logic)
    const originalOverflowingItems = Math.max(0, dayEvents.length - visibleCount);

    // Sort events: All-day first (multi > single), then non-all-day (multi > single), then by cell slot
    const sortedEvents = [...dayEvents].sort((a, b) => {
      const aAllDay = a.allDay ?? false;
      const bAllDay = b.allDay ?? false;

      // Prioritize all-day events
      if (aAllDay !== bAllDay) {
        return aAllDay ? -1 : 1; // All-day comes first
      }

      // Within the same allDay status, prioritize multi-day events
      const aIsMultiDay = dayjs(a.end).diff(dayjs(a.start), 'day') > 0;
      const bIsMultiDay = dayjs(b.end).diff(dayjs(b.start), 'day') > 0;
      if (aIsMultiDay !== bIsMultiDay) {
        return aIsMultiDay ? -1 : 1; // Multi-day comes first
      }

      // If allDay and multi-day status are the same, sort by cellSlot
      // (Using cellSlot here as primary tie-breaker for visibility logic,
      // as start date/duration were already handled in layout calculation)
      const slotA = a.cellSlot ?? 0;
      const slotB = b.cellSlot ?? 0;
      return slotA - slotB;
    });

    // Filter out events that are hidden elsewhere within the same week
    const displayableEvents = sortedEvents.filter(event => !hiddenIdsThisWeek.has(event.id));

    // Determine the actual visible events using the original slicing structure applied to *displayable* events
    const visibleEvents = originalOverflowingItems > 0
      ? displayableEvents.slice(0, visibleCount > 0 ? visibleCount - 1 : 0)
      : displayableEvents;

    // Calculate the final count of hidden events for this day
    const hiddenEventsCount = sortedEvents.length - visibleEvents.length;

    return { visibleEvents, hiddenEventsCount, sortedEvents };
}

/**
 * Calculates the set of event IDs that are hidden due to overflow on any day within a given week.
 * @param week An array of CalendarCell objects representing the week.
 * @param layoutForThisWeek The layout data (events with cellSlots) for the week.
 * @param visibleCount The maximum number of events visible per day.
 * @returns A Set containing the IDs of events hidden somewhere in the week.
 */
export function calculateHiddenIdsForWeek(
    week: CalendarCell[],
    layoutForThisWeek: CalendarEventProps[],
    visibleCount: number
): Set<string | number> {
    const hiddenIdsThisWeek = new Set<string | number>();

    if (visibleCount <= 0 || !week || week.length === 0) {
        return hiddenIdsThisWeek; // No hiding if no limit or invalid week
    }

    week.forEach(cellInWeek => {
        const dayEventsForCheck = getEventsForDay(cellInWeek.date, layoutForThisWeek);

        // No need to sort if checking length is enough, but sorting helps find *which* are hidden
        if (dayEventsForCheck.length > visibleCount) {
            const sortedEventsForCheck = [...dayEventsForCheck].sort((a, b) => (a.cellSlot ?? 0) - (b.cellSlot ?? 0));
            // Slice to get the events that are actually hidden based on the limit
            // Original logic showed (visibleCount - 1) items when overflowing
            const hiddenOnThisDay = sortedEventsForCheck.slice(visibleCount - 1);
            hiddenOnThisDay.forEach(event => hiddenIdsThisWeek.add(event.id));
        }
    });

    return hiddenIdsThisWeek;
}
