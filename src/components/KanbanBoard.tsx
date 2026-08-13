"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Clock, AlertCircle, MessageSquare, User as UserIcon } from "lucide-react";
import { TaskWithDetails } from "@/lib/tasks";

interface KanbanBoardProps {
  initialTasks: TaskWithDetails[];
  userRole: string;
}

const COLUMNS = [
  { id: "todo", title: "To Do", dot: "bg-stone-400" },
  { id: "in_progress", title: "In Progress", dot: "bg-amber-500" },
  { id: "review", title: "In Review", dot: "bg-indigo-500" },
  { id: "done", title: "Done", dot: "bg-emerald-500" },
];

function isOverdue(dueDate: string | Date | null, status: string): boolean {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate).getTime() < new Date().getTime();
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "urgent":
      return "text-red-700 bg-red-50 border-red-200 font-bold";
    case "high":
      return "text-amber-800 bg-amber-50 border-amber-200 font-bold";
    case "medium":
      return "text-blue-800 bg-blue-50 border-blue-200 font-semibold";
    default:
      return "text-stone-600 bg-stone-100 border-stone-200 font-medium";
  }
}

function TaskCard({ task }: { task: TaskWithDetails }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded-md border bg-white p-4 space-y-3 transition-colors cursor-grab active:cursor-grabbing shadow-xs ${
        isDragging ? "opacity-40 border-blue-500" : "border-stone-200 hover:border-stone-300"
      }`}
    >
      {/* Priority & Overdue Dot */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded px-2.5 py-0.5 font-mono text-xs uppercase border ${getPriorityBadge(
            task.priority
          )}`}
        >
          {task.priority}
        </span>

        {overdue && (
          <span className="inline-flex items-center space-x-1 rounded bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-mono text-red-600 font-bold">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Overdue</span>
          </span>
        )}
      </div>

      {/* Task Title */}
      <Link
        href={`/tasks/${task.id}`}
        className="block text-base font-bold text-stone-900 hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
        onClick={(e) => e.stopPropagation()}
      >
        {task.title}
      </Link>

      {/* Task Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map((t) => (
            <span
              key={t.id}
              className="rounded px-2 py-0.5 font-mono text-xs border border-stone-200 bg-stone-50 text-stone-800 font-semibold"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-xs sm:text-sm font-mono text-stone-600 font-medium">
        <div className="flex items-center space-x-1.5">
          <Clock className="h-4 w-4 text-stone-400" />
          <span>
            {task.due_date
              ? new Date(task.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "No date"}
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          {task.commentCount > 0 && (
            <div className="flex items-center space-x-1 text-stone-600 font-bold">
              <MessageSquare className="h-4 w-4" />
              <span>{task.commentCount}</span>
            </div>
          )}

          <div className="flex -space-x-1.5 overflow-hidden">
            {task.assignees && task.assignees.length > 0 ? (
              task.assignees.slice(0, 2).map((a) => (
                <span
                  key={a.id}
                  title={`${a.name} (${a.role})`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-stone-200 font-mono text-xs font-bold text-stone-800 border-2 border-white"
                >
                  {a.name.charAt(0).toUpperCase()}
                </span>
              ))
            ) : (
              <UserIcon className="h-4 w-4 text-stone-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
}: {
  column: (typeof COLUMNS)[0];
  tasks: TaskWithDetails[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-[550px] flex-col rounded-md border p-4 transition-colors ${
        isOver ? "border-blue-400 bg-blue-50/20" : "border-stone-200 bg-stone-100/50"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200">
        <div className="flex items-center space-x-2.5">
          <span className={`h-3 w-3 rounded-full ${column.dot}`} />
          <h3 className="font-bold text-stone-900 text-base tracking-tight">{column.title}</h3>
        </div>
        <span className="rounded bg-white border border-stone-200 px-2.5 py-0.5 font-mono text-xs sm:text-sm font-bold text-stone-800">
          {tasks.length}
        </span>
      </div>

      {/* Dropzone */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <div className="flex h-32 items-center justify-center rounded border border-dashed border-stone-300 p-3 text-center text-sm font-mono text-stone-400">
              Empty
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ initialTasks, userRole }: KanbanBoardProps) {
  const [tasksList, setTasksList] = useState<TaskWithDetails[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null);

  React.useEffect(() => {
    setTasksList(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasksList.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let targetStatus: TaskWithDetails["status"] | null = null;

    if (COLUMNS.some((col) => col.id === overId)) {
      targetStatus = overId as TaskWithDetails["status"];
    } else {
      const overTask = tasksList.find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    const currentTask = tasksList.find((t) => t.id === activeId);
    if (!currentTask || currentTask.status === targetStatus) return;

    setTasksList((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus! } : t))
    );

    try {
      await fetch(`/api/tasks/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
    } catch (err) {
      console.error("Failed to update task status:", err);
      setTasksList(initialTasks);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasksList.filter((t) => t.status === col.id);
          return <KanbanColumn key={col.id} column={col} tasks={colTasks} />;
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-95 shadow-md">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
