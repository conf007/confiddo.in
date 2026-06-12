/**
 * §8.3 groups 8-9 — DPI, RGD
 * (metrics_service.py:275-316, :319-384).
 * Every expected score/status/category below was produced by executing the
 * Python source on identical fixtures (2026-06-12).
 */
import { describe, expect, it } from "vitest";
import { calculateDpi, calculateRgd } from "../metrics";
import { att, seq } from "./helpers";

// ── m07 DPI (:275-316) ────────────────────────────────────────────────

describe("calculateDpi", () => {
  it("<= 2 wrong-flagged attempts -> NEUTRAL insufficient_wrong_data (raw base rate)", () => {
    // 9 answered (2 of them wrong+persisted), 1 viewed-only -> base 9/10 = 0.9
    const attempts = [
      ...seq(9, (i) => ({ correct: i < 7, pers: i >= 7 })),
      att(9, { sel: null }),
    ];
    expect(calculateDpi(attempts)).toEqual({
      score: 0.9,
      status: "neutral",
      category: "insufficient_wrong_data",
    });
  });

  it("0 wrong-flagged -> neutral too (the :290-298 'if not wrong_attempts' branch is DEAD code, not ported)", () => {
    // metrics_service.py:290-298 is unreachable: len([]) <= 2 returns first.
    // A low base rate that would be "red" under the dead branch must be neutral.
    const attempts = [att(0), att(1, { sel: null }), att(2, { sel: null }), att(3, { sel: null })];
    expect(calculateDpi(attempts)).toEqual({
      score: 0.25,
      status: "neutral",
      category: "insufficient_wrong_data",
    });
  });

  it("§8.3.8 golden: 4 wrong (2 persisted, 2 gave-up), 9/10 answered -> engagement 0.65, score 0.75 green", () => {
    // engagement = (2*1.0 + 2*0.3)/4 = 0.65; score = 0.4*0.9 + 0.6*0.65 = 0.75
    const attempts = [
      ...seq(5, () => ({ correct: true })),
      att(5, { pers: true }),
      att(6, { pers: true }),
      att(7, { gave: true }),
      att(8, { gave: true }),
      att(9, { sel: null }),
    ];
    expect(calculateDpi(attempts)).toEqual({
      score: 0.75,
      status: "green",
      persistenceRate: 0.65,
    });
  });

  it("all answered, 4 gave-up only -> engagement 0.3, score 0.58 yellow (score >= 0.45 OR engagement >= 0.40)", () => {
    // score = 0.4*1.0 + 0.6*0.3 = 0.58
    const attempts = [...seq(6, () => ({ correct: true })), ...Array.from({ length: 4 }, (_, i) => att(6 + i, { gave: true }))];
    expect(calculateDpi(attempts)).toEqual({
      score: 0.58,
      status: "yellow",
      persistenceRate: 0.3,
    });
  });

  it("low base rate + gave-up only -> score 0.34, engagement 0.3 -> red", () => {
    // base = 4/10 = 0.4; score = 0.4*0.4 + 0.6*0.3 = 0.34 (< 0.45, engagement < 0.40)
    const attempts = [
      ...seq(6, () => ({ sel: null })),
      ...Array.from({ length: 4 }, (_, i) => att(6 + i, { gave: true })),
    ];
    expect(calculateDpi(attempts)).toEqual({
      score: 0.34,
      status: "red",
      persistenceRate: 0.3,
    });
  });
});

// ── m08 RGD (:319-384) ────────────────────────────────────────────────

describe("calculateRgd — thresholds", () => {
  /** 3 probe attempts at probeT (wrong) + 7 slow wrong fillers @10000ms. */
  const probes = (probeT: number, opts: { diff?: string; median?: number | null } = {}) => [
    ...seq(3, () => ({ correct: false, t: probeT, diff: opts.diff, median: opts.median })),
    ...Array.from({ length: 7 }, (_, i) => att(3 + i, { correct: false, t: 10000, diff: opts.diff })),
  ];

  it("NT15: median 20000 -> threshold max(trunc(3000), 1000) = 3000 (2999 fast, 3000 not)", () => {
    // fast: guess 3/3=1.0, overall 3/10=0.3 -> effective 0.3 yellow
    expect(calculateRgd(probes(2999, { median: 20000 }))).toEqual({ score: 0.3, status: "yellow" });
    expect(calculateRgd(probes(3000, { median: 20000 }))).toEqual({
      score: 0.0,
      status: "green",
      category: "no_fast_answers",
    });
  });

  it("NT15 floor: median 5000 -> max(trunc(750), 1000) = 1000 (999 fast, 1000 not)", () => {
    expect(calculateRgd(probes(999, { median: 5000 }))).toEqual({ score: 0.3, status: "yellow" });
    expect(calculateRgd(probes(1000, { median: 5000 }))).toEqual({
      score: 0.0,
      status: "green",
      category: "no_fast_answers",
    });
  });

  it("static fallbacks: easy 2000 / hard 5000 / unknown difficulty -> default 3000", () => {
    expect(calculateRgd(probes(1999, { diff: "easy" }))).toEqual({ score: 0.3, status: "yellow" });
    expect(calculateRgd(probes(4999, { diff: "hard" }))).toEqual({ score: 0.3, status: "yellow" });
    // "very_hard" is NOT in STATIC_THRESHOLDS -> DEFAULT_THRESHOLD 3000
    expect(calculateRgd(probes(2999, { diff: "very_hard" }))).toEqual({ score: 0.3, status: "yellow" });
  });
});

describe("calculateRgd — rates and statuses", () => {
  it("§8.3.9 golden: 3 fast-wrong of 4 fast, 10 attempted, acc 0.6 -> effective min(0.75, 0.3) = 0.3 yellow", () => {
    const attempts = [
      ...seq(3, () => ({ correct: false, t: 1000 })),
      att(3, { correct: true, t: 1000 }),
      ...Array.from({ length: 6 }, (_, i) => att(4 + i, { correct: i < 5, t: 10000 })),
    ];
    expect(calculateRgd(attempts)).toEqual({ score: 0.3, status: "yellow" });
  });

  it("same fast profile but overall acc 0.7 -> green fast_knowledgeable", () => {
    const attempts = [
      ...seq(3, () => ({ correct: false, t: 1000 })),
      att(3, { correct: true, t: 1000 }),
      ...Array.from({ length: 6 }, (_, i) => att(4 + i, { correct: true, t: 10000 })),
    ];
    expect(calculateRgd(attempts)).toEqual({ score: 0.3, status: "green", category: "fast_knowledgeable" });
  });

  it("5 fast-wrong of 10 -> effective 0.5 red (> 0.35)", () => {
    const attempts = [
      ...seq(5, () => ({ correct: false, t: 1000 })),
      ...Array.from({ length: 5 }, (_, i) => att(5 + i, { correct: true, t: 10000 })),
    ];
    expect(calculateRgd(attempts)).toEqual({ score: 0.5, status: "red" });
  });

  it("effective exactly 0.25 -> yellow (green band is STRICT < 0.25)", () => {
    // 12 attempted: 4 fast (3 wrong, 1 correct), guess 0.75, overall 3/12 = 0.25; acc 6/12 = 0.5
    const attempts = [
      ...seq(3, () => ({ correct: false, t: 1000 })),
      att(3, { correct: true, t: 1000 }),
      ...Array.from({ length: 8 }, (_, i) => att(4 + i, { correct: i < 5, t: 10000 })),
    ];
    expect(calculateRgd(attempts)).toEqual({ score: 0.25, status: "yellow" });
  });

  it("effective 1/12 = 0.0833 -> green (acc below the override)", () => {
    const attempts = [
      att(0, { correct: false, t: 1000 }),
      att(1, { correct: true, t: 1000 }),
      att(2, { correct: true, t: 1000 }),
      ...Array.from({ length: 9 }, (_, i) => att(3 + i, { correct: i < 4, t: 10000 })),
    ];
    expect(calculateRgd(attempts)).toEqual({ score: 0.0833, status: "green" });
  });

  it("0 attempted -> red score 0", () => {
    expect(calculateRgd([att(0, { sel: null }), att(1, { sel: null })])).toEqual({ score: 0, status: "red" });
  });

  it("0 fast answers -> green no_fast_answers", () => {
    expect(calculateRgd(seq(5, () => ({ correct: false, t: 10000 })))).toEqual({
      score: 0.0,
      status: "green",
      category: "no_fast_answers",
    });
  });

  it("< 3 fast answers -> green insufficient_fast_data", () => {
    const attempts = [
      att(0, { correct: false, t: 1000 }),
      att(1, { correct: false, t: 1000 }),
      ...Array.from({ length: 5 }, (_, i) => att(2 + i, { correct: false, t: 10000 })),
    ];
    expect(calculateRgd(attempts)).toEqual({ score: 0.0, status: "green", category: "insufficient_fast_data" });
  });
});
