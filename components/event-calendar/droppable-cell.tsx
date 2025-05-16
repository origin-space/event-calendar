import { useDroppable } from "@dnd-kit/core";
import dayjs from "dayjs";

interface DroppableCellProps {
  id: string,
  cellDate: dayjs.Dayjs;
  displayContext?: 'weekTimed' | 'weekAllDay' | 'month';
  children: React.ReactNode;
  ref: React.RefObject<HTMLDivElement> | null;
  onClick?: () => void;
}

export function DroppableCell({ id, cellDate, displayContext = 'month', children, ref, onClick }: DroppableCellProps) {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      date: cellDate.toISOString(),
    },
  });

  if (displayContext === 'weekAllDay') {
    return (
      <div
        ref={setNodeRef}
        className="flex"    
      >
        <div className="relative flex-1 mt-(--event-gap)" ref={ref}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className="group/row flex"    
      onClick={onClick}
    >
      <div className="relative flex-1 mt-8" ref={ref}>
        {children}
      </div>
    </div>
  );
}
