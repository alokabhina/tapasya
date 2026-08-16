// src/components/group/GroupChat.jsx
// Group chat with 30 msg/day limit, 10s cooldown for non-admins; admin has no limits

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchGroupMessages, sendGroupMessage } from '../../api/groups';
import useUserStore from '../../store/userStore';
import Avatar from '../ui/Avatar';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function GroupChat({ groupId, isAdmin }) {
  const { uid, displayName } = useUserStore();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const cooldownRef = useRef(null);

  useEffect(() => {
    if (!groupId) return;
    loadMessages();
    pollRef.current = setInterval(loadMessages, 20000); // was 8000 — reduced to cut Vercel function invocations
    return () => clearInterval(pollRef.current);
  }, [groupId]);

  async function loadMessages() {
    try {
      const data = await fetchGroupMessages(groupId, null, 60);
      setMessages(data);
    } catch (e) {
      console.error('Chat load error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function startCooldown(seconds) {
    setCooldown(seconds);
    clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSend() {
    if (!text.trim() || sending) return;
    if (!isAdmin && cooldown > 0) return;
    if (!isAdmin && dailyCount >= 30) { setError('Daily limit: 30 messages/day reached'); return; }

    setSending(true);
    setError('');
    try {
      const msg = await sendGroupMessage(groupId, text.trim());
      setMessages(prev => [...prev, msg]);
      setText('');
      if (!isAdmin) {
        setDailyCount(prev => prev + 1);
        startCooldown(10);
      }
    } catch (e) {
      const errData = e?.response?.data;
      if (errData?.waitSeconds) startCooldown(errData.waitSeconds);
      setError(errData?.error || 'Message send nahi hua');
    } finally {
      setSending(false);
    }
  }

  // Group messages by date
  const grouped = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = formatDay(msg.createdAt);
    if (day !== lastDay) { grouped.push({ type: 'day', label: day }); lastDay = day; }
    grouped.push({ type: 'msg', msg });
  }

  const canSend = !sending && text.trim().length > 0 && (isAdmin || (cooldown === 0 && dailyCount < 30));
  const remaining = 30 - dailyCount;

  return (
    <div className="flex flex-col h-full bg-[#0a1628]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-slate-400 text-sm">Be the first to say something!</p>
            <p className="text-slate-600 text-xs mt-1">Members can send 30 messages/day</p>
          </div>
        )}
        {grouped.map((item, i) => {
          if (item.type === 'day') return (
            <div key={`day-${i}`} className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-600 font-medium px-2">{item.label}</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
          );
          const { msg } = item;
          const isMe = msg.userId?.toString() === uid?.toString();
          return (
            <div key={msg._id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
              {!isMe && <Avatar photoURL={msg.photoURL} name={msg.displayName} size="xs" />}
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className={`text-xs font-semibold ${msg.isAdmin ? 'text-orange-400' : 'text-slate-400'}`}>
                      {msg.displayName}
                    </span>
                    {msg.isAdmin && (
                      <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full font-bold tracking-wide">
                        ADMIN
                      </span>
                    )}
                  </div>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words
                  ${isMe
                    ? 'bg-orange-500 text-white rounded-tr-sm'
                    : msg.isAdmin
                      ? 'bg-orange-950/50 border border-orange-900/40 text-orange-100 rounded-tl-sm'
                      : 'bg-[#1e293b] text-slate-200 rounded-tl-sm'
                  }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-600 px-1">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Rate limit indicator */}
      {!isAdmin && (
        <div className="px-4 py-1 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            {remaining > 0 ? `${remaining} messages left today` : '⚠️ Daily limit reached'}
          </span>
          {cooldown > 0 && (
            <span className="text-[10px] text-orange-400 font-mono">
              ⏳ {cooldown}s
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 pb-1">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[#1e293b]">
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={!isAdmin && dailyCount >= 30 ? 'Daily limit reached' : !isAdmin && cooldown > 0 ? `Wait ${cooldown}s...` : 'Type a message...'}
            disabled={!isAdmin && (dailyCount >= 30)}
            maxLength={500}
            rows={1}
            className="flex-1 bg-[#1e293b] border border-[#334155] rounded-2xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 resize-none outline-none focus:border-orange-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '42px', maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors flex-shrink-0 active:scale-95"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <i className="ti ti-send text-white text-base" />
            }
          </button>
        </div>
        {text.length > 400 && (
          <p className="text-[10px] text-slate-600 text-right mt-1">{text.length}/500</p>
        )}
      </div>
    </div>
  );
}
