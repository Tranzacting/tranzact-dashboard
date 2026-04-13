import { useState, useEffect } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import HomePage from "./components/HomePage";
import InstantlyPage from "./components/InstantlyPage";
import MetaAdsPage from "./components/MetaAdsPage";
import MetaAdsTablePage from "./components/MetaAdsTablePage";
import GoogleAdsPage from "./components/GoogleAdsPage";
import CompleteFunnelPage from "./components/CompleteFunnelPage";
import { VideoPreview } from "./pages/VideoPreview";
import { Conversation } from "./types";

type View = "home" | "chat" | "funnel" | "instantly" | "video" | "meta" | "meta-table" | "google";

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("dash_token"));
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [insights, setInsights] = useState<any>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const createConversation = (): string => {
    const id = crypto.randomUUID();
    const conv: Conversation = { id, title: "New conversation", messages: [], createdAt: new Date() };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    return id;
  };

  const updateConversation = (id: string, updater: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const handleLogout = () => {
    localStorage.removeItem("dash_token");
    setToken(null);
    setView("home");
  };

  // Fetch insights and create pinned digest once when token is available
  useEffect(() => {
    if (!token) return;

    // Mock insights data (replace with real API call later)
    const mockInsights = {
      highlights: [
        "MQL generation up 30% - excellent campaign efficiency this week",
        "Google Ads conversion rate improved 18% with optimized targeting",
      ],
      concerns: [
        "Demo booking rate dropped 18% - possible lead quality issue",
        "Meta Ads CTR declined 12% - audience may be fatigued",
      ],
      recommended_questions: [
        "Which campaigns drove the 30% MQL increase?",
        "Why did demos drop despite more MQLs - lead quality issue?",
        "What changed in Google Ads to improve conversion by 18%?",
        "Should we pause and refresh Meta creative?",
      ],
    };
    setInsights(mockInsights);

    // Create pinned weekly digest conversation if it doesn't exist
    setConversations((prev) => {
      const digestExists = prev.some((c) => c.isPinned);
      if (digestExists) return prev;

      const digestSummary = `📊 Weekly Marketing Digest (Week of ${new Date().toLocaleDateString()})

**✨ Highlights:**
${mockInsights.highlights.map((h) => `• ${h}`).join("\n")}

**⚠️ Watch Out For:**
${mockInsights.concerns.map((c) => `• ${c}`).join("\n")}

**💡 Questions to Explore:**
${mockInsights.recommended_questions.map((q) => `• ${q}`).join("\n")}`;

      const digestConversation: Conversation = {
        id: "digest-" + new Date().toISOString().split("T")[0],
        title: "📋 Weekly Digest",
        messages: [
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: digestSummary,
          },
        ],
        createdAt: new Date(),
        isPinned: true,
      };

      return [digestConversation, ...prev];
    });
  }, [token]);

  if (!token) {
    return <Login onLogin={(t) => { localStorage.setItem("dash_token", t); setToken(t); }} />;
  }

  if (view === "home") {
    return (
      <div className="min-h-screen" style={{ background: "#f8fafc" }}>
        <HomePage
          token={token}
          onOpenChat={() => setView("chat")}
          onOpenFunnel={() => setView("funnel")}
          onOpenInstantly={() => setView("instantly")}
          onOpenVideo={() => setView("video")}
          onOpenMeta={() => setView("meta")}
          onOpenMetaTable={() => setView("meta-table")}
          onOpenGoogle={() => setView("google")}
        />
      </div>
    );
  }

  if (view === "funnel") {
    return <CompleteFunnelPage token={token} onBack={() => setView("home")} />;
  }

  if (view === "instantly") {
    return <InstantlyPage token={token} onBack={() => setView("home")} />;
  }

  if (view === "meta") {
    return <MetaAdsPage token={token} onBack={() => setView("home")} />;
  }

  if (view === "meta-table") {
    return <MetaAdsTablePage token={token} onBack={() => setView("home")} />;
  }

  if (view === "google") {
    return <GoogleAdsPage token={token} onBack={() => setView("home")} />;
  }

  if (view === "video") {
    return (
      <div className="min-h-screen" style={{ background: "#f8fafc" }}>
        <div style={{ padding: "20px" }}>
          <button
            onClick={() => setView("home")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            ← Back to Home
          </button>
        </div>
        <VideoPreview />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8fafc" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
        onNew={() => { createConversation(); setSidebarOpen(false); }}
        onLogout={handleLogout}
        onToggle={() => setSidebarOpen((v) => !v)}
        onHome={() => setView("home")}
      />
      <ChatInterface
        token={token}
        conversation={activeConversation}
        onNewConversation={createConversation}
        onUpdateConversation={updateConversation}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onBackToHome={() => setView("home")}
        insights={insights}
      />
    </div>
  );
}
