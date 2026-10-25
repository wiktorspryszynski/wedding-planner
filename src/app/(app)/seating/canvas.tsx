"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useOptimistic, useTransition } from "react";
import { assignGuest, moveTable } from "@/actions/seating";
import { cx } from "@/components/ui";

export type SeatGuest = { id: number; name: string; household: string | null; tableId: number | null; flag?: string };
export type SeatTable = { id: number; name: string; shape: "round" | "rect"; capacity: number; posX: number; posY: number };

type Change = { kind: "guest"; id: number; tableId: number | null } | { kind: "table"; id: number; x: number; y: number };

export function SeatingCanvas({ tables, guests }: { tables: SeatTable[]; guests: SeatGuest[] }) {
  const [, start] = useTransition();
  const [state, apply] = useOptimistic({ tables, guests }, (s, c: Change) =>
    c.kind === "guest"
      ? { ...s, guests: s.guests.map((g) => (g.id === c.id ? { ...g, tableId: c.tableId } : g)) }
      : { ...s, tables: s.tables.map((t) => (t.id === c.id ? { ...t, posX: c.x, posY: c.y } : t)) },
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const [kind, rawId] = String(e.active.id).split("-");
    const id = Number(rawId);
    if (kind === "table") {
      const t = state.tables.find((x) => x.id === id);
      if (!t || (e.delta.x === 0 && e.delta.y === 0)) return;
      const x = Math.max(0, t.posX + e.delta.x);
      const y = Math.max(0, t.posY + e.delta.y);
      start(async () => {
        apply({ kind: "table", id, x, y });
        await moveTable(id, x, y);
      });
      return;
    }
    if (!e.over) return;
    const target = String(e.over.id);
    const tableId = target === "unassigned" ? null : Number(target.split("-")[1]);
    const g = state.guests.find((x) => x.id === id);
    if (!g || g.tableId === tableId) return;
    start(async () => {
      apply({ kind: "guest", id, tableId });
      await assignGuest(id, tableId);
    });
  }

  const unassigned = state.guests.filter((g) => g.tableId == null);
  const width = Math.max(900, ...state.tables.map((t) => t.posX + 220));
  const height = Math.max(560, ...state.tables.map((t) => t.posY + 260));

  return (
    <DndContext id="seating" sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <Unassigned guests={unassigned} />
        <div className="min-w-0 flex-1 overflow-auto rounded-2xl border border-line bg-surface-2/40">
          <div
            className="relative"
            style={{
              width,
              height,
              backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {state.tables.map((t) => (
              <TableBox key={t.id} t={t} guests={state.guests.filter((g) => g.tableId === t.id)} />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}

function Unassigned({ guests }: { guests: SeatGuest[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });
  return (
    <div
      ref={setNodeRef}
      className={cx(
        "max-h-[70vh] shrink-0 overflow-auto rounded-2xl border bg-surface p-3 lg:w-60",
        isOver ? "border-accent" : "border-line",
      )}
    >
      <h3 className="mb-2 text-sm font-medium">
        Bez stołu <span className="text-xs text-muted">({guests.length})</span>
      </h3>
      {guests.length === 0 ? (
        <p className="text-xs text-muted">Wszyscy usadzeni.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 lg:flex-col">
          {guests.map((g) => (
            <GuestChip key={g.id} g={g} showHousehold />
          ))}
        </div>
      )}
    </div>
  );
}

function GuestChip({ g, showHousehold }: { g: SeatGuest; showHousehold?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `guest-${g.id}` });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cx(
        "cursor-grab touch-none rounded-lg border border-line bg-surface px-2 py-1 text-xs select-none",
        isDragging && "relative z-50 shadow-lg",
      )}
      title={g.flag}
    >
      <span>{g.name}</span>
      {g.flag && <span className="ml-1 text-rose">•</span>}
      {showHousehold && g.household && <span className="block text-[10px] text-muted">{g.household}</span>}
    </div>
  );
}

function TableBox({ t, guests }: { t: SeatTable; guests: SeatGuest[] }) {
  const drag = useDraggable({ id: `table-${t.id}` });
  const drop = useDroppable({ id: `table-${t.id}` });
  const over = guests.length > t.capacity;
  const pos = drag.transform ? { x: t.posX + drag.transform.x, y: t.posY + drag.transform.y } : { x: t.posX, y: t.posY };
  return (
    <div
      ref={(el) => {
        drag.setNodeRef(el);
        drop.setNodeRef(el);
      }}
      style={{ left: pos.x, top: pos.y }}
      className={cx(
        "absolute w-48 border-2 bg-surface p-2 shadow-sm",
        t.shape === "round" ? "rounded-[2rem]" : "rounded-lg",
        over ? "border-rose" : drop.isOver ? "border-accent" : "border-line",
        drag.isDragging && "z-40 shadow-lg",
      )}
    >
      <div
        {...drag.listeners}
        {...drag.attributes}
        className="flex cursor-move touch-none items-center justify-between px-1 pb-1.5 select-none"
        title="Przeciągnij, żeby przesunąć stół"
      >
        <span className="font-display text-sm">{t.name}</span>
        <span className={cx("text-xs", over ? "font-medium text-rose" : "text-muted")}>
          {guests.length}/{t.capacity}
        </span>
      </div>
      <div className="flex min-h-10 flex-wrap gap-1">
        {guests.map((g) => (
          <GuestChip key={g.id} g={g} />
        ))}
        {guests.length === 0 && <span className="px-1 text-[11px] text-muted">upuść gości tutaj</span>}
      </div>
    </div>
  );
}
