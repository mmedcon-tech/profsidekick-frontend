"use client";

/**
 * Publisher Session Chat — full-viewport focus mode.
 *
 * Features:
 *   • Draggable divider between document viewer and chat (persisted to localStorage)
 *   • Voice input via Web Speech API (mic → text → review → send)
 *   • Prominent role selector in the session config bar (above messages)
 *   • Generate 3 options mode (Balanced / Encouraging / Rigorous), saved as preference
 *   • Document viewer shows real PDF slide images — NOT Vision analysis text
 *   • Left panel tabs: Document | Conversation History
 */

import React, {
  Suspense, useCallback, useEffect, useRef, useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { config } from '@/lib/config';
import { avatarApi } from '@/lib/avatarApi';
import type { AvatarResponse } from '@/types/avatar';
import RoleSelector, { type SelectedRole } from '@/components/sessions/RoleSelector';
import AvatarIcon from '@/components/avatars/AvatarIcon';
import {
  ArrowLeft, Send, FileText, ClipboardList, BookOpen,
  MessageSquare, Loader2, CheckCircle, Sparkles, Plus, RefreshCw,
  ChevronLeft, ChevronRight, Image as ImageIcon, Mic, MicOff, Users,
  Pencil, X, Check, Play,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SlideData {
  slideNumber: number;
  title: string | null;
  content: string | null;
  imagePath: string | null;
  thumbnailPath: string | null;
  source?: string;
}

interface SessionInfo {
  sessionId: string;
  classDetails: {
    className: string; courseName: string; courseCode: string;
    courseId?: string; duration: number;
  };
  avatarId?: string | null;
  totalSlides: number;
  runCount: number;
}

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
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  isOptions?: false;
  editedContent?: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

async function apiFetch<T>(url: string, token: string | null, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.detail || `HTTP ${res.status}`);
  return data as T;
}

// ─── Voice input hook (Web Speech API) ───────────────────────────────────────

function useVoiceInput(onPartial: (t: string) => void, onFinal: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';

    r.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((res: any) => res[0].transcript)
        .join('');
      if (e.results[e.results.length - 1].isFinal) {
        onFinal(transcript);
      } else {
        onPartial(transcript);
      }
    };
    r.onend  = () => setListening(false);
    r.onerror = () => setListening(false);

    recogRef.current = r;
    r.start();
    setListening(true);
  }, [onFinal, onPartial]);

  const stop = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

// ─── Drag-to-resize hook ──────────────────────────────────────────────────────

function useDragResize(storageKey: string, defaultPct = 0.38) {
  const [leftPx, setLeftPx] = useState<number>(() => {
    if (typeof window === 'undefined') return 420;
    const s = localStorage.getItem(storageKey);
    return s ? parseInt(s) : Math.round(window.innerWidth * defaultPct);
  });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const start = e.clientX;
    const startW = leftPx;

    const onMove = (ev: MouseEvent) => {
      const next = Math.max(260, Math.min(window.innerWidth * 0.72, startW + ev.clientX - start));
      setLeftPx(next);
    };
    const onUp = (ev: MouseEvent) => {
      const final = Math.max(260, Math.min(window.innerWidth * 0.72, startW + ev.clientX - start));
      localStorage.setItem(storageKey, String(Math.round(final)));
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftPx, storageKey]);

  return { leftPx, onMouseDown };
}

// ─── Option dimension labels ──────────────────────────────────────────────────

const OPTION_DIMENSIONS: Record<string, { label: string; badge: string; border: string }> = {
  A: { label: 'Balanced',    badge: 'bg-[#BA984E]/20 text-[#133221]',     border: 'border-[#133221] hover:border-[#133221] hover:bg-primary/5 dark:bg-gray-800'    },
  B: { label: 'Encouraging', badge: 'bg-purple-100 text-purple-700', border: 'border-purple-300 hover:border-purple-500 hover:bg-purple-50' },
  C: { label: 'Rigorous',    badge: 'bg-primary/10 text-primary/90',border: 'border-primary/30 hover:border-primary/50 hover:bg-primary/5' },
};

// ─── Role Selection Modal ─────────────────────────────────────────────────────

function RoleSelectionModal({
  templateId, onSelect, onSkip,
}: {
  templateId: string;
  onSelect: (role: SelectedRole) => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-[#133221] to-[#0a1e13] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800/20 flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Select a Role</h2>
              <p className="text-blue-100 text-sm">Personalise the AI&apos;s behaviour for this session</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose the role of the person the AI will be interacting with. This is per-session — you can change it next time.
          </p>
          <RoleSelector
            templateId={templateId}
            selected={null}
            onSelect={(role) => { if (role) onSelect(role); }}
            className="w-full"
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={onSkip}
              className="flex-1 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:bg-gray-900 transition-colors">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Editable Response ────────────────────────────────────────────────

function EditableResponse({
  messageId, avatarId, sessionId, token, originalContent, editedContent, onEditSaved,
}: {
  messageId: string;
  avatarId?: string | null;
  sessionId?: string;
  token: string | null;
  originalContent: string;
  editedContent?: string;
  onEditSaved: (messageId: string, edited: string) => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(editedContent ?? originalContent);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const handleEdit = () => {
    setDraft(editedContent ?? originalContent);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(editedContent ?? originalContent);
  };

  const handleSave = async () => {
    if (!draft.trim() || draft === originalContent) { setEditing(false); return; }
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch(config.getApiUrl(`/api/publisher/messages/${messageId}/edit`), token, {
        method: 'POST',
        body: JSON.stringify({
          original_content: originalContent,
          edited_content: draft.trim(),
          avatar_id: avatarId || undefined,
          session_id: sessionId || undefined,
        }),
      });
      onEditSaved(messageId, draft.trim());
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* non-fatal */ } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="mt-1.5 space-y-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.max(3, draft.split('\n').length + 1)}
          autoFocus
          className="w-full text-sm border border-[#133221] rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-[#133221] focus:border-[#133221] leading-relaxed"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-1 text-xs bg-[#133221] text-white px-3 py-1.5 rounded-lg hover:bg-[#0a1e13] disabled:opacity-40 transition-colors">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save edit
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
            <X size={11} /> Cancel
          </button>
          <span className="text-[10px] text-gray-400 ml-auto">
            Saves as publisher refinement for analysis
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <button
        onClick={handleEdit}
        title="Edit this response"
        className="flex items-center gap-1 p-1 rounded text-gray-300 hover:text-[#133221] hover:bg-primary/5 dark:bg-gray-800 transition-colors text-[11px]">
        <Pencil size={12} />
        <span>Edit</span>
      </button>
      {(editedContent && editedContent !== originalContent) && (
        <span className="text-[10px] text-[#133221] bg-primary/5 dark:bg-gray-800 px-1.5 py-0.5 rounded font-medium">Refined</span>
      )}
      {saved && <span className="text-[10px] text-primary font-medium">Saved</span>}
    </div>
  );
}

// ─── Document Viewer ──────────────────────────────────────────────────────────

function DocumentViewer({ slides }: { slides: SlideData[] }) {
  const [current, setCurrent] = useState(0);
  const studentSlides = slides.filter((s) => s.source !== 'solution');

  if (studentSlides.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gray-900">
        <ImageIcon size={40} className="text-gray-700 dark:text-gray-300" />
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed max-w-[180px]">
          No document uploaded.<br />Upload a PDF when creating the session.
        </p>
      </div>
    );
  }

  const slide = studentSlides[current];
  const imageUrl = slide.imagePath ? config.getApiUrl(slide.imagePath) : null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-900">
      {/* Compact nav */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-800 flex-shrink-0">
        <button onClick={() => setCurrent((p) => Math.max(0, p - 1))} disabled={current === 0}
          className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-25 transition-colors">
          <ChevronLeft size={14} className="text-gray-400" />
        </button>
        <div className="flex-1 text-center min-w-0">
          {slide.title && (
            <p className="text-gray-300 text-[11px] font-medium truncate">{slide.title}</p>
          )}
          <p className="text-gray-600 dark:text-gray-400 text-[10px]">{current + 1} / {studentSlides.length}</p>
        </div>
        <button onClick={() => setCurrent((p) => Math.min(studentSlides.length - 1, p + 1))}
          disabled={current === studentSlides.length - 1}
          className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-25 transition-colors">
          <ChevronRight size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Image — fills all space */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center min-h-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={slide.title || `Slide ${slide.slideNumber}`}
            className="w-full h-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              const fb = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
              if (fb) fb.style.display = 'flex';
            }}
          />
        ) : null}
        <div style={{ display: imageUrl ? 'none' : 'flex' }}
          className="w-full h-32 flex-col items-center justify-center gap-2 text-center p-4">
          <ImageIcon size={24} className="text-gray-700 dark:text-gray-300" />
          <p className="text-xs text-gray-600 dark:text-gray-400">Slide image unavailable</p>
        </div>
      </div>

      {/* Thumbnails */}
      {studentSlides.length > 1 && (
        <div className="flex gap-1 px-2 py-1.5 overflow-x-auto flex-shrink-0 border-t border-gray-800">
          {studentSlides.map((s, i) => {
            const tUrl = s.thumbnailPath ? config.getApiUrl(s.thumbnailPath) : null;
            return (
              <button key={i} onClick={() => setCurrent(i)} title={`Slide ${s.slideNumber}`}
                className={`flex-shrink-0 rounded border-2 overflow-hidden transition-all ${
                  i === current ? 'border-[#133221]' : 'border-transparent opacity-50 hover:opacity-80'
                }`} style={{ width: 40, height: 30 }}>
                {tUrl
                  ? <img src={tUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  : <span className="w-full h-full bg-gray-700 text-[9px] text-gray-400 font-bold flex items-center justify-center">{s.slideNumber}</span>
                }
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Left Panel (tabbed: Document | History) ──────────────────────────────────

function LeftPanel({
  slides, conversations, activeConvId, convsLoading, onSelectConv, onNewConv, widthPx,
}: {
  slides: SlideData[];
  conversations: Conversation[];
  activeConvId: string | null;
  convsLoading: boolean;
  onSelectConv: (id: string) => void;
  onNewConv: () => void;
  widthPx: number;
}) {
  const [tab, setTab] = useState<'doc' | 'convs'>('doc');

  return (
    <aside
      className="flex-shrink-0 bg-gray-950 text-white flex flex-col h-full border-r border-gray-800"
      style={{ width: widthPx }}>
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        <button onClick={() => setTab('doc')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            tab === 'doc' ? 'text-white border-b-2 border-[#133221]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-300'
          }`}>
          <FileText size={12} /> Document
        </button>
        <button onClick={() => setTab('convs')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            tab === 'convs' ? 'text-white border-b-2 border-[#133221]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-300'
          }`}>
          <MessageSquare size={12} /> History
        </button>
      </div>

      {tab === 'doc' ? (
        <DocumentViewer slides={slides} />
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-2 border-b border-gray-800 flex-shrink-0">
            <button onClick={onNewConv}
              className="w-full flex items-center gap-2 bg-[#133221] hover:bg-[#0a1e13] text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
              <Plus size={13} /> New Conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {convsLoading && <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-gray-500 dark:text-gray-400" /></div>}
            {!convsLoading && conversations.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-xs text-center py-6">No conversations yet.</p>
            )}
            {conversations.map((c) => (
              <button key={c.id} onClick={() => onSelectConv(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeConvId === c.id ? 'bg-[#133221] text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}>
                <p className="truncate text-xs font-medium leading-tight">{c.title}</p>
                <p className={`text-[10px] mt-0.5 ${activeConvId === c.id ? 'text-blue-200' : 'text-gray-600 dark:text-gray-400'}`}>
                  {c.message_count} msg{c.message_count !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Drag handle ─────────────────────────────────────────────────────────────

function DragHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-1.5 flex-shrink-0 h-full cursor-col-resize relative select-none group"
      style={{ background: hovered ? '#3b82f6' : '#1f2937' }}
    >
      {/* Visual dots hint */}
      <div className="absolute inset-y-0 left-0 w-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {[0,1,2].map((i) => <div key={i} className="w-1 h-1 rounded-full bg-white dark:bg-gray-800/60" />)}
      </div>
    </div>
  );
}

// ─── Option cards ─────────────────────────────────────────────────────────────

function OptionCards({ options, onSelect, selecting }: {
  options: { option_id: string; content: string }[];
  onSelect: (sel: { option_id: string; content: string }, rej: { option_id: string; content: string }[]) => void;
  selecting: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-400 flex items-center gap-1">
        <Sparkles size={12} /> Choose the best response:
      </p>
      {options.map((opt) => {
        const dim = OPTION_DIMENSIONS[opt.option_id] ?? { label: `Option ${opt.option_id}`, badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700 hover:border-gray-400' };
        return (
          <button key={opt.option_id} disabled={selecting}
            onClick={() => onSelect(opt, options.filter((o) => o.option_id !== opt.option_id))}
            className={`w-full text-left p-4 border-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${dim.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dim.badge}`}>{dim.label}</span>
              {selecting && <Loader2 size={12} className="animate-spin text-gray-400" />}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{opt.content}</p>
          </button>
        );
      })}
    </div>
  );
}

// ─── Right panel ─────────────────────────────────────────────────────────────

function RightPanel({ session, avatar }: {
  session: SessionInfo | null;
  avatar: AvatarResponse | null;
}) {
  const cfg = avatar?.configuration;
  return (
    <aside className="w-44 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-y-auto">
      {session && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Session</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs leading-tight truncate">{session.classDetails.className}</p>
          <p className="text-[10px] text-gray-400 truncate">{session.classDetails.courseName}</p>
          <div className="mt-2 flex gap-1.5 text-[10px]">
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded p-1.5 text-center">
              <p className="font-bold text-gray-900 dark:text-gray-100">{session.totalSlides}</p>
              <p className="text-gray-400">Slides</p>
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded p-1.5 text-center">
              <p className="font-bold text-gray-900 dark:text-gray-100">{session.runCount}</p>
              <p className="text-gray-400">Runs</p>
            </div>
          </div>
        </div>
      )}
      {avatar && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Avatar</p>
          <div className="flex items-center gap-1.5 mb-2">
            <AvatarIcon imageUrl={avatar.template_image_url ?? null} name={avatar.name} size={24} rounded="md" />
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{avatar.name}</p>
          </div>
          {cfg && (
            <div className="space-y-1 text-[10px]">
              {[
                { icon: <FileText size={10} />,      label: 'Knowledge', n: cfg.knowledge_documents?.length ?? 0 },
                { icon: <ClipboardList size={10} />, label: 'Rubrics',   n: cfg.rubrics?.length ?? 0 },
                { icon: <BookOpen size={10} />,      label: 'References', n: cfg.reference_solutions?.length ?? 0 },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">{r.icon} {r.label}</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{r.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="p-3">
        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Context</p>
        <div className="space-y-0.5 text-[10px] text-gray-400">
          {['System prompt', 'Rubric', 'Knowledge', 'Slides', 'History'].map((l) => (
            <p key={l} className="flex items-center gap-1">
              <CheckCircle size={8} className="text-primary/50 flex-shrink-0" /> {l}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SessionChatInner() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const token  = useToken();

  const [session, setSession]   = useState<SessionInfo | null>(null);
  const [avatar, setAvatar]     = useState<AvatarResponse | null>(null);
  const [slides, setSlides]     = useState<SlideData[]>([]);
  const [loading, setLoading]   = useState(true);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading]   = useState(true);
  const [activeConvId, setActiveConvId]   = useState<string | null>(null);
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [responseCount, setResponseCount] = useState(1);
  const [selectedRole, setSelectedRole]         = useState<SelectedRole | null>(null);
  const [showRoleModal, setShowRoleModal]       = useState(false);
  const [sessionStarted, setSessionStarted]     = useState(false);
  const [starting, setStarting]                 = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Draggable divider
  const { leftPx, onMouseDown: startDrag } = useDragResize('session_chat_left_w', 0.38);

  // Voice input — mic appends to input field
  const handlePartialTranscript = useCallback((t: string) => setInput(t), []);
  const handleFinalTranscript   = useCallback((t: string) => setInput(t), []);
  const voice = useVoiceInput(handlePartialTranscript, handleFinalTranscript);

  // ── Data loading ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !token) return;
    (async () => {
      try {
        const [sessionsData, fullSession] = await Promise.all([
          apiFetch<{ sessions: SessionInfo[] }>(config.getApiUrl('/api/sessions?limit=100'), token),
          apiFetch<{ slidesDetails: SlideData[] }>(config.getApiUrl(`/api/sessions/${sessionId}`), token),
        ]);
        const found = sessionsData.sessions.find((s) => s.sessionId === sessionId) ?? null;
        setSession(found);
        setSlides(fullSession.slidesDetails ?? []);
        if (found?.avatarId) {
          const av = await avatarApi.get(found.avatarId);
          setAvatar(av);
        }
      } catch { /* non-fatal */ } finally { setLoading(false); }
    })();
  }, [sessionId, token]);

  // Show role-selection modal when the avatar loads and no conversation is active yet
  useEffect(() => {
    if (avatar?.template_id && !loading && !activeConvId && !sessionStarted) {
      setShowRoleModal(true);
    }
  }, [avatar, loading, activeConvId, sessionStarted]);

  const startSession = async (role: SelectedRole | null) => {
    if (!token || !avatar?.id) return;
    setStarting(true); setError(null);
    try {
      const prefs = role
        ? { selected_role: { name: role.name, prompt_context: role.prompt_context } }
        : undefined;
      const res = await apiFetch<{ conversation_id: string; message_id: string; opening_message: string; created_at: string }>(
        config.getApiUrl('/api/publisher/chat/start'), token,
        { method: 'POST', body: JSON.stringify({ avatar_id: avatar.id, session_id: sessionId, preferences: prefs }) }
      );
      // Persist selected role to the session record
      if (role?.id) {
        apiFetch(config.getApiUrl(`/api/sessions/${sessionId}/role`), token, {
          method: 'PATCH',
          body: JSON.stringify({ role_id: role.id }),
        }).catch(() => { /* non-fatal — role preference still applied in-memory */ });
      }
      setActiveConvId(res.conversation_id);
      setMessages([{
        id: res.message_id,
        role: 'assistant',
        content: res.opening_message,
        created_at: res.created_at,
      }]);
      setSessionStarted(true);
      await loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setStarting(false); }
  };

  const loadConversations = useCallback(async () => {
    setConvsLoading(true);
    try {
      const data = await apiFetch<{ conversations: Conversation[] }>(config.getApiUrl('/api/publisher/conversations'), token);
      setConversations(data.conversations ?? []);
    } catch { setConversations([]); } finally { setConvsLoading(false); }
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load response count preference
  useEffect(() => {
    if (!token) return;
    apiFetch<{ preferences: { key: string; value: unknown }[] }>(
      config.getApiUrl('/api/publisher/preferences'), token
    ).then((d) => {
      const p = (d.preferences ?? []).find((x) => x.key === 'response_count');
      if (p && typeof p.value === 'number') setResponseCount(Math.min(5, Math.max(1, p.value)));
    }).catch(() => {});
  }, [token]);

  const changeResponseCount = async (n: number) => {
    const clamped = Math.min(5, Math.max(1, n));
    setResponseCount(clamped);
    apiFetch(config.getApiUrl('/api/publisher/preferences'), token, {
      method: 'PUT',
      body: JSON.stringify({ key: 'response_count', value: clamped }),
    }).catch(() => {});
  };

  const selectConversation = async (id: string) => {
    setActiveConvId(id); setMessages([]); setMessagesLoading(true);
    try {
      const data = await apiFetch<{ messages: Message[] }>(config.getApiUrl(`/api/publisher/conversations/${id}`), token);
      setMessages(data.messages ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setMessagesLoading(false); }
  };

  const startNew = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
    setSessionStarted(false);
    if (avatar?.template_id) setShowRoleModal(true);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleEditSaved = useCallback((msgId: string, edited: string) => {
    setMessages((prev) => prev.map((m) =>
      m.id === msgId && !('isOptions' in m && m.isOptions)
        ? { ...m, editedContent: edited } as Message
        : m
    ));
  }, []);

  const buildPrefs = () => selectedRole
    ? { selected_role: { name: selectedRole.name, prompt_context: selectedRole.prompt_context } }
    : undefined;

  // ── Send / Options ────────────────────────────────────────────────
  const sendSingle = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim(); setInput(''); setSending(true); setError(null);
    const tid = `t-${Date.now()}`;
    setMessages((p) => [...p, { id: tid, role: 'user', content: msg, created_at: new Date().toISOString() }]);
    try {
      const res = await apiFetch<{ conversation_id: string; message_id: string; reply: string; created_at: string }>(
        config.getApiUrl('/api/publisher/chat'), token,
        { method: 'POST', body: JSON.stringify({ conversation_id: activeConvId, avatar_id: avatar?.id, session_id: sessionId, message: msg, preferences: buildPrefs() }) }
      );
      if (!activeConvId) { setActiveConvId(res.conversation_id); await loadConversations(); }
      setMessages((p) => [
        ...p.filter((m) => m.id !== tid),
        { id: `u-${Date.now()}`, role: 'user', content: msg, created_at: res.created_at },
        { id: res.message_id, role: 'assistant', content: res.reply, created_at: res.created_at },
      ]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Send failed'); setMessages((p) => p.filter((m) => m.id !== tid)); }
    finally { setSending(false); }
  };

  const sendOptions = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim(); setInput(''); setSending(true); setError(null);
    const tid = `t-${Date.now()}`;
    setMessages((p) => [...p, { id: tid, role: 'user', content: msg, created_at: new Date().toISOString() }]);
    try {
      const res = await apiFetch<{ conversation_id: string; options: { option_id: string; content: string }[] }>(
        config.getApiUrl('/api/publisher/chat/options'), token,
        { method: 'POST', body: JSON.stringify({ conversation_id: activeConvId, avatar_id: avatar?.id, session_id: sessionId, message: msg, n: responseCount, preferences: buildPrefs() }) }
      );
      if (!activeConvId) { setActiveConvId(res.conversation_id); await loadConversations(); }
      setMessages((p) => [
        ...p.filter((m) => m.id !== tid),
        { id: `u-${Date.now()}`, role: 'user', content: msg, created_at: new Date().toISOString() },
        { id: `o-${Date.now()}`, role: 'options', isOptions: true, userMessage: msg, options: res.options, created_at: new Date().toISOString() },
      ]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); setMessages((p) => p.filter((m) => m.id !== tid)); }
    finally { setSending(false); }
  };

  const handleSend = () => { if (responseCount > 1) sendOptions(); else sendSingle(); };
  const handleKey  = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const selectOption = async (msgId: string, userMsg: string, sel: { option_id: string; content: string }, rej: { option_id: string; content: string }[]) => {
    if (!activeConvId) return;
    setSelecting(true);
    try {
      await apiFetch(config.getApiUrl('/api/publisher/chat/select'), token, {
        method: 'POST',
        body: JSON.stringify({ conversation_id: activeConvId, avatar_id: avatar?.id, user_message: userMsg, selected_response: sel.content, rejected_responses: rej.map((r) => r.content) }),
      });
      setMessages((p) => p.map((m) => m.id === msgId
        ? { id: `s-${Date.now()}`, role: 'assistant' as const, content: sel.content, created_at: new Date().toISOString() }
        : m));
      await loadConversations();
    } catch (e) { setError(e instanceof Error ? e.message : 'Selection failed'); }
    finally { setSelecting(false); }
  };

  return (
    <div className="flex h-full overflow-hidden select-none">
      {/* ── Role Selection Modal ── */}
      {showRoleModal && avatar?.template_id && (
        <RoleSelectionModal
          templateId={avatar.template_id}
          onSelect={(role) => {
            setSelectedRole(role);
            setShowRoleModal(false);
            startSession(role);
          }}
          onSkip={() => {
            setShowRoleModal(false);
            startSession(null);
          }}
        />
      )}

      {/* ── Left: Document + History ── */}
      <LeftPanel
        slides={slides}
        conversations={conversations}
        activeConvId={activeConvId}
        convsLoading={convsLoading}
        onSelectConv={selectConversation}
        onNewConv={startNew}
        widthPx={leftPx}
      />

      {/* ── Drag handle ── */}
      <DragHandle onMouseDown={startDrag} />

      {/* ── Center: Chat ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-900 select-text">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => router.back()} className="p-1 rounded hover:bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:text-gray-300 flex-shrink-0 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                {loading ? 'Loading…' : (session?.classDetails.className ?? 'Session Chat')}
              </p>
              {avatar && <p className="text-[11px] text-gray-400 truncate">{avatar.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {error && <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded max-w-[160px] truncate">{error}</span>}
            <button onClick={loadConversations} className="p-1 rounded hover:bg-gray-100 dark:bg-gray-800 text-gray-400 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Role selection bar — always visible, prominent */}
        {avatar?.template_id && (
          <div className={`flex items-center gap-3 px-4 py-2 border-b flex-shrink-0 transition-colors ${
            selectedRole ? 'bg-primary/5 dark:bg-gray-800 border-primary/10 dark:border-primary/95' : 'bg-amber-50 border-amber-100'
          }`}>
            <Users size={14} className={selectedRole ? 'text-[#133221]' : 'text-amber-500'} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">Role:</span>
            <RoleSelector
              templateId={avatar.template_id}
              selected={selectedRole}
              onSelect={setSelectedRole}
            />
            {selectedRole ? (
              <span className="text-xs text-[#133221] bg-[#BA984E]/20 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                {selectedRole.name}
              </span>
            ) : (
              <span className="text-xs text-amber-600 flex-shrink-0">
                Select a role to personalize the AI&apos;s behaviour
              </span>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!activeConvId && messages.length === 0 && !messagesLoading && !starting && (
            <div className="text-center py-16">
              <Sparkles size={36} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {avatar ? `${avatar.name} — AI Workspace` : 'Session AI Workspace'}
              </h3>
              <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto">
                {selectedRole
                  ? `Role "${selectedRole.name}" selected. Start a session to begin.`
                  : 'Select a role and start a session, or type a message below.'}
              </p>
              {avatar?.id && (
                <button
                  onClick={() => startSession(selectedRole)}
                  className="mt-4 flex items-center gap-2 mx-auto bg-[#133221] text-white px-5 py-2.5 rounded-xl hover:bg-[#0a1e13] transition-colors font-medium text-sm">
                  <Play size={14} /> Start Session
                </button>
              )}
            </div>
          )}
          {starting && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={24} className="animate-spin text-[#133221]" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Starting session…</p>
            </div>
          )}
          {messagesLoading && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>}
          {messages.map((m) => {
            if ((m as OptionsMessage).isOptions) {
              const om = m as OptionsMessage;
              return (
                <OptionCards key={om.id} options={om.options}
                  onSelect={(sel, rej) => selectOption(om.id, om.userMessage, sel, rej)}
                  selecting={selecting} />
              );
            }
            const cm = m as Message;
            return (
              <div key={cm.id} className={`flex ${cm.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[74%]">
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    cm.role === 'user'
                      ? 'bg-[#133221] text-white rounded-br-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm shadow-sm'
                  }`}>
                    {cm.content}
                  </div>
                  {cm.role === 'assistant' && (
                    <EditableResponse
                      messageId={cm.id}
                      avatarId={avatar?.id}
                      sessionId={sessionId}
                      token={token}
                      originalContent={cm.content}
                      editedContent={cm.editedContent}
                      onEditSaved={handleEditSaved}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                <Loader2 size={15} className="animate-spin text-gray-400" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex-shrink-0">
          {/* Voice mode hint */}
          {voice.listening && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-600 font-medium">Recording… speak now. Release to stop.</span>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  voice.listening
                    ? 'Listening…'
                    : responseCount > 1
                    ? `Ask a question — get ${responseCount} response options to compare…`
                    : 'Ask anything… (Enter to send, Shift+Enter for newline)'
                }
                rows={2}
                disabled={sending || voice.listening}
                className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#133221] focus:border-[#133221] resize-none text-sm disabled:opacity-60 leading-relaxed"
              />
              {/* Mic button — inside the textarea, bottom-right */}
              {voice.supported && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); if (voice.listening) voice.stop(); else voice.start(); }}
                  title={voice.listening ? 'Stop recording' : 'Start voice input'}
                  className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-lg transition-colors ${
                    voice.listening
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800'
                  }`}>
                  {voice.listening ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || voice.listening}
              className="flex items-center gap-1.5 bg-[#133221] text-white px-4 py-2.5 rounded-xl hover:bg-[#0a1e13] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm flex-shrink-0 h-[42px]">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {responseCount > 1 ? 'Generate' : 'Send'}
            </button>
          </div>

          {/* Response count selector */}
          <div className="flex items-center gap-2 mt-2">
            <Sparkles size={11} className="text-purple-500 flex-shrink-0" />
            <span className="text-xs text-gray-500 dark:text-gray-400 select-none">Generate</span>
            <select
              value={responseCount}
              onChange={(e) => changeResponseCount(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer accent-purple-600"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n === 1 ? '1 response' : `${n} responses`}</option>
              ))}
            </select>
            {responseCount > 1 && (
              <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                Options mode
              </span>
            )}
          </div>
        </div>
      </main>

      {/* ── Right: Stats ── */}
      <RightPanel session={session} avatar={avatar} />
    </div>
  );
}

export default function PublisherSessionChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-400" /></div>}>
      <SessionChatInner />
    </Suspense>
  );
}
