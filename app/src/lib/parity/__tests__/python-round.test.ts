/**
 * pythonRound — parity with Python's built-in round().
 * Every expected value below was produced by CPython 3.14:
 *   round(4.5)=4  round(3.5)=4  round(2.5)=2  round(-2.5)=-2  round(0.5)=0  round(1.5)=2
 *   round(0.00005, 4)=0.0001  round(0.71055, 4)=0.7106  round(0.12345, 4)=0.1235
 * JS Math.round(4.5) === 5 — verified different here on purpose
 * (ARCHITECTURE.md §9.8, teacher_service.py:949).
 */
import { describe, expect, it } from "vitest";
import { pythonRound } from "../metrics";

describe("pythonRound — banker's rounding at integer ties", () => {
  it("rounds true .5 ties to even (Python round())", () => {
    expect(pythonRound(4.5)).toBe(4); // Math.round(4.5) === 5 — must differ
    expect(pythonRound(3.5)).toBe(4);
    expect(pythonRound(2.5)).toBe(2);
    expect(pythonRound(1.5)).toBe(2);
    expect(pythonRound(0.5)).toBe(0);
    expect(pythonRound(-2.5)).toBe(-2);
    expect(pythonRound(-1.5)).toBe(-2);
    // Python round(-0.5) returns int 0 (ints have no signed zero);
    // vitest toBe uses Object.is, which distinguishes +0/-0.
    expect(pythonRound(-0.5)).toBe(0);
  });

  it("plain non-tie rounding", () => {
    expect(pythonRound(3.3333333333333335)).toBe(3); // mean([3,4,3])
    expect(pythonRound(3.6666666666666665)).toBe(4); // mean([4,4,3]) — Python round() = 4
    expect(pythonRound(2.4)).toBe(2);
    expect(pythonRound(2.6)).toBe(3);
  });

  it("documents the divergence from JS Math.round", () => {
    expect(Math.round(4.5)).toBe(5);
    expect(pythonRound(4.5)).toBe(4);
  });
});

describe("pythonRound — ndigits=4 (the metric round(x, 4) calls)", () => {
  it("matches CPython on floating-point .5 products that are NOT true ties", () => {
    // 0.12345 * 1e4 === 1234.5 exactly in floating point, but the double
    // 0.12345 is slightly ABOVE the tie -> Python round(0.12345, 4) = 0.1235.
    expect(pythonRound(0.12345, 4)).toBe(0.1235);
    // 0.00005 * 1e4 === 0.5 exactly, but the double is above the tie:
    // Python round(0.00005, 4) = 0.0001 (a naive banker's-on-product gives 0).
    expect(pythonRound(0.00005, 4)).toBe(0.0001);
    // 0.71055 * 1e4 === 7105.5 exactly; double above the tie -> 0.7106.
    expect(pythonRound(0.71055, 4)).toBe(0.7106);
  });

  it("matches CPython on representation-below-tie values", () => {
    // 2.675 is stored as 2.67499999... -> Python round(2.675, 2) = 2.67
    expect(pythonRound(2.675, 2)).toBe(2.67);
    // 0.285 stored below the tie -> Python round(0.285, 2) = 0.28
    expect(pythonRound(0.285, 2)).toBe(0.28);
  });

  it("ordinary 4-dp rounding used by the metrics", () => {
    expect(pythonRound(13.5 / 19, 4)).toBe(0.7105); // weighted-accuracy golden
    expect(pythonRound(1 / 3, 4)).toBe(0.3333);
    expect(pythonRound(2 / 3, 4)).toBe(0.6667);
    expect(pythonRound(1 - 1 / 31, 4)).toBe(0.9677); // GEP golden from §8.3.18 fixture
  });
});
