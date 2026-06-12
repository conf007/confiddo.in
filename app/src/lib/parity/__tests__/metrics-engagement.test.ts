/**
 * §8.3 groups 2-7 — AIR, TFA, OCB, HUP, PHE, SCC
 * (metrics_service.py:87-272).
 * Every expected score/status/category below was produced by executing the
 * Python source on identical fixtures (2026-06-12).
 */
import { describe, expect, it } from "vitest";
import {
  calculateAir,
  calculateHup,
  calculateOcb,
  calculatePhe,
  calculateScc,
  calculateTfa,
} from "../metrics";
import { makeSession } from "../types";
import { att, seq } from "./helpers";

// ── m01 AIR (:87-106) ─────────────────────────────────────────────────

describe("calculateAir", () => {
  it("8 answered + 1 gave-up of 10 shown -> 0.9 green (gave-up counts as initiated)", () => {
    const attempts = [
      ...seq(8, () => ({ correct: true })),
      att(8, { sel: null, gave: true }), // gave up — still INITIATED
      att(9, { sel: null }), // viewed only
    ];
    expect(calculateAir(attempts, 10)).toEqual({ score: 0.9, status: "green" });
  });

  it("6/10 -> 0.6 yellow (boundary: score >= 0.60)", () => {
    const attempts = [...seq(6, () => ({})), ...Array.from({ length: 4 }, (_, i) => att(6 + i, { sel: null }))];
    expect(calculateAir(attempts, 10)).toEqual({ score: 0.6, status: "yellow" });
  });

  it("5/10 -> 0.5 red", () => {
    const attempts = [...seq(5, () => ({})), ...Array.from({ length: 5 }, (_, i) => att(5 + i, { sel: null }))];
    expect(calculateAir(attempts, 10)).toEqual({ score: 0.5, status: "red" });
  });

  it("questions_shown = 0 -> score 0 red (division guard)", () => {
    expect(calculateAir([], 0)).toEqual({ score: 0, status: "red" });
  });
});

// ── m02 TFA (:109-141) ────────────────────────────────────────────────

describe("calculateTfa", () => {
  const two = [att(0, { correct: true, t: 2000 }), att(1, { correct: true, t: 3000 })]; // avg 2500

  it("avg 2500ms @ acc 0.75 -> green quick_knowledgeable", () => {
    expect(calculateTfa(two, 0.75)).toEqual({ score: 2500, status: "green", category: "quick_knowledgeable" });
  });

  it("avg 2500ms @ acc 0.5 -> yellow fast_mixed", () => {
    expect(calculateTfa(two, 0.5)).toEqual({ score: 2500, status: "yellow", category: "fast_mixed" });
  });

  it("avg 2500ms @ acc 0.30 -> red rushing", () => {
    expect(calculateTfa(two, 0.3)).toEqual({ score: 2500, status: "red", category: "rushing" });
  });

  it("avg exactly 3000ms -> deliberate even at acc 0 (boundary: < 3000 is the fast band)", () => {
    expect(calculateTfa([att(0, { t: 3000 })], 0.0)).toEqual({ score: 3000, status: "green", category: "deliberate" });
  });

  it("20s @ acc 0.75 -> green careful_accurate", () => {
    expect(calculateTfa([att(0, { t: 20000 })], 0.75)).toEqual({ score: 20000, status: "green", category: "careful_accurate" });
  });

  it("20s @ acc 0.5 -> yellow delayed", () => {
    expect(calculateTfa([att(0, { t: 20000 })], 0.5)).toEqual({ score: 20000, status: "yellow", category: "delayed" });
  });

  it("exactly 60000ms stays in the delayed band (boundary <= 60000)", () => {
    expect(calculateTfa([att(0, { t: 60000 })], 0.5)).toEqual({ score: 60000, status: "yellow", category: "delayed" });
  });

  it("61s -> red timeout regardless of accuracy", () => {
    expect(calculateTfa([att(0, { t: 61000 })], 1.0)).toEqual({ score: 61000, status: "red", category: "timeout" });
  });

  it("no answered questions -> red no_data", () => {
    expect(calculateTfa([att(0, { sel: null, t: 5000 })])).toEqual({ score: 0, status: "red", category: "no_data" });
  });

  it("accuracy omitted -> computed internally (4 answered @2000ms, 3 correct -> 0.75)", () => {
    const attempts = seq(4, (i) => ({ correct: i < 3, t: 2000 }));
    expect(calculateTfa(attempts)).toEqual({ score: 2000, status: "green", category: "quick_knowledgeable" });
  });
});

// ── m03 OCB (:144-174) ────────────────────────────────────────────────

describe("calculateOcb", () => {
  const changes = [0, 1, 1, 0, 0]; // avg 0.4
  const five = seq(5, (i) => ({ correct: true, changes: changes[i] }));

  it("avg 0.4 @ acc 0.3 -> red clicking_through", () => {
    expect(calculateOcb(five, 0.3)).toEqual({ score: 0.4, status: "red", category: "clicking_through" });
  });

  it("avg 0.4 @ acc 0.5 -> yellow stable_mixed", () => {
    expect(calculateOcb(five, 0.5)).toEqual({ score: 0.4, status: "yellow", category: "stable_mixed" });
  });

  it("avg 0.4 @ acc 0.75 -> green decisive_correct", () => {
    expect(calculateOcb(five, 0.75)).toEqual({ score: 0.4, status: "green", category: "decisive_correct" });
  });

  it("avg exactly 0.5 stays in the low-changes band (boundary <= 0.5)", () => {
    const attempts = seq(4, (i) => ({ changes: [1, 1, 0, 0][i] }));
    expect(calculateOcb(attempts, 0.75)).toEqual({ score: 0.5, status: "green", category: "decisive_correct" });
  });

  it("avg 2.0 @ acc 0.55 -> green reflective", () => {
    const attempts = seq(4, () => ({ changes: 2 }));
    expect(calculateOcb(attempts, 0.55)).toEqual({ score: 2.0, status: "green", category: "reflective" });
  });

  it("avg 2.0 @ acc 0.45 -> yellow uncertain", () => {
    const attempts = seq(4, () => ({ changes: 2 }));
    expect(calculateOcb(attempts, 0.45)).toEqual({ score: 2.0, status: "yellow", category: "uncertain" });
  });

  it("avg 2.6 -> red insecure even at acc 0.9", () => {
    const attempts = seq(5, (i) => ({ changes: [2, 3, 3, 2, 3][i] }));
    expect(calculateOcb(attempts, 0.9)).toEqual({ score: 2.6, status: "red", category: "insecure" });
  });

  it("no answered questions -> red no_data", () => {
    expect(calculateOcb([att(0, { sel: null })], 0.5)).toEqual({ score: 0, status: "red", category: "no_data" });
  });
});

// ── m04 HUP (:177-209) ────────────────────────────────────────────────

/** n answered; first nHint use hints; of the hinted ones the first hintedCorrect are correct. */
const hupFix = (nHint: number, hintedCorrect: number, n = 10) =>
  seq(n, (i) => ({ correct: i < nHint && i < hintedCorrect, hints: i < nHint ? 1 : 0 }));

describe("calculateHup", () => {
  it("rate 0.9, hinted-acc 2/9=0.22 -> red dependent_not_learning", () => {
    expect(calculateHup(hupFix(9, 2))).toEqual({ score: 0.9, status: "red", category: "dependent_not_learning" });
  });

  it("rate 0.9, hinted-acc 3/9=0.33 -> yellow dependent_but_learning", () => {
    expect(calculateHup(hupFix(9, 3))).toEqual({ score: 0.9, status: "yellow", category: "dependent_but_learning" });
  });

  it("rate 0.7 -> yellow dependent", () => {
    expect(calculateHup(hupFix(7, 5))).toEqual({ score: 0.7, status: "yellow", category: "dependent" });
  });

  it("rate exactly 0.8 is NOT the heavy band (boundary > 0.80) -> yellow dependent", () => {
    expect(calculateHup(hupFix(8, 5))).toEqual({ score: 0.8, status: "yellow", category: "dependent" });
  });

  it("rate exactly 0.6 is NOT dependent (boundary > 0.60) -> green healthy", () => {
    expect(calculateHup(hupFix(6, 6), 0.9)).toEqual({ score: 0.6, status: "green", category: "healthy" });
  });

  it("rate 0 @ acc 0.3 -> yellow should_seek_help (agrees with PHE)", () => {
    expect(calculateHup(seq(10, () => ({})), 0.3)).toEqual({ score: 0.0, status: "yellow", category: "should_seek_help" });
  });

  it("rate 0.5 @ acc 0.9 -> green healthy", () => {
    expect(calculateHup(hupFix(5, 5), 0.9)).toEqual({ score: 0.5, status: "green", category: "healthy" });
  });

  it("no answered questions -> GREEN no_data (unlike TFA/OCB)", () => {
    expect(calculateHup([], 0.5)).toEqual({ score: 0, status: "green", category: "no_data" });
  });
});

// ── m05 PHE (:212-236) ────────────────────────────────────────────────

describe("calculatePhe", () => {
  it("no hints @ acc 0.40 -> green 1.0 independent (boundary >= 0.40)", () => {
    expect(calculatePhe([att(0, { correct: true })], 0.4)).toEqual({ score: 1.0, status: "green", category: "independent" });
  });

  it("no hints @ acc 0.39 -> yellow 0.5 should_seek_help", () => {
    expect(calculatePhe([att(0)], 0.39)).toEqual({ score: 0.5, status: "yellow", category: "should_seek_help" });
  });

  const hint5 = (answered: number) => seq(5, (i) => ({ sel: i < answered ? "x" : null, hints: 1 }));

  it("hinted, continued 4/5 -> 0.8 green (boundary >= 0.80, no category)", () => {
    expect(calculatePhe(hint5(4), 0.5)).toEqual({ score: 0.8, status: "green" });
  });

  it("hinted, continued 3/5 -> 0.6 yellow", () => {
    expect(calculatePhe(hint5(3), 0.5)).toEqual({ score: 0.6, status: "yellow" });
  });

  it("hinted, continued 2/5 -> 0.4 red", () => {
    expect(calculatePhe(hint5(2), 0.5)).toEqual({ score: 0.4, status: "red" });
  });
});

// ── m06 SCC (:239-272) ────────────────────────────────────────────────

describe("calculateScc", () => {
  const ten = seq(10, () => ({})); // expected_min = 10 * 30000 = 300000ms

  it("completed, 80s of 10Q @ acc 0.4 -> rushing penalty 0.5 -> score 0.5 red", () => {
    // 80000 < 0.30*300000=90000 and acc < 0.5 -> penalty 0.5 -> 1*(1-0)*(1-0.5)=0.5
    const session = makeSession({ status: "completed", totalTimeMs: 80000 });
    expect(calculateScc(session, ten, 0.4)).toEqual({ score: 0.5, status: "red" });
  });

  it("same 80s @ acc 0.5 -> NO rushing penalty (acc >= 0.50) -> 1.0 green", () => {
    const session = makeSession({ status: "completed", totalTimeMs: 80000 });
    expect(calculateScc(session, ten, 0.5)).toEqual({ score: 1.0, status: "green" });
  });

  it("120s @ acc 0.4 -> mid-band penalty 0.25 -> 0.75 yellow", () => {
    // 90000 <= 120000 < 0.50*300000=150000 and acc < 0.5 -> penalty 0.25
    const session = makeSession({ status: "completed", totalTimeMs: 120000 });
    expect(calculateScc(session, ten, 0.4)).toEqual({ score: 0.75, status: "yellow" });
  });

  it("session not completed -> completion_rate 0 -> score 0 red", () => {
    const session = makeSession({ status: "in_progress", totalTimeMs: 400000 });
    expect(calculateScc(session, ten, 0.9)).toEqual({ score: 0.0, status: "red" });
  });

  it("total_time 0 -> rushing check skipped -> 1.0 green even at acc 0.1", () => {
    const session = makeSession({ status: "completed", totalTimeMs: 0 });
    expect(calculateScc(session, ten, 0.1)).toEqual({ score: 1.0, status: "green" });
  });
});
