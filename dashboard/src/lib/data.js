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

// ---------- article-count combo chart (incremental bars + cumulative line) ----------
export function articleCountSeries(reading, period = "week") {
  const keyFn = period === "month" ? monthKey : period === "year" ? yearKey : weekKey;
  const labelFn = (k) => k;
  const buckets = new Map();
  for (const r of reading) {
    const k = keyFn(new Date(r.created_at));
    buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  const keys = [...buckets.keys()].sort();
  let cumulative = 0;
  return keys.map((k) => {
    cumulative += buckets.get(k);
    return { period: labelFn(k), count: buckets.get(k), cumulative };
  });
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
