import { cn } from '@/lib/utils'
import { type CalendarEventProps, type CalendarViewProps } from './types/calendar'
import { getWeekDays, getHours } from './utils/calendar' 
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween';
import { EventItem } from './event-item'; 
import { StartHour, EndHour, WeekCellsHeight, EventHeight, EventGap } from './constants';
import React, { useMemo } from 'react'; 

dayjs.extend(isBetween);

interface PositionedEvent {
  event: CalendarEventProps;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

export function WeekView({ 
  currentDate,
  events = [], 
  onEventSelect, 
  onEventCreate 
}: CalendarViewProps) {
  const days = getWeekDays(currentDate)
  const hours = getHours() 
  const weekStart = useMemo(() => dayjs(currentDate).startOf('week'), [currentDate]);

  const allDayEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
        const isMulti = !eventStart.isSame(eventEnd, 'day');
        return event.allDay || isMulti;
      })
      .filter((event) => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
        return days.some(
          (day) =>
            day.date.isSame(eventStart, 'day') ||
            day.date.isSame(eventEnd, 'day') ||
            day.date.isAfter(eventStart) && day.date.isBefore(eventEnd)
        );
      });
  }, [events, days]);

  const processedDayEvents = useMemo(() => {
    const result = days.map((day) => {
      const dayEvents = events.filter((event) => {
        if (event.allDay) return false; 

        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);
        const isMulti = !eventStart.isSame(eventEnd, 'day');
        if (isMulti) return false; 

        return eventStart.isSame(day.date, 'day'); 
      });

      const sortedEvents = [...dayEvents].sort((a, b) => {
        const aStart = dayjs(a.start);
        const bStart = dayjs(b.start);
        if (aStart.isBefore(bStart)) return -1;
        if (aStart.isAfter(bStart)) return 1;

        const aDuration = dayjs(a.end).diff(aStart, 'minute');
        const bDuration = dayjs(b.end).diff(bStart, 'minute');
        return bDuration - aDuration; 
      });

      const positionedEvents: PositionedEvent[] = [];
      const columns: { event: CalendarEventProps; end: dayjs.Dayjs }[][] = [];

      sortedEvents.forEach((event) => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);

        const startHourFloat = eventStart.hour() + eventStart.minute() / 60;
        const endHourFloat = eventEnd.hour() + eventEnd.minute() / 60;

        const top = (startHourFloat - StartHour) * WeekCellsHeight;
        let height = (endHourFloat - startHourFloat) * WeekCellsHeight;
        if (height === 0) height = WeekCellsHeight / 4; 

        let columnIndex = 0;
        let placed = false;

        while (!placed) {
          const col = columns[columnIndex] || [];
          if (col.length === 0) {
            columns[columnIndex] = col;
            placed = true;
          } else {
            const overlaps = col.some((c) =>
              eventStart.isBefore(c.end) && eventEnd.isAfter(dayjs(c.event.start))
            );
            if (!overlaps) {
              placed = true;
            } else {
              columnIndex++;
            }
          }
        }

        const currentColumn = columns[columnIndex] || [];
        columns[columnIndex] = currentColumn;
        currentColumn.push({ event, end: eventEnd });

        const totalColumnsForOverlap = columns.length; 
        const numOverlappingColumns = columns.reduce((acc, col) => col.some(c => eventStart.isBefore(c.end) && eventEnd.isAfter(dayjs(c.event.start))) ? acc + 1 : acc, 0);

        const widthPercentage = 100 / (columns.length); 
        const leftPercentage = columnIndex * widthPercentage;

        positionedEvents.push({
          event,
          top,
          height,
          left: leftPercentage, 
          width: widthPercentage, 
          zIndex: 10 + columnIndex,
        });
      });

      return positionedEvents;
    });
    return result;
  }, [days, events]);

  const handleEventClick = (event: CalendarEventProps) => {
    console.log('WeekView handleEventClick called with:', event.title);
    if (onEventSelect) {
      console.log('WeekView calling onEventSelect prop (from EventCalendar)');
      onEventSelect(event); 
    }
  };

  const showAllDaySection = allDayEvents.length > 0;

  return (
    <div data-slot="week-view">
      <div className="sticky top-0 z-30 grid grid-cols-8 border-b bg-gray-50 backdrop-blur-md">
        <div className="border-r p-2 text-center text-xs text-gray-500"> 
           <span className="max-[479px]:sr-only">{dayjs().format('Z')}</span> 
        </div>
        {days.map((day) => (
          <div
            key={day.date.toString()}
            className={cn(
              "p-2 text-center text-sm font-medium",
              day.isToday && "text-blue-600"
            )}
          >
            <div className="text-gray-500">
              {day.date.format('ddd')}
            </div>
            <div
              data-today={day.isToday || undefined}
              className={cn(
                "rounded-full p-1",
                day.isToday && "bg-blue-600 text-white"
              )}
            >
              {day.date.date()}
            </div>
          </div>
        ))}
      </div>

      {showAllDaySection && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-8">
            <div className="relative border-r border-gray-200">
              <span className="absolute bottom-0 left-0 h-6 w-full pe-2 text-right text-[10px] text-gray-400 sm:pe-4 sm:text-xs">
                All day
              </span>
            </div>
            {days.map((day, dayIndex) => {
              const dayAllDayEvents = allDayEvents.filter((event) => {
                const eventStart = dayjs(event.start);
                const eventEnd = dayjs(event.end);
                return (
                  eventStart.isSame(day.date, 'day') ||
                  eventEnd.isSame(day.date, 'day') ||
                  (day.date.isAfter(eventStart) && day.date.isBefore(eventEnd))
                );
              });

              return (
                <div
                  key={day.date.toString()}
                  className={cn(
                    "relative border-r border-gray-200 p-0.5 last:border-r-0",
                    day.isToday && "bg-blue-50"
                  )}
                  style={{ minHeight: '28px' }} 
                >
                  {dayAllDayEvents.map((event) => {
                    const eventStart = dayjs(event.start);
                    const isFirstDay = eventStart.isSame(day.date, 'day');
                    const isFirstVisibleDayInWeek = day.date.isSame(weekStart, 'day') && eventStart.isBefore(weekStart);
                    const shouldShowTitle = isFirstDay || isFirstVisibleDayInWeek || (dayIndex === 0 && eventStart.isBefore(days[0].date));
                    
                    return (
                      <EventItem
                        key={`all-day-${event.id}-${day.date.toString()}`}
                        event={event}
                        cellDate={day.date} 
                        eventHeight={EventHeight} 
                        eventGap={EventGap} 
                        uniqueId={`all-day-${event.id}-${day.date.toString()}-${dayIndex}`}
                        onEventSelect={handleEventClick} 
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-8 overflow-hidden">
        <div className="border-r border-gray-200">
          {Array.from({ length: EndHour - StartHour }).map((_, hourIndex) => {
            const currentHour = StartHour + hourIndex;
            // Find the matching hour string for display, or format directly
            const hourLabel = hours.find(h => parseInt(h.split(':')[0]) === currentHour) || `${String(currentHour).padStart(2, '0')}:00`;
            
            return (
              <div
                key={`${dayjs(currentDate).date()}-h${currentHour}`}
                className="relative border-b border-gray-200 p-1 text-right text-xs text-gray-400"
                style={{ height: `${WeekCellsHeight}px` }}
              >
                {hourIndex > 0 && (
                  <span className="absolute -top-2.5 right-1">
                    {hourLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {days.map((day, dayIndex) => (
          <div 
            key={day.date.toString()} 
            className={cn(
                "relative border-r border-gray-200 last:border-r-0",
                day.isToday && "bg-blue-50"
            )}
          >
            {/* Render timed events for the current day column */}
            {(processedDayEvents[dayIndex] ?? []).map((positionedEvent) => {
              return (
                <EventItem
                  key={`timed-${positionedEvent.event.id}-${day.date.toString()}`}
                  event={positionedEvent.event}
                  cellDate={day.date} // Keep for context if needed by EventItem
                  eventHeight={positionedEvent.height} // Pass the calculated height as eventHeight prop
                  eventGap={0} // Keep if EventItem uses it for internal calculations
                  uniqueId={`timed-${positionedEvent.event.id}-${day.date.toString()}-${dayIndex}`}
                  onEventSelect={handleEventClick}
                  displayContext="weekTimed" // New prop to indicate rendering mode
                  style={{
                    '--event-top': `${positionedEvent.top}px`,
                    '--event-height': `${positionedEvent.height}px`,
                    '--event-left': `${positionedEvent.left}%`,
                    '--event-width': `${positionedEvent.width}%`,
                    zIndex: positionedEvent.zIndex, // Pass zIndex directly
                  } as React.CSSProperties}
                />
              );
            })}

            {Array.from({ length: EndHour - StartHour }).map((_, hourIndex) => {
              const currentHour = StartHour + hourIndex;
              // Find the matching hour string for display, or format directly
              const hourLabel = hours.find(h => parseInt(h.split(':')[0]) === currentHour) || `${String(currentHour).padStart(2, '0')}:00`;
              
              return (
                <div
                  key={`${day.date.toString()}-h${currentHour}`}
                  className="relative border-b border-gray-200"
                  style={{ height: `${WeekCellsHeight}px` }}
                >
                  {[0, 1, 2, 3].map((quarter) => {
                    // const quarterHourTime = currentHour + quarter * 0.25; // Not directly used for ID anymore
                    return (
                      <div 
                        key={`${day.date.toString()}-h${currentHour}-q${quarter}`}
                        className={cn(
                          "absolute w-full border-t border-gray-100", 
                          "hover:bg-blue-100/50 cursor-pointer", 
                        )}
                        style={{ 
                            height: `${WeekCellsHeight / 4}px`,
                            top: `${(quarter * WeekCellsHeight) / 4}px` 
                        }}
                        onClick={() => {
                          if (onEventCreate) {
                            const startTime = day.date.hour(currentHour).minute(quarter * 15).second(0).millisecond(0);
                            onEventCreate(startTime.toDate());
                          }
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  )
}