import React from 'react';
import dayjs from 'dayjs';
import { useDraggable, type Active } from '@dnd-kit/core';
import { type CalendarEventProps } from './types/calendar';
import { getEventInfo } from './utils/calendar';
import { cn } from '@/lib/utils';

interface EventItemProps {
  event: CalendarEventProps;
  cellDate: dayjs.Dayjs;
  isOverlay?: boolean;
  activeDragItemForOverlay?: Active | null;
  eventHeight: number;
  eventGap: number;
  uniqueId: string;
  onEventSelect?: (event: CalendarEventProps) => void;
  displayContext?: 'weekTimed' | 'month';
  style?: React.CSSProperties & {
    '--event-top'?: string | number;
    '--event-height'?: string | number;
    '--event-left'?: string | number;
    '--event-width'?: string | number;
  };
}

export function EventItem({
  event,
  cellDate,
  isOverlay = false,
  activeDragItemForOverlay,
  eventHeight,
  eventGap,
  uniqueId,
  onEventSelect,
  displayContext = 'month',
  style: directStylesFromProps,
}: EventItemProps): React.ReactNode {
  const eventInfoResult = getEventInfo(event, cellDate);
  const info = eventInfoResult as Extract<ReturnType<typeof getEventInfo>, { show: true } | { isMultiDay: true }>;
  const {
    width: month_eventWidth = '100%',
    days = 1,
    isStartDay = false,
    isMultiDay = false,
    multiWeek,
    show = false,
    daysInPreviousWeeks = 0,
  } = info ?? {};

  const isWeekTimed = displayContext === 'weekTimed';

  const month_gridTopPosition = event.cellSlot ? event.cellSlot * (eventHeight + eventGap) : 0;

  // Calculate initialTopPosition ensuring it's a number
  let calculatedInitialTop: number;
  if (isWeekTimed) {
    const topStyle = directStylesFromProps?.['--event-top'];
    if (typeof topStyle === 'string') {
      calculatedInitialTop = parseFloat(topStyle) || 0;
    } else if (typeof topStyle === 'number') {
      calculatedInitialTop = topStyle;
    } else {
      calculatedInitialTop = 0;
    }
  } else {
    calculatedInitialTop = month_gridTopPosition;
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: uniqueId,
    data: {
      event: event,
      dragDate: cellDate.toISOString(),
      initialTopPosition: calculatedInitialTop,
      segmentDaysInPrevWeeks: daysInPreviousWeeks,
      displayContext: displayContext,
    },
    disabled: isOverlay || !show,
  });

  if (isOverlay) {
    const overlayTopPosition = activeDragItemForOverlay?.data.current?.initialTopPosition ?? 0;
    const overlayDaysInPrevWeeks = activeDragItemForOverlay?.data.current?.segmentDaysInPrevWeeks ?? 0;
    const opacityClass = 'opacity-75';
    const pointerEventsClass = 'pointer-events-none';

    return (
      <div
        style={{
          '--event-translate': `-${days > 0 ? (overlayDaysInPrevWeeks / days) * 100 : 0}%`,
          '--event-width': `${100 * days}%`,
          '--event-top': `${overlayTopPosition}px`,
          '--event-height': `${eventHeight}px`,
        } as React.CSSProperties}
        className={cn(
          "px-0.5 relative",
          "top-(--event-top) w-(--event-width) translate-x-(--event-translate)"
        )}
      >
        <div
          className={cn(
            'px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded shadow-lg',
            `h-(--event-height)`,
            opacityClass,
            pointerEventsClass
          )}
        >
          <span className="truncate">{event.title}</span>
        </div>
      </div>
    );
  }

  if (!show) {
    return null;
  }

  let rootStyle: React.CSSProperties & {
    '--event-top'?: string | number;
    '--event-height'?: string | number;
    '--event-left'?: string | number;
    '--event-width'?: string | number;
    '--event-z'?: string | number;
  } = {};
  let rootClasses: string = '';

  if (isWeekTimed) {
    rootStyle = directStylesFromProps || {};
    rootClasses = cn(
      'absolute px-0.5',
      'top-(--event-top) left-(--event-left) w-(--event-width) h-(--event-height)'
    );
  } else {
    rootStyle = {
      '--event-width': month_eventWidth,
      '--event-top': `${month_gridTopPosition}px`,
      '--event-z': 10 + (event.cellSlot || 0)
    };
    rootClasses = cn(
      'absolute px-0.5 transition-[top]',
      'top-(--event-top) w-[calc(var(--event-width)-1px)] z-(--event-z)'
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...(show && !isOverlay ? listeners : {})}
      draggable
    >
      <div
        style={rootStyle}
        className={rootClasses}
        data-cell-slot={!isWeekTimed ? event.cellSlot : undefined}
        data-start-day={!isWeekTimed ? (isStartDay || undefined) : undefined}
        data-multiday={!isWeekTimed ? (isMultiDay || undefined) : undefined}
        data-multiweek={!isWeekTimed ? multiWeek : undefined}
        aria-hidden={!show || undefined}
      >
        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onEventSelect?.(event);
          }}
          className={cn(
            'w-full px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded cursor-pointer',
            isWeekTimed ? 'h-full' : `h-(--event-height)`,
            !isWeekTimed && multiWeek === 'previous' && 'rounded-s-none',
            !isWeekTimed && multiWeek === 'next' && 'rounded-e-none',
            !isWeekTimed && multiWeek === 'both' && 'rounded-none',
            isDragging && 'opacity-50'
          )}
        >
          <span className="truncate">{event.title}</span>
        </button>
      </div>
    </div>
  );
}
