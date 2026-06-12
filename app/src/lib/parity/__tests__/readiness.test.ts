/**
 * §8.3 group 18 — calculateReadinessLevel / resolveReadinessGates
 * (metrics_service.py:829-937) + display names (suggestion_model.dart:4-22).
 *
 * The two full-pipeline goldens (L4/L5/small-test) were produced by executing
 * calculate_readiness_level_pure from the Python source on identical fixtures
 * (2026-06-12). Gate-cascade cases follow ARCHITECTURE.md §3.4/§8.3.18.
 */
import { describe, expect, it } from "vitest";
import {
  calculateReadinessLevel,
  READINESS_BACKEND_NAMES,
  READINESS_CODE_TO_LEVEL,
  READINESS_DISPLAY_NAMES,
  readinessDisplayName,
  resolveReadinessGates,
  type ReadinessGateInputs,
} from "../readiness";
import { makeSession } from "../types";
import { att, countStatuses, mkMetrics } from "./helpers";

// ──────────────────────────────────────────────────────────────────────
// Gate cascade (synthetic metric profiles)
// ──────────────────────────────────────────────────────────────────────

function gate(partial: Partial<ReadinessGateInputs> & Pick<ReadinessGateInputs, "metrics" | "wAcc">) {
  const counts = countStatuses(partial.metrics);
  return resolveReadinessGates({
    green: counts.green,
    red: counts.red,
    hasStrictDifficultyExposure: true,
    testLacksHard: false,
    ...partial,
  });
}

describe("resolveReadinessGates — L5", () => {
  it("all green, wAcc 0.81, exposure -> L5", () => {
    expect(gate({ metrics: mkMetrics(), wAcc: 0.81 })).toEqual({ level: 5, code: "competition_ready" });
  });

  it("1 red -> not L5, drops to L4", () => {
    const metrics = mkMetrics({ tcr: { status: "red" } }); // green 14, red 1
    expect(gate({ metrics, wAcc: 0.81 })).toEqual({ level: 4, code: "confident" });
  });

  it("wAcc 0.79 < 0.80 -> not L5, drops to L4", () => {
    expect(gate({ metrics: mkMetrics(), wAcc: 0.79 })).toEqual({ level: 4, code: "confident" });
  });

  it("RGD yellow blocks L5 even with red == 0 (rgd must be exactly green)", () => {
    const metrics = mkMetrics({ rgd: { status: "yellow", score: 0.3 } }); // green 14, red 0
    expect(gate({ metrics, wAcc: 0.85 })).toEqual({ level: 4, code: "confident" });
  });

  it("no exposure -> NEVER L5, even on an easy test (no bypass, ever); L4 bypass applies instead", () => {
    expect(
      gate({
        metrics: mkMetrics(),
        wAcc: 0.85,
        hasStrictDifficultyExposure: false,
        testLacksHard: true,
      }),
    ).toEqual({ level: 4, code: "confident" });
  });
});

describe("resolveReadinessGates — L4", () => {
  it("§8.3.18 golden: air green, dpi yellow, scc green, rgd yellow, fad green, green=10, red=2, wAcc 0.56, exposure -> L4", () => {
    const metrics = mkMetrics({
      dpi: { status: "yellow" },
      rgd: { status: "yellow", score: 0.3 },
      tfa: { status: "yellow" },
      hsb: { status: "red" },
      peb: { status: "red" },
    });
    expect(countStatuses(metrics)).toEqual({ green: 10, yellow: 3, red: 2 });
    expect(gate({ metrics, wAcc: 0.56 })).toEqual({ level: 4, code: "confident" });
  });

  it("easy-test bypass: exposure 0, test lacks hard, wAcc 0.76 -> L4", () => {
    expect(
      gate({ metrics: mkMetrics(), wAcc: 0.76, hasStrictDifficultyExposure: false, testLacksHard: true }),
    ).toEqual({ level: 4, code: "confident" });
  });

  it("easy-test bypass boundary: wAcc exactly 0.75 -> L4", () => {
    expect(
      gate({ metrics: mkMetrics(), wAcc: 0.75, hasStrictDifficultyExposure: false, testLacksHard: true }),
    ).toEqual({ level: 4, code: "confident" });
  });

  it("easy-test bypass: wAcc 0.74 -> falls to L3", () => {
    expect(
      gate({ metrics: mkMetrics(), wAcc: 0.74, hasStrictDifficultyExposure: false, testLacksHard: true }),
    ).toEqual({ level: 3, code: "practicing" });
  });

  it("no exposure on a test that HAS hard questions -> no bypass -> L3 even at wAcc 0.9", () => {
    expect(
      gate({ metrics: mkMetrics(), wAcc: 0.9, hasStrictDifficultyExposure: false, testLacksHard: false }),
    ).toEqual({ level: 3, code: "practicing" });
  });

  it("scc yellow blocks L4 (must be green) -> L3", () => {
    // wAcc kept below 0.80 so L5 can't fire: with only one yellow (scc),
    // green=14 ≥ n−1 and red=0 would satisfy L5 at wAcc ≥ 0.80
    // (metrics_service.py:895-898 — L5 tolerates one non-green).
    const metrics = mkMetrics({ scc: { status: "yellow" } });
    expect(gate({ metrics, wAcc: 0.6 })).toEqual({ level: 3, code: "practicing" });
  });

  it("fad red blocks L4 -> L3 (L3 does not check fad)", () => {
    const metrics = mkMetrics({ fad: { status: "red" } });
    expect(gate({ metrics, wAcc: 0.9 })).toEqual({ level: 3, code: "practicing" });
  });

  it("red = 3 > 2 blocks L4 -> L3", () => {
    const metrics = mkMetrics({
      hsb: { status: "red" },
      peb: { status: "red" },
      tcr: { status: "red" },
    });
    expect(gate({ metrics, wAcc: 0.9 })).toEqual({ level: 3, code: "practicing" });
  });
});

describe("resolveReadinessGates — L3 / L2 / L1", () => {
  it("wAcc boundary 0.35 -> L3 (scc yellow keeps it out of L4)", () => {
    const metrics = mkMetrics({ scc: { status: "yellow" } });
    expect(gate({ metrics, wAcc: 0.35 })).toEqual({ level: 3, code: "practicing" });
  });

  it("wAcc 0.3499 -> falls through L3 to L2 (rgd score < 0.40)", () => {
    const metrics = mkMetrics({ rgd: { status: "green", score: 0.1 } });
    expect(gate({ metrics, wAcc: 0.3499 })).toEqual({ level: 2, code: "attempting" });
  });

  it("air yellow blocks L3; rgd score 0.39 + red=8 -> L2", () => {
    const metrics = mkMetrics({
      air: { status: "yellow" },
      rgd: { status: "yellow", score: 0.39 },
      tfa: { status: "red" }, ocb: { status: "red" }, hup: { status: "red" },
      phe: { status: "red" }, dpi: { status: "red" }, fad: { status: "red" },
      tcr: { status: "red" }, hsb: { status: "red" },
    });
    expect(countStatuses(metrics).red).toBe(8);
    expect(gate({ metrics, wAcc: 0.5 })).toEqual({ level: 2, code: "attempting" });
  });

  it("same but rgd score 0.40 -> L1 (L2 gate is STRICT < 0.40)", () => {
    const metrics = mkMetrics({
      air: { status: "yellow" },
      rgd: { status: "yellow", score: 0.4 },
      tfa: { status: "red" }, ocb: { status: "red" }, hup: { status: "red" },
      phe: { status: "red" }, dpi: { status: "red" }, fad: { status: "red" },
      tcr: { status: "red" }, hsb: { status: "red" },
    });
    expect(gate({ metrics, wAcc: 0.5 })).toEqual({ level: 1, code: "avoidant" });
  });

  it("red = 9 > 8 -> L1", () => {
    const metrics = mkMetrics({
      air: { status: "yellow" },
      rgd: { status: "yellow", score: 0.1 },
      tfa: { status: "red" }, ocb: { status: "red" }, hup: { status: "red" },
      phe: { status: "red" }, dpi: { status: "red" }, fad: { status: "red" },
      tcr: { status: "red" }, hsb: { status: "red" }, peb: { status: "red" },
    });
    expect(countStatuses(metrics).red).toBe(9);
    expect(gate({ metrics, wAcc: 0.5 })).toEqual({ level: 1, code: "avoidant" });
  });

  it("air red blocks L2 -> L1", () => {
    const metrics = mkMetrics({ air: { status: "red" }, rgd: { score: 0.0 } });
    expect(gate({ metrics, wAcc: 0.3 })).toEqual({ level: 1, code: "avoidant" });
  });

  it("scc red blocks L2 -> L1 (air yellow keeps it out of L3)", () => {
    const metrics = mkMetrics({ air: { status: "yellow" }, scc: { status: "red" }, rgd: { score: 0.0 } });
    expect(gate({ metrics, wAcc: 0.9 })).toEqual({ level: 1, code: "avoidant" });
  });
});

describe("neutral counts as green (:850)", () => {
  it("countStatuses treats neutral as green", () => {
    const metrics = mkMetrics({
      fad: { status: "neutral" },
      dpi: { status: "neutral" },
      gep: { status: "neutral" },
    });
    expect(countStatuses(metrics)).toEqual({ green: 15, yellow: 0, red: 0 });
  });

  it("an all-neutral-or-green profile can reach L5", () => {
    const metrics = mkMetrics({ fad: { status: "neutral" }, dpi: { status: "neutral" } });
    expect(gate({ metrics, wAcc: 0.9 })).toEqual({ level: 5, code: "competition_ready" });
  });
});

// ──────────────────────────────────────────────────────────────────────
// Full-pipeline goldens (pinned by executing the Python source)
// ──────────────────────────────────────────────────────────────────────

/** [difficulty, isCorrect, timeMs, persistedAfterWrong] per question. */
const readyAttempts = (allCorrect: boolean) => {
  const spec: Array<[string, boolean, number, boolean]> = [
    ["easy", true, 8000, false],
    ["easy", true, 7000, false],
    ["medium", true, 12000, false],
    ["easy", true, 8000, false],
    ["hard", true, 20000, false],
    ["easy", true, 9000, false],
    ["medium", allCorrect, 14000, !allCorrect],
    ["easy", true, 8000, false],
    ["medium", true, 11000, false],
    ["hard", allCorrect, 22000, !allCorrect],
  ];
  return spec.map(([diff, correct, t, pers], i) => att(i, { diff, correct, t, pers }));
};
const session = makeSession({ status: "completed", totalTimeMs: 120000 });

describe("calculateReadinessLevel — full-pipeline goldens", () => {
  it("10Q realistic test, 8/10 correct, 20% hard answered -> L4 Confident (Python golden)", () => {
    const res = calculateReadinessLevel(readyAttempts(false), session);
    expect(res.level).toBe(4);
    expect(res.code).toBe("confident");
    expect(res.displayName).toBe("Confident");
    expect(res.accuracy).toBe(0.8);
    expect(res.weightedAccuracy).toBe(0.6944); // (5*1 + 2*2 + 1*3.5) / (5*1 + 3*2 + 2*3.5) = 12.5/18
    expect(res.theta).toBe(0.625); // Python golden
    expect(res.greenCount).toBe(15); // 14 green + dpi neutral
    expect(res.yellowCount).toBe(0);
    expect(res.redCount).toBe(0);
    expect(res.metrics).toEqual({
      air: { score: 1.0, status: "green" },
      tfa: { score: 11900, status: "green", category: "deliberate" },
      ocb: { score: 0.0, status: "green", category: "decisive_correct" },
      hup: { score: 0.0, status: "green", category: "healthy" },
      phe: { score: 1.0, status: "green", category: "independent" },
      scc: { score: 1.0, status: "green" },
      dpi: { score: 1.0, status: "neutral", category: "insufficient_wrong_data" },
      rgd: { score: 0.0, status: "green", category: "no_fast_answers" },
      fad: { score: 0.0, status: "green", category: "sustained" },
      tcr: { score: 0.1011, status: "green" },
      hsb: { score: 1.0, status: "green", category: "no_help_needed" },
      peb: { score: 1.0, status: "green" },
      ewp: { score: 1.5185, status: "green" },
      gep: { score: 0.9677, status: "green", category: "consistent" }, // 1 - 1/31
      dap: { score: 1.975, status: "green", category: "appropriate" }, // 15800/8000
    });
  });

  it("same test all-correct, wAcc 1.0 -> L5 Competition Ready (Python golden)", () => {
    const res = calculateReadinessLevel(readyAttempts(true), session);
    expect(res.level).toBe(5);
    expect(res.code).toBe("competition_ready");
    expect(res.displayName).toBe("Competition Ready");
    expect(res.accuracy).toBe(1.0);
    expect(res.weightedAccuracy).toBe(1.0);
    expect(res.theta).toBe(1.34); // Python golden
    expect(res.greenCount).toBe(15);
    expect(res.redCount).toBe(0);
    expect(res.metrics.gep).toEqual({ score: 1.0, status: "green", category: "consistent" });
  });

  it("5-question perfect test: FAD & DPI neutral count as green -> still L5 (Python golden)", () => {
    const attempts = [
      att(0, { correct: true, t: 8000, diff: "easy" }),
      att(1, { correct: true, t: 8000, diff: "easy" }),
      att(2, { correct: true, t: 8000, diff: "easy" }),
      att(3, { correct: true, t: 8000 }),
      att(4, { correct: true, t: 8000, diff: "hard" }),
    ];
    const res = calculateReadinessLevel(attempts, makeSession({ status: "completed", totalTimeMs: 40000 }));
    expect(res.level).toBe(5);
    expect(res.code).toBe("competition_ready");
    expect(res.weightedAccuracy).toBe(1.0);
    expect(res.theta).toBe(0.764); // Python golden
    expect(res.greenCount).toBe(14); // 12 green + fad/dpi neutral; ewp yellow (< 6 attempts)
    expect(res.yellowCount).toBe(1);
    expect(res.redCount).toBe(0);
    expect(res.metrics.fad).toEqual({ score: 0.0, status: "neutral", category: "insufficient_data" });
    expect(res.metrics.dpi).toEqual({ score: 1.0, status: "neutral", category: "insufficient_wrong_data" });
    expect(res.metrics.ewp).toEqual({ score: 1.0, status: "yellow" });
    expect(res.metrics.dap).toEqual({ score: 1.0, status: "green", category: "high_ability" });
  });
});

// ──────────────────────────────────────────────────────────────────────
// Names (metrics_service.py:857-863 / suggestion_model.dart:4-22)
// ──────────────────────────────────────────────────────────────────────

describe("readiness names", () => {
  it("backend display names", () => {
    expect(READINESS_BACKEND_NAMES).toEqual({
      1: "Avoidant",
      2: "Attempting",
      3: "Practicing",
      4: "Confident",
      5: "Competition Ready",
    });
  });

  it("client display names soften avoidant to 'Needs Encouragement'", () => {
    expect(READINESS_DISPLAY_NAMES.avoidant).toBe("Needs Encouragement");
    expect(readinessDisplayName("avoidant")).toBe("Needs Encouragement");
    expect(readinessDisplayName("competition_ready")).toBe("Competition Ready");
  });

  it("unknown code falls back to Practicing (suggestion_model.dart orElse)", () => {
    expect(readinessDisplayName("bogus")).toBe("Practicing");
  });

  it("code<->level maps mirror teacher_service.py:937", () => {
    expect(READINESS_CODE_TO_LEVEL).toEqual({
      avoidant: 1,
      attempting: 2,
      practicing: 3,
      confident: 4,
      competition_ready: 5,
    });
  });
});
