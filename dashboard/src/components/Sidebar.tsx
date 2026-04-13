import { PenSquare, MessageSquare, LogOut, X, ArrowLeft } from "lucide-react";
import { Conversation } from "../types";

interface Props {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onLogout: () => void;
  onToggle: () => void;
  onHome: () => void;
}

export default function Sidebar({ open, conversations, activeId, onSelect, onNew, onLogout, onToggle, onHome }: Props) {
  return (
    <div
      className={`
        fixed md:relative z-30 flex flex-col h-full transition-all duration-300 flex-shrink-0
        ${open ? "w-72 translate-x-0" : "w-72 -translate-x-full md:w-0 md:overflow-hidden"}
      `}
      style={{ background: "#ffffff", borderRight: "1px solid #e2e8f0" }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <button onClick={onHome} className="flex items-center gap-2 group">
          <span className="text-2xl">🐪</span>
          <span className="font-display text-sm font-semibold transition-colors truncate" style={{ color: "#0f172a" }}>Single Source of Truth</span>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onNew}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#94a3b8" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0f172a")}
            onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
            title="New chat"
          >
            <PenSquare size={16} />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#94a3b8" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#0f172a")}
            onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="text-xs text-center mt-6 px-3" style={{ color: "#94a3b8" }}>No conversations yet</p>
        ) : (
          <>
            {/* Pinned conversations */}
            {conversations.filter((c) => c.isPinned).map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors"
                style={{
                  background: activeId === conv.id ? "rgba(0,184,144,0.08)" : "rgba(0,184,144,0.03)",
                  color: activeId === conv.id ? "#00b890" : "#64748b",
                  borderLeft: "2px solid #00b890",
                }}
                onMouseEnter={e => { if (activeId !== conv.id) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (activeId !== conv.id) e.currentTarget.style.background = "rgba(0,184,144,0.03)"; }}
              >
                <span style={{ fontSize: "14px" }}>📌</span>
                <span className="truncate">{conv.title}</span>
              </button>
            ))}

            {/* Regular conversations */}
            {conversations.filter((c) => !c.isPinned).map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors"
                style={{
                  background: activeId === conv.id ? "rgba(0,184,144,0.08)" : "transparent",
                  color: activeId === conv.id ? "#00b890" : "#64748b",
                }}
                onMouseEnter={e => { if (activeId !== conv.id) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (activeId !== conv.id) e.currentTarget.style.background = "transparent"; }}
              >
                <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
                <span className="truncate">{conv.title}</span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="p-2" style={{ borderTop: "1px solid #e2e8f0" }}>
        <button
          onClick={onHome}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1"
          style={{ color: "#94a3b8" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f172a")}
          onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors"
          style={{ color: "#94a3b8" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f172a")}
          onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
