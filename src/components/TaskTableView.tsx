"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  AlertCircle,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { TaskWithDetails } from "@/lib/tasks";

interface TaskTableViewProps {
  tasks: TaskWithDetails[];
}

type SortField = "title" | "status" | "priority" | "due_date" | "logged_hours";
type SortOrder = "asc" | "desc";

function getStatusDot(status: string) {
  switch (status) {
    case "done":
      return "bg-emerald-500";
    case "in_progress":
      return "bg-amber-500";
    case "review":
      return "bg-indigo-500";
    default:
      return "bg-stone-400";
  }
}

function formatStatusText(status: string) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "review":
      return "In Review";
    case "todo":
      return "To Do";
    case "done":
      return "Done";
    default:
      return status;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "urgent":
      return "text-red-700 bg-red-50 border-red-200 font-extrabold";
    case "high":
      return "text-amber-800 bg-amber-50 border-amber-200 font-extrabold";
    case "medium":
      return "text-blue-800 bg-blue-50 border-blue-200 font-bold";
    default:
      return "text-stone-600 bg-stone-100 border-stone-200 font-bold";
  }
}

export function TaskTableView({ tasks }: TaskTableViewProps) {
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;
    if (sortField === "title") {
      comparison = a.title.localeCompare(b.title);
    } else if (sortField === "status") {
      comparison = a.status.localeCompare(b.status);
    } else if (sortField === "priority") {
      const pRank: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      comparison = (pRank[a.priority] || 0) - (pRank[b.priority] || 0);
    } else if (sortField === "due_date") {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      comparison = dateA - dateB;
    } else if (sortField === "logged_hours") {
      comparison = parseFloat(a.logged_hours || "0") - parseFloat(b.logged_hours || "0");
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <div className="rounded-md border border-stone-200 bg-white overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-base sm:text-lg">
          <thead className="border-b border-stone-200 bg-stone-50/90 font-mono text-xs sm:text-sm font-bold text-stone-600 uppercase tracking-wider select-none">
            <tr>
              <th
                onClick={() => handleSort("status")}
                className="py-4.5 px-6 cursor-pointer hover:text-stone-900 w-44"
              >
                <div className="flex items-center space-x-2">
                  <span>Status</span>
                  <ArrowUpDown className="h-4 w-4 text-stone-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort("title")}
                className="py-4.5 px-6 cursor-pointer hover:text-stone-900"
              >
                <div className="flex items-center space-x-2">
                  <span>Task Title & Deliverables</span>
                  <ArrowUpDown className="h-4 w-4 text-stone-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort("priority")}
                className="py-4.5 px-6 cursor-pointer hover:text-stone-900 w-36"
              >
                <div className="flex items-center space-x-2">
                  <span>Priority</span>
                  <ArrowUpDown className="h-4 w-4 text-stone-400" />
                </div>
              </th>

              <th className="py-4.5 px-6 w-48">Assignees</th>
              <th
                onClick={() => handleSort("logged_hours")}
                className="py-4.5 px-6 cursor-pointer hover:text-stone-900 w-48"
              >
                <div className="flex items-center space-x-2">
                  <span>Time Tracked</span>
                  <ArrowUpDown className="h-4 w-4 text-stone-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort("due_date")}
                className="py-4.5 px-6 cursor-pointer hover:text-stone-900 w-40 text-right pr-8"
              >
                <div className="flex items-center justify-end space-x-2">
                  <span>Due Date</span>
                  <ArrowUpDown className="h-4 w-4 text-stone-400" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100 text-stone-900">
            {sortedTasks.map((t, idx) => {
              const isOverdue =
                t.due_date &&
                t.status !== "done" &&
                new Date(t.due_date).getTime() < new Date().getTime();

              const logged = parseFloat(t.logged_hours || "0");
              const estimated = t.estimated_hours ? parseFloat(t.estimated_hours) : null;
              const isTimeExceeded = estimated !== null && logged > estimated;

              return (
                <motion.tr
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.02 }}
                  whileHover={{ backgroundColor: "#FAFAF9" }}
                  className="group transition-colors"
                >
                  {/* Status */}
                  <td className="py-5 px-6 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <span className={`h-3.5 w-3.5 rounded-full ${getStatusDot(t.status)}`} />
                      <span className="font-extrabold text-stone-900 text-base sm:text-lg">
                        {formatStatusText(t.status)}
                      </span>
                    </div>
                  </td>

                  {/* Title & Deliverables */}
                  <td className="py-5 px-6">
                    <div className="space-y-1">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="font-extrabold text-stone-900 hover:text-blue-600 transition-colors flex items-center justify-between group-hover:underline text-base sm:text-lg leading-snug"
                      >
                        <span className="line-clamp-1">{t.title}</span>
                        {t.commentCount > 0 && (
                          <span className="inline-flex items-center space-x-1.5 text-xs sm:text-sm text-stone-500 font-mono pl-3 font-bold shrink-0">
                            <MessageSquare className="h-4.5 w-4.5" />
                            <span>{t.commentCount}</span>
                          </span>
                        )}
                      </Link>

                      {t.submission_link && (
                        <div className="flex items-center space-x-2 pt-0.5">
                          <a
                            href={t.submission_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Drive / Figma Deliverable</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="py-5 px-6 whitespace-nowrap">
                    <span
                      className={`inline-block rounded px-3 py-1 text-xs sm:text-sm uppercase border ${getPriorityBadge(
                        t.priority
                      )}`}
                    >
                      {t.priority}
                    </span>
                  </td>

                  {/* Assignees */}
                  <td className="py-5 px-6 whitespace-nowrap">
                    {t.assignees && t.assignees.length > 0 ? (
                      <div className="flex items-center space-x-2.5">
                        <div className="flex -space-x-2 overflow-hidden">
                          {t.assignees.slice(0, 3).map((a) => (
                            <span
                              key={a.id}
                              title={`${a.name} (${a.role})`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded bg-stone-200 font-mono text-xs font-bold text-stone-800 border-2 border-white"
                            >
                              {a.name.charAt(0).toUpperCase()}
                            </span>
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-stone-800 truncate max-w-[130px]">
                          {t.assignees.map((a) => a.name.split(" ")[0]).join(", ")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-stone-400 italic text-base">Unassigned</span>
                    )}
                  </td>

                  {/* Time Tracked */}
                  <td className="py-5 px-6 whitespace-nowrap">
                    <div className="space-y-1.5 font-mono text-xs sm:text-sm">
                      <div className="flex items-center justify-between space-x-2">
                        <span className="font-bold text-stone-900">
                          {logged}h {estimated ? `/ ${estimated}h` : ""}
                        </span>
                        {isTimeExceeded && (
                          <span className="rounded bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-bold text-red-600 uppercase">
                            Exceeded
                          </span>
                        )}
                      </div>

                      {estimated && (
                        <div className="h-2 w-full rounded bg-stone-100 overflow-hidden border border-stone-200">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (logged / estimated) * 100)}%` }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className={`h-full rounded-sm ${
                              isTimeExceeded ? "bg-red-600" : "bg-stone-900"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="py-5 px-6 whitespace-nowrap text-right pr-8">
                    {t.due_date ? (
                      <span
                        className={`inline-flex items-center space-x-2 font-mono text-sm sm:text-base ${
                          isOverdue ? "text-red-600 font-extrabold" : "text-stone-900 font-extrabold"
                        }`}
                      >
                        {isOverdue && <AlertCircle className="h-4.5 w-4.5 text-red-500" />}
                        <span>
                          {new Date(t.due_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-stone-400 font-mono text-base">—</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}

            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-stone-500 text-lg italic">
                  No tasks match the current search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
