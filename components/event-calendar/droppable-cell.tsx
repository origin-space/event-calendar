import { useDroppable } from "@dnd-kit/core";
import dayjs from "dayjs";
interface DroppableCellProps {
  cellDate: dayjs.Dayjs;
  children: React.ReactNode;
}

export function DroppableCell({ cellDate, children }: DroppableCellProps) {
  const { setNodeRef } = useDroppable({
    id: `cell-${cellDate.format('YYYY-MM-DD')}`,
    data: {
      date: cellDate.toISOString(), // Store the date this cell represents
      type: 'cell',
    },
  });

  return (
    <div ref={setNodeRef} className="group/row">
      {children}
    </div>
  );
}