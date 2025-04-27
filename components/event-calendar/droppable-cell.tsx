import { useDroppable } from "@dnd-kit/core";
import dayjs from "dayjs";
interface DroppableCellProps {
  id: string,
  cellDate: dayjs.Dayjs;
  children: React.ReactNode;
  ref: React.RefObject<HTMLDivElement> | null;
}

export function DroppableCell({ id, cellDate, children, ref }: DroppableCellProps) {
  const { setNodeRef } = useDroppable({
    id,
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
