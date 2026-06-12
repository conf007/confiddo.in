/**
 * Shared fixture builders for the parity tests.
 * Mirrors the AttemptData constructor used in the Python pinning runs
 * (defaults identical to metrics_service.py:59-71). Verified 2026-06-11.
 */
import type { AllMetrics, AttemptData, MetricResult, MetricStatus } from "../types";
import { makeAttempt } from "../types";

const T0 = new Date(2026, 5, 1, 10, 0, 0); // matches Python pin script datetime(2026,6,1,10,0,0)

export interface AttOpts {
  /** answered unless explicitly null */
  sel?: string | null;
  correct?: boolean;
  t?: number;
  hints?: number;
  changes?: number;
  pers?: boolean;
  gave?: boolean;
  diff?: string;
  median?: number | null;
}

/** Build an attempt at sequence position i (createdAt = T0 + i minutes). */
export function att(i: number, opts: AttOpts = {}): AttemptData {
  return makeAttempt({
    selectedOptionId: opts.sel === undefined ? "x" : opts.sel,
    isCorrect: opts.correct ?? false,
    timeSpentMs: opts.t ?? 0,
    hintsUsed: opts.hints ?? 0,
    optionChanges: opts.changes ?? 0,
    persistedAfterWrong: opts.pers ?? false,
    gaveUpAfterWrong: opts.gave ?? false,
    difficulty: opts.diff ?? "medium",
    createdAt: new Date(T0.getTime() + i * 60_000),
    populationMedianMs: opts.median ?? null,
  });
}

/** n attempts produced by a factory keyed on index, with sequential createdAt. */
export function seq(n: number, f: (i: number) => AttOpts): AttemptData[] {
  return Array.from({ length: n }, (_, i) => att(i, f(i)));
}

const GREEN: MetricResult = { score: 0.9, status: "green" };

/** Synthetic all-green metric map for gate tests, with per-key overrides. */
export function mkMetrics(overrides: Partial<Record<keyof AllMetrics, Partial<MetricResult>>> = {}): AllMetrics {
  const keys = [
    "air", "tfa", "ocb", "hup", "phe", "scc", "dpi",
    "rgd", "fad", "tcr", "hsb", "peb", "ewp", "gep", "dap",
  ] as const;
  const out = {} as AllMetrics;
  for (const k of keys) {
    out[k] = { ...GREEN, ...(overrides[k] ?? {}) };
  }
  return out;
}

/** Count statuses the way the readiness algorithm does (neutral counts as green). */
export function countStatuses(metrics: AllMetrics): { green: number; yellow: number; red: number } {
  const statuses = Object.values(metrics).map((m) => m.status as MetricStatus);
  return {
    green: statuses.filter((s) => s === "green" || s === "neutral").length,
    yellow: statuses.filter((s) => s === "yellow").length,
    red: statuses.filter((s) => s === "red").length,
  };
}
