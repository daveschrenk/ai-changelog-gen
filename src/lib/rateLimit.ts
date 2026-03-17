/**
 * Rate limiter — Supabase-backed with in-memory fallback for local dev.
 *
 * Supabase table schema (run in SQL editor):
 *
 * create table usage (
 *   id uuid primary key default gen_random_uuid(),
 *   ip text not null,
 *   month text not null,          -- format: "YYYY-MM"
 *   count integer not null default 0,
 *   updated_at timestamptz default now(),
 *   unique (ip, month)
 * );
 */

import { supabase } from "./supabase";

const FREE_TIER_LIMIT = 5;

// In-memory fallback (local dev / no Supabase configured)
const memStore = new Map<string, number>();

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const month = currentMonth();

  if (!supabase) {
    // In-memory fallback
    const key = `${ip}:${month}`;
    const count = memStore.get(key) ?? 0;
    if (count >= FREE_TIER_LIMIT) {
      return { allowed: false, remaining: 0, limit: FREE_TIER_LIMIT };
    }
    memStore.set(key, count + 1);
    return { allowed: true, remaining: FREE_TIER_LIMIT - count - 1, limit: FREE_TIER_LIMIT };
  }

  // Upsert usage record and return new count
  const { data, error } = await supabase.rpc("increment_usage", { p_ip: ip, p_month: month });

  if (error) {
    console.error("Supabase rate limit error:", error);
    // Fail open — don't block users if DB is down
    return { allowed: true, remaining: FREE_TIER_LIMIT, limit: FREE_TIER_LIMIT };
  }

  const count: number = data ?? 1;
  const remaining = Math.max(0, FREE_TIER_LIMIT - count);
  return { allowed: count <= FREE_TIER_LIMIT, remaining, limit: FREE_TIER_LIMIT };
}
