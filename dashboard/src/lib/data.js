// Data access + aggregation for the dashboard.
// Reading history / genre / charts derive from reading_log; the impulse counter and
// its history derive from impulse_log (Spec §7/§8). Aggregation is done client-side —
// fine at MVP scale, and keeps everything behind RLS with a single anon client.

import { supabase } from "./supabase.js";

export async function fetchReadingLog() {
  const { data, error } = await supabase
    .from("reading_log")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchImpulseLog() {
  const { data, error } = await supabase
    .from("impulse_log")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchBlocklist() {
  const { data, error } = await supabase.from("blocklist").select("*").order("created_at");
  if (error) throw error;
  return data || [];
}

export async function fetchProfile() {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- date helpers ----------
const DAY = 86400000;
export function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
function ymd(d) { return d.toISOString().slice(0, 10); }
function weekKey(d) { return ymd(startOfWeek(d)); }
function monthKey(d) { return d.toISOString().slice(0, 7); }
function yearKey(d) { return String(d.getFullYear()); }

// ---------- stat cards ----------
export function impulsesThisWeek(impulses) {
  const start = startOfWeek();
  return impulses.filter((i) => new Date(i.created_at) >= start).length;
}

// Current streak = consecutive days (ending today or yesterday) with ≥1 completed read.
export function currentStreak(reading) {
  const days = new Set(reading.map((r) => ymd(new Date(r.created_at))));
  if (days.size === 0) return 0;
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Allow the streak to count from today; if nothing today, start from yesterday.
  if (!days.has(ymd(cursor))) cursor = new Date(cursor.getTime() - DAY);
  while (days.has(ymd(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return streak;
}

// ---------- article-count combo chart (calendar buckets + cumulative line) ----------
// week  -> 7 bars, one per day of the current week (Mon–Sun)
// month -> one bar per day of the current month (28–31)
// year  -> 12 bars, one per month of the current year (Jan–Dec)
// Each bar = articles read in that bucket; the line is the running total within the
// selected window. Returns [{ label, full, showLabel, count, cumulative }].
export function articleCountSeries(reading, period = "week") {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const times = reading.map((r) => new Date(r.created_at));
  const countBetween = (d0, d1) => times.filter((t) => t >= d0 && t < d1).length;
  const buckets = [];

  if (period === "month") {
    const y = now.getFullYear(), m = now.getMonth();
    const monName = now.toLocaleDateString("en-US", { month: "short" });
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      buckets.push({
        label: String(day), full: `${monName} ${day}`,
        showLabel: day === 1 || day % 7 === 1, // 1, 8, 15, 22, 29
        future: day > now.getDate(),
        count: countBetween(new Date(y, m, day), new Date(y, m, day + 1)),
      });
    }
  } else if (period === "year") {
    const y = now.getFullYear();
    const letters = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    const short = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let mo = 0; mo < 12; mo++) {
      buckets.push({
        label: letters[mo], full: short[mo], showLabel: true,
        future: mo > now.getMonth(),
        count: countBetween(new Date(y, mo, 1), new Date(y, mo + 1, 1)),
      });
    }
  } else {
    const start = startOfWeek(now);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d0 = new Date(start); d0.setDate(start.getDate() + i);
      const d1 = new Date(d0); d1.setDate(d0.getDate() + 1);
      buckets.push({
        label: days[i], full: days[i], showLabel: true,
        future: d0.getTime() > todayStart.getTime(),
        count: countBetween(d0, d1),
      });
    }
  }

  // Cumulative accrues only through today; future buckets carry no cumulative point.
  let cumulative = 0;
  return buckets.map((b) => {
    if (!b.future) cumulative += b.count;
    return { ...b, cumulative: b.future ? null : cumulative };
  });
}

// ---------- crossover: kept reading vs. went to site ----------
// Buckets impulses into "kept" (completed the gate → read the article) vs "site"
// (bailed → went to the distracting site), over the selected window. Mirrors the
// article-count bucketing: week → 7 days, month → weeks of the month, year → 12 months.
export function crossoverSeries(impulses, range = "week") {
  const now = new Date();
  const out = [];
  const push = (label, d0, d1) => {
    let kept = 0, site = 0;
    for (const i of impulses) {
      const t = new Date(i.created_at);
      if (t >= d0 && t < d1) (i.completed ? kept++ : site++);
    }
    out.push({ label, kept, site });
  };

  if (range === "year") {
    const y = now.getFullYear();
    const short = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 0; m < 12; m++) push(short[m], new Date(y, m, 1), new Date(y, m + 1, 1));
  } else if (range === "month") {
    const y = now.getFullYear(), m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let wk = 1;
    for (let day = 1; day <= daysInMonth; day += 7, wk++) {
      push("W" + wk, new Date(y, m, day), new Date(y, m, Math.min(day + 7, daysInMonth + 1)));
    }
  } else {
    const start = startOfWeek(now);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d0 = new Date(start); d0.setDate(start.getDate() + i);
      const d1 = new Date(d0); d1.setDate(d0.getDate() + 1);
      push(days[i], d0, d1);
    }
  }
  return out;
}

// ---------- genre distribution ----------
export function genreDistribution(reading) {
  const m = new Map();
  for (const r of reading) m.set(r.genre, (m.get(r.genre) || 0) + 1);
  return [...m.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------- doomscroll heatmap (hour × day-of-week from impulse_log) ----------
export function heatmap(impulses) {
  // grid[day][hour]; day 0 = Monday
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  for (const i of impulses) {
    const d = new Date(i.created_at);
    const day = (d.getDay() + 6) % 7;
    const hour = d.getHours();
    grid[day][hour]++;
    if (grid[day][hour] > max) max = grid[day][hour];
  }
  return { grid, max };
}

// ---------- serendipity tracker ----------
export function serendipity(reading) {
  const picks = reading.filter((r) => r.is_serendipity);
  const n = picks.length;
  const avg = (sel) => (n ? picks.reduce((s, r) => s + r[sel], 0) / n : 0);
  return {
    count: n,
    avgQuality: avg("quality_rating"),
    avgInterest: avg("preference_rating"),
    picks,
  };
}

// ---------- source scorecard ----------
export function sourceScorecard(reading) {
  const m = new Map();
  for (const r of reading) {
    const s = m.get(r.source) || { source: r.source, n: 0, q: 0, i: 0 };
    s.n++; s.q += r.quality_rating; s.i += r.preference_rating;
    m.set(r.source, s);
  }
  return [...m.values()]
    .map((s) => ({ source: s.source, count: s.n, quality: s.q / s.n, interest: s.i / s.n }))
    .sort((a, b) => b.quality - a.quality);
}

// ---------- impulse history (weekly, all time) ----------
export function impulseWeekly(impulses) {
  const m = new Map();
  for (const i of impulses) {
    const k = weekKey(new Date(i.created_at));
    const cur = m.get(k) || { week: k, total: 0, completed: 0 };
    cur.total++;
    if (i.completed) cur.completed++;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => a.week.localeCompare(b.week));
}

// ---------- impulse history: last N weeks + this-week metrics with trend ----------
// Powers the Impulse history page (design "4e" — aligned table). Returns the last
// `numWeeks` consecutive weeks — each split into completed vs bailed for the stacked
// bar chart — plus three metrics, each carrying a this-week value, the change vs last
// week, and an N-week series for the sparkline. Empty weeks are kept as zeros so both
// the bars and the trend line stay continuous.
//
// Everything comes from impulse_log (one row per gate trigger). The three tiles form
// one coherent story about gate visits: Gates completed ÷ Gate triggers = Completion
// rate, and the completed/bailed split is exactly what the bars show. (Reading volume
// lives elsewhere on the dashboard, so it isn't repeated here.)
export function impulseTrend(impulses, numWeeks = 8) {
  const agg = new Map();
  for (const i of impulses) {
    const k = weekKey(new Date(i.created_at));
    const cur = agg.get(k) || { total: 0, completed: 0 };
    cur.total++;
    if (i.completed) cur.completed++;
    agg.set(k, cur);
  }

  const start = startOfWeek();
  const weeks = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i * 7);
    const key = ymd(d);
    const rec = agg.get(key) || { total: 0, completed: 0 };
    const total = rec.total;
    const completed = rec.completed;
    weeks.push({
      key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      total,
      completed,
      bailed: total - completed,
      rate: total ? (completed / total) * 100 : 0,   // kept precise; rounded to 1dp at display
    });
  }

  const empty = { total: 0, completed: 0, rate: 0 };
  const last = weeks[weeks.length - 1] || empty;
  const prev = weeks[weeks.length - 2] || empty;
  // "vs last" only means something if the prior week had activity. Otherwise this is a
  // cold start (the user's first week) and a delta vs an empty week would be a
  // misleading full-value jump — so leave it null and the UI shows "—".
  const prevHasData = prev.total > 0;
  const diff = (a, b) => (prevHasData ? a - b : null);
  const metrics = [
    { key: "triggers",  name: "Gate triggers",   value: last.total,     delta: diff(last.total, prev.total),         goodWhenDown: true,  series: weeks.map((w) => w.total) },
    { key: "completed", name: "Gates completed", value: last.completed, delta: diff(last.completed, prev.completed), goodWhenDown: false, series: weeks.map((w) => w.completed) },
    { key: "rate",      name: "Completion rate", value: `${last.rate.toFixed(1)}%`,
      delta: prevHasData ? Math.round((last.rate - prev.rate) * 10) / 10 : null, unit: "pp", goodWhenDown: false,
      sub: "gates completed ÷ gate triggers", series: weeks.map((w) => w.rate) },
  ];

  return { weeks, metrics };
}
