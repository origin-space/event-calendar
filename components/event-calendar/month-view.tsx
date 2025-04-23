import React, { useMemo, useState } from "react";
import { useEventVisibility } from "./hooks/use-event-visibility";
import { type CalendarViewProps, CalendarEventProps } from './types/calendar';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, DragOverlay, DragOverEvent } from '@dnd-kit/core';
import { getDaysInMonth, getWeekDayNames, calculateWeeklyEventLayout, calculateHiddenIdsForWeek, getEventInfo } from './utils/calendar';
import dayjs from 'dayjs';
import { DroppableDayCell } from './droppable-day-cell';

export function MonthView({ currentDate, events = [], eventHeight = 24, eventGap = 2, onEventUpdate }: CalendarViewProps & { onEventUpdate?: (updatedEvent: CalendarEventProps) => void }) {
  const weekDays = getWeekDayNames()
  const weeks = getDaysInMonth(currentDate)

  const { contentRef, getVisibleEventCount } = useEventVisibility({
    eventHeight: eventHeight,
    eventGap: eventGap,
  });

  const weeklyLayouts = useMemo(() => {
    const layouts = new Map<string, CalendarEventProps[]>();
    if (!weeks || weeks.length === 0) {
      return layouts;
    }
    weeks.forEach(week => {
      if (week && week.length > 0 && week[0]?.date) {
        const weekStartDate = week[0].date.startOf('week');
        const layoutForWeek = calculateWeeklyEventLayout(events, weekStartDate);
        layouts.set(weekStartDate.format('YYYY-MM-DD'), layoutForWeek);
      }
    });
    return layouts;
  }, [events, weeks]);

  const visibleCount = getVisibleEventCount();

  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [activeEventData, setActiveEventData] = useState<CalendarEventProps | null>(null);
  const [dragStartCellDate, setDragStartCellDate] = useState<string | null>(null);
  const [hoveredDateStr, setHoveredDateStr] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragStart(event: { active: any }) {
    const { active } = event;
    const eventData = events.find(ev => ev.id === active.id);
    if (eventData && active.data.current?.cellDate) {
      setActiveId(active.id);
      setActiveEventData(eventData);
      setDragStartCellDate(active.data.current.cellDate);
      setHoveredDateStr(active.data.current.cellDate);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setHoveredDateStr(over ? (over.id as string) : null);
  }

  function handleDragEnd(event: { active: any, over: any }) {
    const { active, over } = event;
    const startCellDateStr = dragStartCellDate;
    setActiveId(null);
    setActiveEventData(null);
    setDragStartCellDate(null);
    setHoveredDateStr(null); // Clear hover

    if (over?.id && active.id && startCellDateStr) {
      const originalEvent = events.find(ev => ev.id === active.id);
      const dropDateStr = over.id as string;
      if (originalEvent && dropDateStr !== startCellDateStr) {
        const startCellDate = dayjs(startCellDateStr);
        const dropDate = dayjs(dropDateStr);
        if (dropDate.isValid() && startCellDate.isValid()) {
          const dateDiff = dropDate.diff(startCellDate, 'day');
          const originalEventStart = dayjs(originalEvent.start);
          const originalEventEnd = dayjs(originalEvent.end);
          const newStart = originalEventStart.add(dateDiff, 'day');
          const newEnd = originalEventEnd.add(dateDiff, 'day');
          const updatedEvent: CalendarEventProps = {
            ...originalEvent,
            start: newStart.toISOString(),
            end: newEnd.toISOString(),
            cellSlot: undefined,
          };
          onEventUpdate?.(updatedEvent);
        }
      }
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    setActiveEventData(null);
    setDragStartCellDate(null);
    setHoveredDateStr(null); // Clear hover
  }

  const highlightedDates = useMemo(() => {
    const dates = new Set<string>();
    if (!activeEventData || !hoveredDateStr || !dragStartCellDate) {
      return dates;
    }
    const startCellDate = dayjs(dragStartCellDate);
    const currentHoverDate = dayjs(hoveredDateStr);
    if (!currentHoverDate.isValid() || !startCellDate.isValid()) {
      return dates;
    }
    const dateDiff = currentHoverDate.diff(startCellDate, 'day');
    const originalStart = dayjs(activeEventData.start);
    const originalEnd = dayjs(activeEventData.end);
    const projectedStart = originalStart.add(dateDiff, 'day');
    const projectedEnd = originalEnd.add(dateDiff, 'day');
    let currentHighlightDate = projectedStart;
    while (currentHighlightDate.isSameOrBefore(projectedEnd, 'day')) {
      dates.add(currentHighlightDate.format('YYYY-MM-DD'));
      currentHighlightDate = currentHighlightDate.add(1, 'day');
    }
    return dates;
  }, [activeEventData, hoveredDateStr, dragStartCellDate]);


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      onDragOver={handleDragOver}
    >
      <div data-slot="month-view" className="flex-1 flex h-full flex-col">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (<div key={day} className="p-2 text-center text-sm font-medium text-gray-500 overflow-hidden">{day}</div>))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 min-h-0 grid grid-flow-row auto-rows-[minmax(85px,_1fr)]">
          {weeks.map((week, weekIndex) => {
            const weekStartDateStr = week[0]?.date?.startOf('week').format('YYYY-MM-DD');
            const layoutForThisWeek = weekStartDateStr ? weeklyLayouts.get(weekStartDateStr) || [] : [];
            const hiddenIdsThisWeek = calculateHiddenIdsForWeek(week, layoutForThisWeek, visibleCount);

            return (
              <div key={weekIndex} className="flex flex-col relative not-last:border-b">
                {/* Background Cells - Apply Conditional Tailwind Class */}
                <div className="absolute inset-0 grid grid-cols-7" aria-hidden="true">
                  {week.map((cell, dayIndex) => {
                    const cellDateStr = cell.date.format('YYYY-MM-DD');
                    // Determine if this cell should be highlighted
                    const isHighlighted = highlightedDates.has(cellDateStr);
                    // Define base classes (ensure no background is set here unless intended)
                    const baseClasses = "not-last:border-e p-2 data-[today]:bg-blue-50 data-[outside-month]:bg-gray-50 data-[outside-month]:text-gray-400 overflow-hidden flex flex-col";
                    // Define highlight class (e.g., bg-gray-200)
                    const highlightClass = isHighlighted ? " bg-gray-200" : ""; // Using Tailwind bg-gray-200

                    return (
                      <span
                        key={dayIndex}
                        // Combine base classes with conditional highlight class
                        className={`${baseClasses}${highlightClass}`}
                        data-today={cell.isToday || undefined}
                        data-outside-month={!cell.isCurrentMonth || undefined}
                      // Removed data-drop-target-highlight
                      >
                        <span className="text-sm font-medium">{cell.date.date()}</span>
                      </span>
                    );
                  })}
                </div>
                {/* End Background Cells */}

                {/* Event Layer */}
                <div className="relative flex-1 grid grid-cols-7 mt-8" ref={weekIndex === 0 ? contentRef : null}>
                  {/* Render DroppableDayCell */}
                  {week.map((cell, dayIndex) => (
                    <DroppableDayCell
                      key={dayIndex}
                      dayIndex={dayIndex}
                      cell={cell}
                      layoutForThisWeek={layoutForThisWeek}
                      hiddenIdsThisWeek={hiddenIdsThisWeek}
                      visibleCount={visibleCount}
                      eventHeight={eventHeight}
                      eventGap={eventGap}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* DragOverlay remains the same */}
      <DragOverlay dropAnimation={null}>
        {activeId && activeEventData ? (
          <div style={{
            height: `${eventHeight}px`,
            width: '150px',
            opacity: 0.9,
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}
            className="px-1 flex items-center text-xs bg-primary/30 text-primary-foreground rounded"
          >
            <span className="truncate">{activeEventData.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}