import { useDroppable } from "@dnd-kit/core";
import dayjs from "dayjs";
interface DroppableCellProps {
  cellDate: dayjs.Dayjs;
  children: React.ReactNode;
  ref: React.RefObject<HTMLDivElement> | null;
}

export function DroppableCell({ cellDate, children, ref }: DroppableCellProps) {
  const { setNodeRef } = useDroppable({
    id: `cell-${cellDate.format('YYYY-MM-DD')}`,
    data: {
      date: cellDate.toISOString(),
    },
  });

  return (
    <div ref={setNodeRef} className="group/row flex">
      <div className="relative flex-1 mt-8" ref={ref}>
        {children}
      </div>
    </div>
  );
}
