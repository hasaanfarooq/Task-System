"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageSquare, Loader2 } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export function ChatDrawer({ isOpen, onClose, currentUser }: ChatDrawerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messagesList, setMessagesList] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      fetch("/api/messages")
        .then((res) => res.json())
        .then((data) => {
          if (data.contacts && data.contacts.length > 0) {
            setContacts(data.contacts);
            if (!selectedContact) {
              setSelectedContact(data.contacts[0]);
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedContact) return;

    const fetchConversation = async () => {
      try {
        const res = await fetch(`/api/messages?with=${selectedContact.id}`);
        const data = await res.json();
        if (data.messages) {
          setMessagesList(data.messages);
        }
      } catch (err) {
        console.error(err);
      }
    };

    setLoadingMessages(true);
    fetchConversation().finally(() => setLoadingMessages(false));

    const interval = setInterval(fetchConversation, 3500);
    return () => clearInterval(interval);
  }, [isOpen, selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messagesList]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !inputContent.trim() || sending) return;

    const contentToSend = inputContent.trim();
    setInputContent("");
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: selectedContact.id,
          content: contentToSend,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessagesList((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs"
          />

          {/* Sliding Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 p-4 bg-stone-900 text-white">
              <div className="flex items-center space-x-2.5">
                <MessageSquare className="h-5 w-5 text-rose-400" />
                <div>
                  <h2 className="font-bold text-base tracking-tight">Direct Support & Team Chat</h2>
                  <p className="text-xs font-mono text-stone-300">
                    {currentUser.role === "employee"
                      ? "Chat directly with Admins & Managers"
                      : "Communicate with Workspace Members"}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Contact Picker */}
            <div className="border-b border-stone-200 bg-stone-50 p-3.5 space-y-1.5">
              <label className="block font-mono text-xs font-bold uppercase text-stone-600">
                {currentUser.role === "employee" ? "Select Admin / Manager:" : "Select Recipient:"}
              </label>
              <select
                value={selectedContact?.id || ""}
                onChange={(e) => {
                  const target = contacts.find((c) => c.id === e.target.value);
                  if (target) setSelectedContact(target);
                }}
                className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-900 focus:border-stone-900 focus:outline-none"
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role.toUpperCase()}) — {c.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Contact Bar */}
            {selectedContact && (
              <div className="flex items-center space-x-3 border-b border-stone-100 px-4 py-2.5 bg-white font-mono text-xs">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-stone-200 text-xs font-bold text-stone-800">
                  {selectedContact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-stone-900 text-sm">{selectedContact.name}</div>
                  <div className="text-stone-500 uppercase font-bold text-[10px]">{selectedContact.role}</div>
                </div>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAF9]">
              {loadingMessages && messagesList.length === 0 ? (
                <div className="flex h-full items-center justify-center text-stone-400 font-mono text-xs space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading messages...</span>
                </div>
              ) : (
                messagesList.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center space-x-1 text-[11px] font-mono text-stone-500 mb-1">
                        <span className="font-bold">{msg.sender.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[82%] rounded-md px-3.5 py-2.5 text-sm leading-relaxed ${
                          isMine
                            ? "bg-stone-900 text-white font-medium shadow-2xs"
                            : "bg-white text-stone-900 border border-stone-200 shadow-2xs"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  );
                })
              )}

              {!loadingMessages && messagesList.length === 0 && (
                <div className="flex h-48 items-center justify-center rounded border border-dashed border-stone-300 p-4 text-center font-mono text-xs text-stone-400">
                  No previous messages with {selectedContact?.name}. Send a message to start chatting!
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="border-t border-stone-200 bg-white p-3 flex items-center space-x-2">
              <input
                type="text"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder={`Message ${selectedContact?.name || "..."}`}
                className="flex-1 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={sending || !inputContent.trim()}
                className="inline-flex items-center justify-center rounded-md bg-stone-900 p-2.5 text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
