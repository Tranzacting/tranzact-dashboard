import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { SendHorizonal, Menu, ArrowLeft } from "lucide-react";
import Message from "./Message";
import WelcomeScreen from "./WelcomeScreen";
import { Conversation, Message as MsgType } from "../types";

interface Insights {
  highlights?: string[];
  concerns?: string[];
  recommended_questions?: string[];
}

interface Props {
  token: string;
  conversation: Conversation | null;
  onNewConversation: () => string;
  onUpdateConversation: (id: string, updater: (c: Conversation) => Conversation) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onBackToHome: () => void;
  insights?: Insights;
}

export default function ChatInterface({ token, conversation, onNewConversation, onUpdateConversation, sidebarOpen, onToggleSidebar, onBackToHome, insights }: Props) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    let convId = conversation?.id;
    if (!convId) convId = onNewConversation();

    const userMsg: MsgType = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantMsg: MsgType = { id: crypto.randomUUID(), role: "assistant", content: "", toolCalls: [], isStreaming: true };

    onUpdateConversation(convId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? text.slice(0, 50) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "24px";
    setIsLoading(true);

    const history = [...(conversation?.messages ?? []), userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            onUpdateConversation(convId!, (c) => {
              const msgs = [...c.messages];
              const idx = msgs.findIndex((m) => m.id === assistantMsg.id);
              if (idx === -1) return c;
              const msg = { ...msgs[idx] };
              if (event.type === "text_delta") msg.content = (msg.content || "") + event.text;
              else if (event.type === "tool_start") msg.toolCalls = [...(msg.toolCalls ?? []), { name: event.name, status: "running" as const }];
              else if (event.type === "tool_done") msg.toolCalls = (msg.toolCalls ?? []).map((tc) => tc.name === event.name ? { ...tc, status: "done" as const } : tc);
              else if (event.type === "done") msg.isStreaming = false;
              msgs[idx] = msg;
              return { ...c, messages: msgs };
            });
          } catch { /* ignore */ }
        }
      }
    } catch {
      onUpdateConversation(convId!, (c) => {
        const msgs = [...c.messages];
        const idx = msgs.findIndex((m) => m.id === assistantMsg.id);
        if (idx !== -1) msgs[idx] = { ...msgs[idx], content: "Something went wrong. Please try again.", isStreaming: false };
        return { ...c, messages: msgs };
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const messages = conversation?.messages ?? [];

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ background: "#ffffff" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10"
        style={{ background: "rgba(255,255,255,0.95)", borderBottom: "1px solid #e2e8f0", backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{ color: "#94a3b8" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#0f172a")}
          onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
        >
          <Menu size={18} />
        </button>
        <button
          onClick={onBackToHome}
          className="p-1.5 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "#94a3b8" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#00b890")}
          onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
          title="Back to home"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Home</span>
        </button>
        <h1 className="font-display text-sm font-medium truncate flex-1" style={{ color: "#64748b" }}>
          {conversation?.title || "Marketing Dashboard"}
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ background: "#f8fafc" }}>
        {messages.length === 0 ? (
          <WelcomeScreen onPrompt={(p) => sendMessage(p)} insights={insights} />
        ) : (
          <div className="max-w-3xl mx-auto px-3 sm:px-6 pb-4">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="px-3 sm:px-4 py-3 sm:py-4"
        style={{ background: "rgba(255,255,255,0.95)", borderTop: "1px solid #e2e8f0" }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-end gap-2 sm:gap-3 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 transition-all"
            style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#00b890")}
            onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about campaigns, leads, deals..."
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none min-h-[24px] max-h-[160px] leading-6"
              style={{ color: "#0f172a", caretColor: "#00b890", height: "24px" }}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "#00b890" }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#009678"; }}
              onMouseLeave={e => (e.currentTarget.style.background = "#00b890")}
            >
              <SendHorizonal size={15} color="#ffffff" />
            </button>
          </div>
          <p className="text-center text-xs mt-2 hidden sm:block" style={{ color: "#94a3b8" }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
