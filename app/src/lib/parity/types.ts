/**
 * Parity types — TypeScript mirrors of the backend's pure-function inputs/outputs.
 *
 * Source of truth:
 *   confiddo/backend/app/services/metrics_service.py:59-80
 *     - AttemptData  (:59-71)
 *     - SessionData  (:74-80)
 *   Metric result dicts use the Python keys verbatim: `score`, `status`,
 *   `category` (optional reason string), plus DPI's `persistence_rate`
 *   (-> persistenceRate) and TCR's `dump_detected` (-> dumpDetected).
 *
 * Field names are camelCase equivalents of the Python snake_case fields.
 * DISPLAY/VERIFICATION ONLY — the backend stays authoritative.
 * Verified 2026-06-11.
 */

export interface AttemptData {
  /** Python: selected_option_id (None => question viewed but never answered) */
  selectedOptionId: string | null;
  /** Python: is_correct */
  isCorrect: boolean;
  /** Python: time_spent_ms */
  timeSpentMs: number;
  /** Python: hints_used */
  hintsUsed: number;
  /** Python: option_changes */
  optionChanges: number;
  /** Python: persisted_after_wrong */
  persistedAfterWrong: boolean;
  /** Python: gave_up_after_wrong */
  gaveUpAfterWrong: boolean;
  /** Python: difficulty — "easy" | "medium" | "hard" | "very_hard" (free-form string, default "medium") */
  difficulty: string;
  /** Python: created_at */
  createdAt: Date | null;
  /** Python: population_median_ms — per-question median for NT15 RGD */
  populationMedianMs: number | null;
}

/** Build an AttemptData with the same defaults as the Python dataclass (:59-71). */
export function makeAttempt(partial: Partial<AttemptData> = {}): AttemptData {
  return {
    selectedOptionId: null,
    isCorrect: false,
    timeSpentMs: 0,
    hintsUsed: 0,
    optionChanges: 0,
    persistedAfterWrong: false,
    gaveUpAfterWrong: false,
    difficulty: "medium",
    createdAt: null,
    populationMedianMs: null,
    ...partial,
  };
}

export interface SessionData {
  /** Python: status — in_progress / completed / abandoned */
  status: string;
  /** Python: started_at */
  startedAt: Date | null;
  /** Python: completed_at */
  completedAt: Date | null;
  /** Python: total_time_ms */
  totalTimeMs: number;
}

/** Build a SessionData with the same defaults as the Python dataclass (:74-80). */
export function makeSession(partial: Partial<SessionData> = {}): SessionData {
  return {
    status: "completed",
    startedAt: null,
    completedAt: null,
    totalTimeMs: 0,
    ...partial,
  };
}

/**
 * Statuses written by the backend (StudentMetric.metric_category).
 * "neutral" = insufficient data; the readiness algorithm counts it as green
 * (metrics_service.py:850).
 */
export type MetricStatus = "green" | "yellow" | "red" | "neutral";

/**
 * Mirror of the Python metric result dict.
 * `score` mirrors the Python "score" key (the metric value) and `category`
 * mirrors "category" (the optional reason string, e.g. "rushing").
 */
export interface MetricResult {
  score: number;
  status: MetricStatus;
  category?: string;
  /** DPI only — Python "persistence_rate" */
  persistenceRate?: number;
  /** TCR only — Python "dump_detected" */
  dumpDetected?: boolean;
}

/** The 15 metric keys as returned by calculate_all_metrics_pure (metrics_service.py:810-826). */
export type MetricKey =
  | "air" | "tfa" | "ocb" | "hup" | "phe" | "scc" | "dpi"
  | "rgd" | "fad" | "tcr" | "hsb" | "peb" | "ewp" | "gep" | "dap";

export type AllMetrics = Record<MetricKey, MetricResult>;

/** Obfuscation map — DB/API use m01-m15 codes (metrics_service.py:41-46). */
export const METRIC_OBFUSCATION: Record<string, string> = {
  AIR: "m01", TFA: "m02", OCB: "m03", HUP: "m04",
  PHE: "m05", SCC: "m06", DPI: "m07",
  RGD: "m08", FAD: "m09", TCR: "m10", HSB: "m11",
  PEB: "m12", EWP: "m13", GEP: "m14", DAP: "m15",
};

export type ReadinessCode =
  | "avoidant"
  | "attempting"
  | "practicing"
  | "confident"
  | "competition_ready";

export type ReadinessLevel = 1 | 2 | 3 | 4 | 5;

/** Mirror of calculate_readiness_level_pure's result dict (metrics_service.py:867-879). */
export interface ReadinessResult {
  level: ReadinessLevel;
  code: ReadinessCode;
  /** Backend display name ("Avoidant", ... metrics_service.py:857-863) */
  displayName: string;
  metrics: AllMetrics;
  /** INTERNAL ONLY — never expose to students/parents (metrics_service.py:10-11) */
  accuracy: number;
  weightedAccuracy: number;
  /** INTERNAL ONLY — Elo-inspired ability estimate */
  theta: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
}
