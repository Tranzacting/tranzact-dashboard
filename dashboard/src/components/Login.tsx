import { useState, FormEvent } from "react";

interface Props { onLogin: (token: string) => void; }

export default function Login({ onLogin }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const token = btoa(password);

    // Local fallback for development
    if (password === "Shreshta!2$$" || password === "please") {
      onLogin(token);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        onLogin(token);
      } else {
        setError("Wrong password. Did you try 'Shreshta!2$$'? 😅");
      }
    } catch {
      setError("Connection error. Try 'Shreshta!2$$' or 'please'");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f8fafc" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-5 animate-float inline-block">🐪</div>
          <h1 className="font-display text-2xl font-bold mb-1" style={{ color: "#0f172a" }}>Single Source of Truth</h1>
          <p className="font-display text-base font-semibold glow-text mb-4">Marketing Dashboard</p>
          <a
            href="https://fcbtech.slack.com/team/U09QF47RS84"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-3 rounded-xl text-sm transition-all text-center"
            style={{
              background: "rgba(0,184,144,0.06)",
              border: "2px dashed rgba(0,184,144,0.35)",
              textDecoration: "none",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,184,144,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,184,144,0.06)"; }}
          >
            <p className="text-sm leading-relaxed text-center" style={{ color: "#64748b" }}>
              Your marketing team built this so you'd stop asking them for numbers.{" "}
              <span className="font-semibold" style={{ color: "#00b890" }}>☕ Coffee?</span>
            </p>
          </a>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#00b890")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#00b890", color: "#ffffff" }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#009678"; }}
              onMouseLeave={e => (e.currentTarget.style.background = "#00b890")}
            >
              {loading ? "Checking..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
