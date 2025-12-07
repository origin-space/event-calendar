"use client"

import { useMemo } from "react"
import type { DraggableAttributes } from "@dnd-kit/core"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { differenceInMinutes, format, getMinutes, isPast, Locale } from "date-fns"

import { cn } from "@/lib/utils"
import {
  getBorderRadiusClasses,
  getEventColorClasses,
  type CalendarEvent,
} from "@/components/event-calendar"
import { useTranslation } from "react-i18next"
import { useLocale } from "@/hooks/use-locale"

// Using date-fns format with custom formatting:
// 'h' - hours (1-12)
// 'a' - am/pm
// ':mm' - minutes with leading zero (only if the token 'mm' is present)
const formatTimeWithOptionalMinutes = (date: Date, locale: Locale) => {
  return format(date, getMinutes(date) === 0 ? "ha" : "h:mma", { locale }).toLowerCase()
}

interface EventWrapperProps {
  event: CalendarEvent
  isFirstDay?: boolean
  isLastDay?: boolean
  isDragging?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
  children: React.ReactNode
  currentTime?: Date
  dndListeners?: SyntheticListenerMap
  dndAttributes?: DraggableAttributes
  onMouseDown?: (e: React.MouseEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
}

// Shared wrapper component for event styling
function EventWrapper({
  event,
  isFirstDay = true,
  isLastDay = true,
  isDragging,
  onClick,
  className,
  children,
  currentTime,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: EventWrapperProps) {
  // Always use the currentTime (if provided) to determine if the event is in the past
  const displayEnd = currentTime
    ? new Date(
        new Date(currentTime).getTime() +
          (new Date(event.end).getTime() - new Date(event.start).getTime())
      )
    : new Date(event.end)

  const isEventInPast = isPast(displayEnd)

  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex h-full w-full overflow-hidden px-1 text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] data-dragging:cursor-grabbing data-dragging:shadow-lg data-past-event:line-through sm:px-2",
        getEventColorClasses(event.color),
        getBorderRadiusClasses(isFirstDay, isLastDay),
        className
      )}
      data-dragging={isDragging || undefined}
      data-past-event={isEventInPast || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      {children}
    </button>
  )
}

interface EventItemProps {
  event: CalendarEvent
  view: "month" | "week" | "day" | "agenda"
  isDragging?: boolean
  onClick?: (e: React.MouseEvent) => void
  showTime?: boolean
  currentTime?: Date // For updating time during drag
  isFirstDay?: boolean
  isLastDay?: boolean
  children?: React.ReactNode
  className?: string
  dndListeners?: SyntheticListenerMap
  dndAttributes?: DraggableAttributes
  onMouseDown?: (e: React.MouseEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
}

export function EventItem({
  event,
  view,
  isDragging,
  onClick,
  showTime,
  currentTime,
  isFirstDay = true,
  isLastDay = true,
  children,
  className,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: EventItemProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const eventColor = event.color

  // Use the provided currentTime (for dragging) or the event's actual time
  const displayStart = useMemo(() => {
    return currentTime || new Date(event.start)
  }, [currentTime, event.start])

  const displayEnd = useMemo(() => {
    return currentTime
      ? new Date(
          new Date(currentTime).getTime() +
            (new Date(event.end).getTime() - new Date(event.start).getTime())
        )
      : new Date(event.end)
  }, [currentTime, event.start, event.end])

  // Calculate event duration in minutes
  const durationMinutes = useMemo(() => {
    return differenceInMinutes(displayEnd, displayStart)
  }, [displayStart, displayEnd])

  const getEventTime = () => {
    if (event.allDay) return t("all_day")

    // For short events (less than 45 minutes), only show start time
    if (durationMinutes < 45) {
      return formatTimeWithOptionalMinutes(displayStart, locale)
    }

    // For longer events, show both start and end time
    return `${formatTimeWithOptionalMinutes(displayStart, locale)} - ${formatTimeWithOptionalMinutes(displayEnd, locale)}`
  }

  if (view === "month") {
    return (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "mt-[var(--event-gap)] h-[var(--event-height)] items-center text-[10px] sm:text-xs",
          className
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {children || (
          <span className="truncate">
            {!event.allDay && (
              <span className="truncate text-[11px] font-normal opacity-70">
                {formatTimeWithOptionalMinutes(displayStart, locale)}&nbsp;
              </span>
            )}
            {event.title}
          </span>
        )}
      </EventWrapper>
    )
  }

  if (view === "week" || view === "day") {
    return (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "py-1",
          durationMinutes < 45 ? "items-center" : "flex-col",
          view === "week" ? "text-[10px] sm:text-xs" : "text-xs",
          className
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {durationMinutes < 45 ? (
          <div className="truncate">
            {event.title}&nbsp;
            {showTime && (
              <span className="opacity-70">
                {formatTimeWithOptionalMinutes(displayStart, locale)}
              </span>
            )}
          </div>
        ) : (
          <>
            <div className="truncate font-medium">{event.title}</div>
            {showTime && (
              <div className="truncate font-normal opacity-70 sm:text-[11px]">
                {getEventTime()}
              </div>
            )}
          </>
        )}
      </EventWrapper>
    )
  }

  // Agenda view - kept separate since it's significantly different
  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:line-through data-past-event:opacity-90",
        getEventColorClasses(eventColor),
        className
      )}
      data-past-event={isPast(new Date(event.end)) || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      <div className="text-sm font-medium">{event.title}</div>
      <div className="text-xs opacity-70">
        {event.allDay ? (
          <span>
            {t("all_day")}
          </span>
        ) : (
          <span className="uppercase">
            {formatTimeWithOptionalMinutes(displayStart, locale)} -&nbsp;
            {formatTimeWithOptionalMinutes(displayEnd, locale)}
          </span>
        )}
        {event.location && (
          <>
            <span className="px-1 opacity-35"> · </span>
            <span>{event.location}</span>
          </>
        )}
      </div>
      {event.description && (
        <div className="my-1 text-xs opacity-90">{event.description}</div>
      )}
    </button>
  )
}
