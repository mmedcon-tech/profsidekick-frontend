"use client";

/**
 * Publisher AI Workspace
 *
 * 3-column layout:
 *   Left   — conversation history + new chat button
 *   Center — chat interface with single / multi-option generation
 *   Right  — current avatar stats (knowledge docs, rubrics, references)
 *
 * API calls:
 *   GET  /api/publisher/conversations          → left sidebar
 *   POST /api/publisher/chat                   → single response
 *   POST /api/publisher/chat/options           → A/B/C picker
 *   POST /api/publisher/chat/select            → commit chosen + record feedback
 *   GET  /api/publisher/avatars/:id            → right sidebar stats
 *   GET  /api/publisher/avatar-templates       → avatar picker (publisher list)
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { config } from '@/lib/config';
import { avatarApi } from '@/lib/avatarApi';
import type { AvatarResponse } from '@/types/avatar';
import AiMessage from '@/components/shared/AiMessage';
import {
  Plus, Send, Bot, FileText, ClipboardList, BookOpen,
  MessageSquare, Loader2, CheckCircle, RefreshCw, Sparkles,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  avatar_id: string | null;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  isOptions?: false;
}

interface OptionsMessage {
  id: string;
  role: 'options';
  userMessage: string;
  options: { option_id: string; content: string }[];
  created_at: string;
  isOptions: true;
}

type ChatMessage = Message | OptionsMessage;

function useToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

async function apiFetch<T>(
  url: string,
  token: string | null,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.detail || `HTTP ${res.status}`);
  return data as T;
}

// ─── Left Sidebar ────────────────────────────────────────────────────────────

function LeftSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  loading,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  loading: boolean;
}) {
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-950 text-white flex flex-col h-full border-r border-gray-800">
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          AI Workspace
        </h2>
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 bg-[#133221] hover:bg-[#0a1e13] text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading && (
          <div className="text-center py-8">
            <Loader2 size={20} className="animate-spin text-gray-500 dark:text-gray-400 mx-auto" />
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-8">No conversations yet.</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
              activeId === c.id
                ? 'bg-[#133221] text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <p className="truncate font-medium">{c.title}</p>
            <p className={`text-xs mt-0.5 ${activeId === c.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
              {c.message_count} message{c.message_count !== 1 ? 's' : ''}
            </p>
          </button>
        ))}
      </div>
    </aside>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function RightSidebar({
  avatar,
  avatarId: _avatarId,
  onChangeAvatar: _onChangeAvatar,
}: {
  avatar: AvatarResponse | null;
  avatarId: string | null;
  onChangeAvatar: (id: string) => void;
}) {
  const cfg = avatar?.configuration;

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Active Avatar
        </p>
        {avatar ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#BA984E]/20 flex items-center justify-center flex-shrink-0">
                <Bot size={20} className="text-[#133221]" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{avatar.name}</p>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                  avatar.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {avatar.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
            {avatar.description && (
              <p className="text-xs text-gray-400 line-clamp-3 mt-2">{avatar.description}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">No avatar selected</p>
        )}
      </div>

      {cfg && (
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Content</p>
          {[
            { icon: <FileText size={14} />, label: 'Knowledge Docs', count: cfg.knowledge_documents?.length ?? 0, color: 'text-[#133221]' },
            { icon: <ClipboardList size={14} />, label: 'Rubrics', count: cfg.rubrics?.length ?? 0, color: 'text-purple-600' },
            { icon: <BookOpen size={14} />, label: 'References', count: cfg.reference_solutions?.length ?? 0, color: 'text-green-600' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <div className={`flex items-center gap-2 ${row.color}`}>
                {row.icon}
                <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{row.count}</span>
            </div>
          ))}

          {cfg.difficulty_level && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400">Difficulty</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{cfg.difficulty_level}</p>
            </div>
          )}
          {cfg.voice && (
            <div>
              <p className="text-xs text-gray-400">Voice</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{cfg.voice}</p>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Context in Prompt
        </p>
        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
          <p className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> Avatar system prompt</p>
          <p className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> Rubric criteria</p>
          <p className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> Knowledge excerpts</p>
          <p className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> Reference solutions</p>
          <p className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> Conversation history</p>
        </div>
      </div>
    </aside>
  );
}

// ─── Option Cards ─────────────────────────────────────────────────────────────

function OptionCards({
  options,
  userMessage: _userMessage,
  onSelect,
  selecting,
}: {
  options: { option_id: string; content: string }[];
  userMessage: string;
  onSelect: (selected: { option_id: string; content: string }, rejected: { option_id: string; content: string }[]) => void;
  selecting: boolean;
}) {
  const colors: Record<string, string> = {
    A: 'border-[#133221] hover:border-[#133221] hover:bg-green-50 dark:bg-gray-800',
    B: 'border-purple-300 hover:border-purple-500 hover:bg-purple-50',
    C: 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50',
  };
  const labels: Record<string, string> = {
    A: 'bg-[#BA984E]/20 text-[#133221]',
    B: 'bg-purple-100 text-purple-700',
    C: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400 flex items-center gap-1">
        <Sparkles size={12} /> Choose the best response:
      </p>
      {options.map((opt) => (
        <button
          key={opt.option_id}
          disabled={selecting}
          onClick={() => onSelect(opt, options.filter((o) => o.option_id !== opt.option_id))}
          className={`w-full text-left p-4 border-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            colors[opt.option_id] ?? 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${labels[opt.option_id] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
              Option {opt.option_id}
            </span>
            {selecting && <Loader2 size={12} className="animate-spin text-gray-400" />}
          </div>
          <AiMessage
            content={opt.content}
            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
          />
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function WorkspaceInner() {
  const params = useSearchParams();
  const token = useToken();

  const [avatarId, setAvatarId] = useState<string | null>(params.get('avatar'));
  const [avatar, setAvatar] = useState<AvatarResponse | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [input, setInput] = useState('');
  const [responseCount, setResponseCount] = useState(1);
  const [sending, setSending] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── load avatar ──
  useEffect(() => {
    if (!avatarId) return;
    avatarApi.get(avatarId).then(setAvatar).catch(() => setAvatar(null));
  }, [avatarId]);

  // ── load conversations ──
  const loadConversations = useCallback(async () => {
    setConvsLoading(true);
    try {
      const data = await apiFetch<{ conversations: Conversation[]; total: number }>(
        config.getApiUrl('/api/publisher/conversations'), token
      );
      setConversations(data.conversations ?? []);
    } catch {
      setConversations([]);
    } finally {
      setConvsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── load conversation messages ──
  const selectConversation = async (id: string) => {
    setActiveConvId(id);
    setMessages([]);
    setMessagesLoading(true);
    try {
      const data = await apiFetch<{ messages: Message[] }>(
        config.getApiUrl(`/api/publisher/conversations/${id}`), token
      );
      setMessages(data.messages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversation');
    } finally {
      setMessagesLoading(false);
    }
  };

  const startNew = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
  };

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── send single ──
  const sendSingle = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    // Optimistic user bubble
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: msg, created_at: new Date().toISOString() }]);

    try {
      const res = await apiFetch<{ conversation_id: string; message_id: string; reply: string; created_at: string }>(
        config.getApiUrl('/api/publisher/chat'),
        token,
        {
          method: 'POST',
          body: JSON.stringify({ conversation_id: activeConvId, avatar_id: avatarId, message: msg }),
        }
      );

      if (!activeConvId) {
        setActiveConvId(res.conversation_id);
        await loadConversations();
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        { id: `u-${Date.now()}`, role: 'user', content: msg, created_at: res.created_at },
        { id: res.message_id, role: 'assistant', content: res.reply, created_at: res.created_at },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ── generate options ──
  const generateOptions = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: msg, created_at: new Date().toISOString() }]);

    try {
      const res = await apiFetch<{ conversation_id: string; options: { option_id: string; content: string }[] }>(
        config.getApiUrl('/api/publisher/chat/options'),
        token,
        {
          method: 'POST',
          body: JSON.stringify({ conversation_id: activeConvId, avatar_id: avatarId, message: msg, n: responseCount }),
        }
      );

      if (!activeConvId) {
        setActiveConvId(res.conversation_id);
        await loadConversations();
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        { id: `u-${Date.now()}`, role: 'user', content: msg, created_at: new Date().toISOString() },
        { id: `opts-${Date.now()}`, role: 'options', isOptions: true, userMessage: msg, options: res.options, created_at: new Date().toISOString() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ── select option ──
  const selectOption = async (
    optsMsgId: string,
    userMessage: string,
    selected: { option_id: string; content: string },
    rejected: { option_id: string; content: string }[],
  ) => {
    if (!activeConvId) return;
    setSelecting(true);
    try {
      await apiFetch(
        config.getApiUrl('/api/publisher/chat/select'),
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            conversation_id: activeConvId,
            avatar_id: avatarId,
            user_message: userMessage,
            selected_response: selected.content,
            rejected_responses: rejected.map((r) => r.content),
          }),
        }
      );

      // Replace the options bubble with the chosen response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optsMsgId
            ? { id: `selected-${Date.now()}`, role: 'assistant' as const, content: selected.content, created_at: new Date().toISOString() }
            : m
        )
      );
      await loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Selection failed');
    } finally {
      setSelecting(false);
    }
  };

  const handleSend = () => {
    if (responseCount > 1) generateOptions();
    else sendSingle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <LeftSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={selectConversation}
        onNew={startNew}
        loading={convsLoading}
      />

      {/* Center chat */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[#133221]" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {avatar ? `${avatar.name} — AI Workspace` : 'Publisher AI Workspace'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{error}</span>
            )}
            <button onClick={loadConversations} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeConvId && messages.length === 0 && (
            <div className="text-center py-20">
              <Sparkles size={40} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Publisher AI Workspace</h3>
              <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
                Ask the AI to generate exam questions, test how your avatar responds,
                or explore your rubric. Toggle &quot;Generate multiple options&quot; to get A/B/C choices.
              </p>
            </div>
          )}

          {messagesLoading && (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          )}

          {messages.map((m) => {
            if ((m as OptionsMessage).isOptions) {
              const om = m as OptionsMessage;
              return (
                <div key={om.id} className="flex flex-col gap-1">
                  <OptionCards
                    options={om.options}
                    userMessage={om.userMessage}
                    onSelect={(sel, rej) => selectOption(om.id, om.userMessage, sel, rej)}
                    selecting={selecting}
                  />
                </div>
              );
            }

            const cm = m as Message;
            return (
              <div key={cm.id} className={`flex ${cm.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  cm.role === 'user'
                    ? 'bg-[#133221] text-white rounded-br-sm whitespace-pre-wrap'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm'
                }`}>
                  {cm.role === 'user' ? cm.content : <AiMessage content={cm.content} />}
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 size={16} className="animate-spin text-gray-400" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex-shrink-0">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={responseCount > 1 ? `Ask a question — get ${responseCount} response options to choose from…` : 'Ask anything…'}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#133221] focus:border-[#133221] resize-none text-sm"
                disabled={sending}
              />
              <div className="flex items-center gap-2 mt-2">
                <Sparkles size={11} className="text-purple-500 flex-shrink-0" />
                <span className="text-xs text-gray-500 dark:text-gray-400 select-none">Generate</span>
                <select
                  value={responseCount}
                  onChange={(e) => setResponseCount(Number(e.target.value))}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n === 1 ? '1 response' : `${n} responses`}</option>
                  ))}
                </select>
                {responseCount > 1 && (
                  <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Options mode</span>
                )}
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex items-center gap-2 bg-[#133221] text-white px-4 py-2.5 rounded-xl hover:bg-[#0a1e13] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm flex-shrink-0 h-[42px]"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {responseCount > 1 ? 'Generate' : 'Send'}
            </button>
          </div>
        </div>
      </main>

      {/* Right sidebar */}
      <RightSidebar
        avatar={avatar}
        avatarId={avatarId}
        onChangeAvatar={setAvatarId}
      />
    </div>
  );
}

// Suspense wrapper required because WorkspaceInner calls useSearchParams()
export default function PublisherWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    }>
      <WorkspaceInner />
    </Suspense>
  );
}
