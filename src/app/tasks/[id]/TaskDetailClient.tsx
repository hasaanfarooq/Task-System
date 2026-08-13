"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { InviteUserModal } from "@/components/InviteUserModal";
import {
  ArrowLeft,
  AlertCircle,
  MessageSquare,
  Send,
  Trash2,
  Clock,
  Plus,
  Loader2,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";

interface TaskDetailProps {
  session: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "manager" | "employee";
  };
  initialTask: {
    id: string;
    title: string;
    description: string | null;
    status: "todo" | "in_progress" | "review" | "done";
    priority: "low" | "medium" | "high" | "urgent";
    estimated_hours: string | null;
    logged_hours: string | null;
    time_limit: string | null;
    due_date: string | null;
    submission_link: string | null;
    submission_notes: string | null;
    submitted_at: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    creator: { id: string; name: string; email: string; role: string };
    assignees: Array<{ id: string; name: string; email: string; role: string }>;
    tags: Array<{ id: string; name: string; color: string }>;
    comments: Array<{
      id: string;
      body: string;
      created_at: string;
      user: { id: string; name: string; email: string; role: string };
    }>;
  };
  allUsers: Array<{ id: string; name: string; email: string; role: string }>;
  allTags: Array<{ id: string; name: string; color: string }>;
}

export function TaskDetailClient({
  session,
  initialTask,
  allUsers,
  allTags,
}: TaskDetailProps) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(false);

  // Deliverable Submission
  const [submissionLinkInput, setSubmissionLinkInput] = useState(task.submission_link || "");
  const [submissionNotesInput, setSubmissionNotesInput] = useState(task.submission_notes || "");
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Time logging
  const [logHoursInput, setLogHoursInput] = useState("");
  const [loggingTime, setLoggingTime] = useState(false);
  const [logTimeSuccess, setLogTimeSuccess] = useState("");

  // QoL Copy Link
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);

  const loggedNum = parseFloat(task.logged_hours || "0");
  const estimatedNum = task.estimated_hours ? parseFloat(task.estimated_hours) : null;
  const isTimeExceeded = estimatedNum !== null && loggedNum > estimatedNum;
  const overflowHours = estimatedNum !== null ? (loggedNum - estimatedNum).toFixed(1) : "0";

  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date).getTime() < new Date().getTime();

  // Status Change
  const handleStatusChange = async (newStatus: string) => {
    setUpdatingTask(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTask((prev) => ({ ...prev, status: data.task.status }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTask(false);
    }
  };

  // Priority Change
  const handlePriorityChange = async (newPriority: string) => {
    setUpdatingTask(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTask((prev) => ({ ...prev, priority: data.task.priority }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTask(false);
    }
  };

  // Deliverable Submission Action
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionLinkInput.trim()) return;

    setSubmittingTask(true);
    setSubmitSuccess("");

    try {
      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_link: submissionLinkInput.trim(),
          submission_notes: submissionNotesInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.task) {
        setTask((prev) => ({
          ...prev,
          submission_link: data.task.submission_link,
          submission_notes: data.task.submission_notes,
          submitted_at: data.task.submitted_at,
          status: "review",
        }));
        setSubmitSuccess("Task deliverable submitted for review!");
        setTimeout(() => setSubmitSuccess(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingTask(false);
    }
  };

  // Log Time Action
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = parseFloat(logHoursInput);
    if (isNaN(hrs) || hrs <= 0) return;

    setLoggingTime(true);
    setLogTimeSuccess("");

    try {
      const res = await fetch(`/api/tasks/${task.id}/log-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: hrs }),
      });

      const data = await res.json();
      if (res.ok && data.logged_hours) {
        setTask((prev) => ({ ...prev, logged_hours: data.logged_hours }));
        setLogHoursInput("");
        setLogTimeSuccess(`+${hrs}h logged!`);
        setTimeout(() => setLogTimeSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingTime(false);
    }
  };

  // Comment Post
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setPostingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentText }),
      });

      const data = await res.json();
      if (res.ok && data.comment) {
        setTask((prev) => ({
          ...prev,
          comments: [...prev.comments, data.comment],
        }));
        setCommentText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostingComment(false);
    }
  };

  // Copy Task URL QoL
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 pb-16">
      <Navbar
        user={session}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onOpenInviteUser={() => setIsInviteUserOpen(true)}
      />

      <main className="w-full px-6 sm:px-8 lg:px-12 pt-6 space-y-5">
        {/* Top Breadcrumb & QoL Actions */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 font-mono text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to tasks</span>
          </Link>

          <div className="flex items-center space-x-3">
            {/* QoL Copy Link */}
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 rounded border border-stone-300 bg-white px-3 py-1.5 font-mono text-xs sm:text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-stone-600" />}
              <span>{copiedLink ? "Copied!" : "Copy Task Link"}</span>
            </button>

            {(session.role === "admin" || session.role === "manager") && (
              <button
                onClick={handleDeleteTask}
                className="inline-flex items-center space-x-1.5 rounded border border-red-200 bg-red-50 px-3 py-1.5 font-mono text-xs sm:text-sm font-bold text-red-700 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Task Header & Warnings */}
        <div className="rounded-md border border-stone-200 bg-white p-6 space-y-4 shadow-xs">
          {/* Deliverable Submitted Banner */}
          {task.submission_link && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded border border-emerald-200 bg-emerald-50 p-4 font-mono text-sm">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span>Deliverable Link Attached & Submitted for Review</span>
                </div>
                <div className="text-xs text-stone-600 pl-7">
                  Submitted by: <span className="font-bold text-stone-900">{task.assignees.map((a) => `${a.name} (${a.email})`).join(", ") || `${task.creator.name} (${task.creator.email})`}</span>
                </div>
              </div>

              <a
                href={task.submission_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 rounded bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-emerald-800 transition-colors shadow-2xs self-start sm:self-auto shrink-0"
              >
                <span>Open Google Drive / Figma Link</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Time Exceeded Alert Banner */}
          {isTimeExceeded && (
            <div className="flex items-center justify-between rounded border border-red-200 bg-red-50 p-3.5 text-sm font-mono text-red-700 font-bold">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <span>TIME LIMIT EXCEEDED: Logged {loggedNum}h against limit of {estimatedNum}h (+{overflowHours}h over limit)</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 focus:border-stone-900 focus:outline-none"
            >
              <option value="todo">Status: To Do</option>
              <option value="in_progress">Status: In Progress</option>
              <option value="review">Status: In Review</option>
              <option value="done">Status: Done</option>
            </select>

            <select
              value={task.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              disabled={session.role === "employee"}
              className="rounded border border-stone-300 bg-white px-3 py-1.5 font-bold text-stone-800 uppercase focus:border-stone-900 focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {isOverdue && (
              <span className="inline-flex items-center space-x-1 rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span>Overdue</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
            {task.title}
          </h1>
        </div>

        {/* Clean Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main (Description, Submit Deliverable, Comments) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="rounded-md border border-stone-200 bg-white p-6 space-y-2.5 shadow-xs">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500">
                Description
              </h2>
              <div className="text-base text-stone-800 leading-relaxed whitespace-pre-wrap">
                {task.description || (
                  <span className="italic text-stone-400 font-mono text-sm">No description provided.</span>
                )}
              </div>
            </div>

            {/* Task Deliverable Submission Widget */}
            <div className="rounded-md border border-stone-200 bg-white p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center space-x-2 font-mono">
                  <UploadCloud className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-bold uppercase text-stone-800">
                    Submit Task Deliverable (Google Drive / Figma Link)
                  </h2>
                </div>

                {submitSuccess && (
                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    {submitSuccess}
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmitDeliverable} className="space-y-3.5">
                <div>
                  <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                    Google Drive / Figma / Dropbox Link *
                  </label>
                  <input
                    type="url"
                    value={submissionLinkInput}
                    onChange={(e) => setSubmissionLinkInput(e.target.value)}
                    placeholder="e.g. https://drive.google.com/file/d/1A2B3C..."
                    className="w-full rounded border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-mono text-stone-900 focus:border-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold text-stone-600 uppercase mb-1">
                    Deliverable Notes / Key Deliverables
                  </label>
                  <textarea
                    rows={2}
                    value={submissionNotesInput}
                    onChange={(e) => setSubmissionNotesInput(e.target.value)}
                    placeholder="e.g. All Figma components and responsive specs are completed."
                    className="w-full rounded border border-stone-300 bg-white p-3 text-sm text-stone-900 focus:border-stone-900 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs font-mono text-stone-500 italic">
                    Submitting automatically updates status to In Review.
                  </div>
                  <button
                    type="submit"
                    disabled={submittingTask || !submissionLinkInput.trim()}
                    className="inline-flex items-center space-x-2 rounded-md bg-stone-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    {submittingTask ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4" />
                    )}
                    <span>Submit Deliverable</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Log Time Widget */}
            <div className="rounded-md border border-stone-200 bg-white p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center space-x-2 font-mono">
                  <Clock className="h-5 w-5 text-stone-700" />
                  <h2 className="text-sm font-bold uppercase text-stone-800">
                    Log Hours Worked
                  </h2>
                </div>

                {logTimeSuccess && (
                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    {logTimeSuccess}
                  </span>
                )}
              </div>

              <form onSubmit={handleLogTime} className="flex items-center space-x-3">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={logHoursInput}
                  onChange={(e) => setLogHoursInput(e.target.value)}
                  placeholder="e.g. 2.5 (hours)"
                  className="w-48 rounded border border-stone-300 bg-white px-3.5 py-2 text-sm font-mono font-bold text-stone-900 focus:border-stone-900 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={loggingTime || !logHoursInput}
                  className="inline-flex items-center space-x-2 rounded bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {loggingTime ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Log Time</span>
                </button>
              </form>
            </div>

            {/* Comments Feed */}
            <div className="rounded-md border border-stone-200 bg-white p-6 space-y-4 shadow-xs">
              <div className="flex items-center space-x-2 border-b border-stone-200 pb-3">
                <MessageSquare className="h-4.5 w-4.5 text-stone-700" />
                <h2 className="font-mono text-sm font-bold uppercase text-stone-800">
                  Activity ({task.comments.length})
                </h2>
              </div>

              <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
                {task.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start space-x-3 rounded border border-stone-200 bg-stone-50/70 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-stone-200 font-mono text-sm font-bold text-stone-800">
                      {comment.user.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-stone-900">
                            {comment.user.name}
                          </span>
                          <span className="rounded bg-white px-2 py-0.5 font-mono text-xs uppercase font-bold text-stone-600 border border-stone-200">
                            {comment.user.role}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-stone-400">
                          {new Date(comment.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                ))}

                {task.comments.length === 0 && (
                  <div className="py-8 text-center text-sm font-mono text-stone-400 italic border border-dashed border-stone-200 rounded">
                    No comments yet.
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment} className="space-y-3 border-t border-stone-200 pt-4">
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Post progress update or comment..."
                  className="w-full rounded-md border border-stone-300 bg-white p-3.5 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={postingComment || !commentText.trim()}
                    className="inline-flex items-center space-x-2 rounded-md bg-stone-900 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                  >
                    {postingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>Post Comment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Metadata */}
          <div className="space-y-6">
            <div className="rounded-md border border-stone-200 bg-white p-5 space-y-5 font-mono text-sm shadow-xs">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-2.5">
                Time Limits & Metadata
              </h2>

              <div className="space-y-2 rounded border border-stone-200 bg-stone-50 p-3.5">
                <div className="flex justify-between font-bold text-stone-900 text-sm">
                  <span>Logged Time:</span>
                  <span className={isTimeExceeded ? "text-red-600 font-extrabold" : "text-stone-900"}>
                    {loggedNum}h {estimatedNum ? `/ ${estimatedNum}h` : ""}
                  </span>
                </div>

                {estimatedNum && (
                  <div className="h-2 w-full rounded bg-stone-200 overflow-hidden border border-stone-300">
                    <div
                      className={`h-full rounded-sm ${
                        isTimeExceeded ? "bg-red-600" : "bg-stone-900"
                      }`}
                      style={{
                        width: `${Math.min(100, (loggedNum / estimatedNum) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-500 uppercase">
                  Created By
                </span>
                <div className="flex items-center space-x-2.5 rounded border border-stone-200 bg-stone-50 p-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-stone-200 font-mono text-xs font-bold text-stone-800">
                    {task.creator.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      {task.creator.name}
                    </div>
                    <div className="text-xs text-stone-500">{task.creator.email}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-500 uppercase">
                  Assignees ({task.assignees.length})
                </span>
                <div className="space-y-1.5">
                  {task.assignees.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded border border-stone-200 bg-stone-50 p-2 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-stone-200 text-xs font-bold text-stone-800">
                          {a.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-stone-900">{a.name}</span>
                      </div>
                      <span className="text-xs uppercase font-bold text-stone-500">{a.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-500 uppercase">
                  Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((t) => (
                    <span
                      key={t.id}
                      className="rounded border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-800"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3.5 space-y-2 text-xs text-stone-600 font-semibold">
                <div className="flex justify-between">
                  <span>Time Limit / Cutoff:</span>
                  <span className={`font-bold ${isOverdue ? "text-red-600" : "text-stone-900"}`}>
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={() => router.refresh()}
      />

      <InviteUserModal
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
        onUserInvited={() => router.refresh()}
      />
    </div>
  );
}
