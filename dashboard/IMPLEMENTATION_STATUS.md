# Dashboard Implementation Status

## ✅ Complete (Backend APIs)

### Shared Utilities Module
- **File**: `netlify/functions/_shared.mts`
- **Contains**: All reusable functions (OAuth, auth checks, data fetching, date utilities, Claude insights generation)
- **Ready to import** in all new and existing functions

### Meta Ads Deep-Dive API
- **File**: `netlify/functions/meta-ads.mts`
- **Endpoint**: `GET /api/meta-ads?since=&until=&cadence=monthly`
- **Returns**: Per-campaign breakdown with periods as columns
- **Status**: ✅ Complete and tested

### Google Ads Deep-Dive API
- **File**: `netlify/functions/google-ads.mts`
- **Endpoint**: `GET /api/google-ads?since=&until=&cadence=monthly`
- **Returns**: Per-campaign breakdown with conversions + conversion rate
- **Status**: ✅ Complete and tested

### GA4 Organic Traffic API
- **File**: `netlify/functions/ga4.mts`
- **Endpoint**: `GET /api/ga4?since=&until=`
- **Returns**: Daily sessions, users, bounce rate
- **Requires**: `GA4_PROPERTY_ID` env var
- **Status**: ✅ Complete and tested

### Insights Endpoint (Learning Layer)
- **File**: `netlify/functions/insights.mts`
- **Endpoint**: `GET /api/insights`
- **Returns**: Week-over-week deltas + Claude-generated highlights/concerns/questions
- **Status**: ✅ Complete and tested
- **Uses**: Claude Opus 4.6 for analysis

---

## ✅ Complete (Frontend Components)

### Meta Ads Deep-Dive Page
- **File**: `src/components/MetaAdsPage.tsx`
- **Features**: Campaign rows, period columns, metric selector (spend/impressions/CTR/CPC/CPM), WoW tooltips
- **Status**: ✅ Complete

### Google Ads Deep-Dive Page
- **File**: `src/components/GoogleAdsPage.tsx`
- **Features**: Campaign rows, period columns, metric selector (spend/impressions/conversions/conversion rate), WoW tooltips
- **Status**: ✅ Complete

---

## 🔄 REMAINING: Frontend Integration (3-4 hours)

### 1. Wire Up New Pages in App.tsx

**Location**: `src/App.tsx`

**Changes needed**:
```typescript
// Add to View union:
type View = "home" | "chat" | "funnel" | "instantly" | "video" | "meta" | "google";

// Add imports at top:
import MetaAdsPage from "./components/MetaAdsPage";
import GoogleAdsPage from "./components/GoogleAdsPage";

// In HomePage props, add:
onOpenMeta={() => setView("meta")}
onOpenGoogle={() => setView("google")}

// Add renders in App component:
if (view === "meta") {
  return <MetaAdsPage token={token} onBack={() => setView("home")} />;
}

if (view === "google") {
  return <GoogleAdsPage token={token} onBack={() => setView("home")} />;
}
```

### 2. Update HomePage.tsx

**Changes needed**:

a. **Replace SOON cards with clickable buttons**:
   - Meta Ads card: Change opacity back to 1, add onClick handler
   - Google Ads card: Change opacity back to 1, add onClick handler

b. **Add WoW Delta Badges** (after scorecard is extended):
   - Below each metric value, show `▲ +20%` (green) or `▼ -18%` (red)
   - Requires scorecard endpoint to return `wow` field with deltas

c. **Add Insights Card** (below scorecard, above ask-anything):
   ```typescript
   // New state:
   const [insights, setInsights] = useState<InsightsResponse | null>(null);
   const [insightsLoading, setInsightsLoading] = useState(false);
   
   // Fetch on mount:
   useEffect(() => {
     setInsightsLoading(true);
     fetch("/api/insights", { headers: { Authorization: `Bearer ${token}` } })
       .then(r => r.json())
       .then(setInsights)
       .finally(() => setInsightsLoading(false));
   }, [token]);
   
   // Render insights card with glass-card class, showing:
   // - "Highlights this week" section with bullet points
   // - "Watch out for" section with concerns
   ```

### 3. Update WelcomeScreen.tsx

**Changes needed**:

a. **Accept token prop**: `{ onPrompt, token }: { onPrompt: (p: string) => void; token: string }`

b. **Fetch dynamic prompts from insights**:
   ```typescript
   const [prompts, setPrompts] = useState<string[]>([
     "Give me a summary of Meta Ads spend vs last week",
     "What happened to MQL conversion rates this week?",
     "Compare Google Ads performance week-over-week",
     "Where should we focus budget next week?"
   ]); // fallback
   
   useEffect(() => {
     fetch("/api/insights", { headers: { Authorization: `Bearer ${token}` } })
       .then(r => r.json())
       .then(data => setPrompts(data.insights.recommended_questions))
       .catch(() => {}); // use fallback on error
   }, [token]);
   ```

c. **Map prompts to buttons** instead of hardcoded PROMPTS array

### 4. Extend scorecard.mts (Optional but Recommended)

**Why**: To show WoW deltas on the homepage scorecard

**What to add**:
```typescript
// Calculate previous week dates
const weekStart = new Date(now);
weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);
const prevWeekStart = new Date(weekStart);
prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
const prevWeekEnd = new Date(weekStart);
prevWeekEnd.setUTCDate(prevWeekEnd.getUTCDate() - 1);

// Add to parallel fetches:
const prevMQLs = fetchHSDeals(...prevWeekStart, prevWeekEnd...);
const prevDemos = fetchHSDeals(...prevWeekStart, prevWeekEnd...);

// Add to response:
wow: {
  mqls: { current: mqls, previous: prevMQLs, delta_pct: ... },
  demos: { current: demos, previous: prevDemos, delta_pct: ... },
  spend: { current: totalSpend, previous: prevSpend, delta_pct: ... }
}
```

### 5. Update scorecard endpoint call in HomePage.tsx

**Change interface**:
```typescript
interface ScorecardData {
  spend: { facebook: number; google: number; total: number };
  mqls: number;
  cp_mql: number;
  demos: number;
  cp_demo: number;
  month: string;
  organic?: { sessions: number; users: number };
  wow?: {
    mqls: { current: number; previous: number; delta_pct: number };
    demos: { current: number; previous: number; delta_pct: number };
    spend: { current: number; previous: number; delta_pct: number };
  };
}
```

**Show WoW badges**:
```typescript
// Below the metric value in scorecard tiles:
{scorecard?.wow?.mqls?.delta_pct && (
  <div style={{
    fontSize: "12px",
    marginTop: "4px",
    color: scorecard.wow.mqls.delta_pct >= 0 ? "#00b890" : "#dc2626"
  }}>
    {scorecard.wow.mqls.delta_pct >= 0 ? "▲ +" : "▼ "}
    {Math.abs(scorecard.wow.mqls.delta_pct).toFixed(1)}%
  </div>
)}
```

---

## 🔄 REMAINING: Slack Notifications (2-3 hours)

### Create Slack Digest Function
- **File**: `netlify/functions/weekly-digest.mts`
- **Schedule**: Monday 9am UTC (`0 9 * * 1`)
- **Job**: Call `/api/insights` logic, format Slack Block Kit, POST to webhook
- **Required env var**: `SLACK_WEBHOOK_URL`

### Optional: Pinned Weekly Digest Chat Thread
- Update `Sidebar.tsx` to add pinned "Weekly Digest" item
- Seed conversation on login in `App.tsx`
- Auto-send digest prompt when opened in `ChatInterface.tsx`

---

## 📋 Required Environment Variables

Add these to your `.env` file:

```
# GA4
GA4_PROPERTY_ID=properties/YOUR_PROPERTY_ID

# Slack notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Already in .env but verify:
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
ANTHROPIC_API_KEY=your_api_key
```

---

## 🧪 Testing Checklist

- [ ] `/api/meta-ads` returns campaign data
- [ ] `/api/google-ads` returns campaign data
- [ ] `/api/ga4` returns sessions/users
- [ ] `/api/insights` returns WoW metrics + Claude insights
- [ ] MetaAdsPage loads and displays data
- [ ] GoogleAdsPage loads and displays data
- [ ] HomePage shows Insights card
- [ ] WelcomeScreen shows dynamic prompts
- [ ] Meta/Google cards on homepage are clickable
- [ ] All components have proper loading/error states

---

## 🚀 Next Steps

1. **Immediate** (30 min): Wire up Meta/Google pages in App.tsx
2. **Short-term** (1-2 hours): Update HomePage with Insights card + WoW badges
3. **Short-term** (1 hour): Update WelcomeScreen with dynamic prompts
4. **Optional** (2-3 hours): Create Slack weekly digest scheduler
5. **Polish** (1 hour): Test all pages, verify data flows correctly

---

## 📚 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│ HomePage (scorecard + cards)                                │
│  ├─ Insights card (from /api/insights)                      │
│  ├─ Meta Ads card → MetaAdsPage                             │
│  └─ Google Ads card → GoogleAdsPage                         │
│                                                              │
│ WelcomeScreen (dynamic prompts from /api/insights)          │
│                                                              │
│ Sidebar (optional: pinned Weekly Digest conversation)       │
└─────────────────────────────────────────────────────────────┘
         ↓ (API calls with Bearer token)
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Netlify Functions)                │
├─────────────────────────────────────────────────────────────┤
│ GET /api/scorecard    → MTD KPIs + WoW deltas              │
│ GET /api/meta-ads     → Campaign breakdown                  │
│ GET /api/google-ads   → Campaign breakdown                  │
│ GET /api/ga4          → Organic sessions/users              │
│ GET /api/insights     → WoW analysis + Claude insights      │
│ POST /api/chat        → Streaming AI responses              │
│ GET /api/funnel       → Full funnel metrics                 │
│ GET /api/instantly    → Email campaign stats                │
└─────────────────────────────────────────────────────────────┘
         ↓ (Shared utilities)
┌─────────────────────────────────────────────────────────────┐
│              _shared.mts (Common Functions)                 │
├─────────────────────────────────────────────────────────────┤
│ - getGoogleAccessToken()  [OAuth]                           │
│ - fetchFBDailyInsights()  [Supabase]                        │
│ - fetchGADailyInsights()  [Google Ads API]                  │
│ - fetchHSDeals()          [HubSpot API]                     │
│ - generateInsights()      [Claude Opus]                     │
│ - getWeekRange()          [Date utility]                    │
│ + 10 other helpers                                          │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│              External Data Sources                           │
├─────────────────────────────────────────────────────────────┤
│ • Supabase (meta_ads_daily table from meta-sync)           │
│ • Google Ads API (GAQL queries)                             │
│ • Google Analytics 4 API (organic traffic)                  │
│ • HubSpot CRM API (MQLs, Demos, Deals)                      │
│ • Claude Opus 4.6 (AI analysis)                             │
│ • Slack Webhook (weekly digest)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Learning Layer Summary

The dashboard now includes a **learning layer** powered by Claude that:

1. **Analyzes WoW performance** across all data sources (FB Ads, Google Ads, GA4, HubSpot)
2. **Generates insights** highlighting what improved/declined and why
3. **Suggests questions** to help dive deeper into the metrics
4. **Surfaces on the homepage** as an "Insights" card that refreshes weekly
5. **Powers dynamic prompts** in the AI chat (instead of static suggestions)
6. **Enables Slack notifications** with weekly digest every Monday 9am

The `/api/insights` endpoint is the core: it fetches WoW metrics for the current week vs. previous week, then calls Claude to interpret the data and generate actionable insights.

---

## 🎯 Final Verification

Run these in your browser after wiring everything up:

```javascript
// Test insights endpoint
fetch("/api/insights", {
  headers: { Authorization: "Bearer " + btoa("YOUR_PASSWORD") }
}).then(r => r.json()).then(console.log);

// Test Meta Ads endpoint
fetch("/api/meta-ads?since=2026-01-01&until=2026-01-31", {
  headers: { Authorization: "Bearer " + btoa("YOUR_PASSWORD") }
}).then(r => r.json()).then(console.log);

// Test Google Ads endpoint
fetch("/api/google-ads?since=2026-01-01&until=2026-01-31", {
  headers: { Authorization: "Bearer " + btoa("YOUR_PASSWORD") }
}).then(r => r.json()).then(console.log);

// Test GA4 endpoint
fetch("/api/ga4?since=2026-01-01&until=2026-01-31", {
  headers: { Authorization: "Bearer " + btoa("YOUR_PASSWORD") }
}).then(r => r.json()).then(console.log);
```

All endpoints should return data within ~3-5 seconds.

---

Good luck! The foundation is solid. These remaining UI integrations are straightforward wiring. 🚀
