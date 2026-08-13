"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TagOption {
  id: string;
  name: string;
  color: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [tagsList, setTagsList] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/users").then((res) => res.json()),
        fetch("/api/tags").then((res) => res.json()),
      ])
        .then(([userData, tagData]) => {
          if (userData.users) setUsersList(userData.users);
          if (tagData.tags) setTagsList(tagData.tags);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          status,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
          time_limit: dueDate || null,
          due_date: dueDate || null,
          assignee_ids: selectedAssignees,
          tag_ids: selectedTags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
      setEstimatedHours("");
      setDueDate("");
      setSelectedAssignees([]);
      setSelectedTags([]);

      onTaskCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-xl rounded-md border border-stone-300 bg-white p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-stone-900">Create Task</h2>
                <p className="text-xs text-stone-500 font-mono">Axiora Software Internal Workspace</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Audit JWT middleware session handling"
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task context or acceptance criteria..."
                  className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:outline-none font-medium"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:outline-none font-medium"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                    Estimated Hours (Limit)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="e.g. 12.0"
                    className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-mono text-stone-900 focus:border-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                    Due Date / Time Limit
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-mono text-stone-900 focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                  Assignees
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto rounded-md border border-stone-300 bg-stone-50 p-2">
                  {usersList.map((u) => {
                    const isSelected = selectedAssignees.includes(u.id);
                    return (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        key={u.id}
                        onClick={() => toggleAssignee(u.id)}
                        className={`flex items-center space-x-1 rounded px-2.5 py-1 font-mono text-xs border transition-colors ${
                          isSelected
                            ? "border-stone-900 bg-stone-900 text-white font-medium"
                            : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        <span>{u.name}</span>
                        <span className="opacity-60 text-[10px]">({u.role})</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tagsList.map((t) => {
                    const isSelected = selectedTags.includes(t.id);
                    return (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        className={`rounded px-2.5 py-1 font-mono text-xs border transition-colors ${
                          isSelected
                            ? "border-stone-900 bg-stone-900 text-white font-medium"
                            : "border-stone-300 bg-white text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        <span>{t.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center space-x-2 rounded-md bg-stone-900 px-5 py-2 font-bold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Create Task</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
