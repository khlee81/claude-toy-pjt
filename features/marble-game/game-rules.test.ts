import { describe, expect, test } from "vitest";

import {
  BOARD_TILE_COUNT,
  HARD_ROTATE_CLICK_THRESHOLDS,
  HARD_SCORE_MULTIPLIER,
  LUCKY_BONUS,
  LUCKY_STAGE_INDEXES,
  ROTATION_DEGREES,
  STAGE_MARBLE_COUNTS,
  TIME_LIMIT_MS,
  TOTAL_MARBLE_COUNT,
  calculateScore,
  createLuckyMarble,
  createStageMarbles,
  pickLuckyStageIndex,
  pickRotateClickThreshold,
  pickRotationDirection,
} from "./game-rules";

describe("점수 계산", () => {
  test("클리어하지 못하면 마지막으로 맞게 누른 구슬의 숫자가 점수다", () => {
    expect(
      calculateScore({ lastClickedNumber: 9, cleared: false, elapsedMs: 9_600 })
        .total
    ).toBe(9);
  });

  test("한 개도 누르지 못했으면 0점이다", () => {
    expect(
      calculateScore({
        lastClickedNumber: 0,
        cleared: false,
        elapsedMs: TIME_LIMIT_MS,
      }).total
    ).toBe(0);
  });

  test("클리어하면 20초에서 경과 시간을 뺀 초만큼 더한다", () => {
    expect(
      calculateScore({
        lastClickedNumber: TOTAL_MARBLE_COUNT,
        cleared: true,
        elapsedMs: 12_300,
      }).total
    ).toBe(TOTAL_MARBLE_COUNT + 7);
  });

  test("제한 시간을 다 쓰고 클리어하면 보너스가 0이다", () => {
    expect(
      calculateScore({
        lastClickedNumber: TOTAL_MARBLE_COUNT,
        cleared: true,
        elapsedMs: TIME_LIMIT_MS,
      }).total
    ).toBe(TOTAL_MARBLE_COUNT);
  });
});

describe("단계 구성", () => {
  test("다섯 단계에서 나오는 구슬은 모두 22개다", () => {
    expect(STAGE_MARBLE_COUNTS).toHaveLength(5);
    expect(TOTAL_MARBLE_COUNT).toBe(22);
  });

  test("구슬을 모두 놓아도 타일 수를 넘지 않는다", () => {
    expect(TOTAL_MARBLE_COUNT).toBeLessThanOrEqual(BOARD_TILE_COUNT);
  });
});

describe("단계별 구슬 생성", () => {
  test("이미 구슬이 놓인 타일은 피한다", () => {
    const added = createStageMarbles([0, 1, 2], 1, () => 0);

    expect(added).toHaveLength(STAGE_MARBLE_COUNTS[1]);
    const usedTiles = added.map((marble) => marble.tileIndex);
    expect(new Set(usedTiles).size).toBe(usedTiles.length);
    expect(usedTiles).not.toContain(0);
    expect(usedTiles).not.toContain(1);
    expect(usedTiles).not.toContain(2);
  });

  test("이미 누른 구슬이 있어도 숫자는 앞 단계에 이어서 붙는다", () => {
    const added = createStageMarbles([4, 7], 2, () => 0.5);

    expect(added.map((marble) => marble.number)).toEqual([8, 9, 10, 11, 12]);
  });

  test("첫 단계는 1번부터 시작한다", () => {
    const added = createStageMarbles([], 0, () => 0.5);

    expect(added.map((marble) => marble.number)).toEqual([1, 2, 3]);
  });
});

describe("행운 구슬", () => {
  test("점수 계산에서 행운 보너스는 클리어하지 못해도 붙는다", () => {
    expect(
      calculateScore({
        lastClickedNumber: 9,
        cleared: false,
        elapsedMs: 9_600,
        luckyTaken: true,
      }).total
    ).toBe(9 + LUCKY_BONUS);
  });

  test("행운 구슬을 누르지 않았으면 보너스가 없다", () => {
    expect(
      calculateScore({
        lastClickedNumber: 9,
        cleared: false,
        elapsedMs: 9_600,
        luckyTaken: false,
      }).total
    ).toBe(9);
  });

  test("클리어 보너스와 행운 보너스는 함께 붙는다", () => {
    expect(
      calculateScore({
        lastClickedNumber: TOTAL_MARBLE_COUNT,
        cleared: true,
        elapsedMs: 12_300,
        luckyTaken: true,
      }).total
    ).toBe(TOTAL_MARBLE_COUNT + 7 + LUCKY_BONUS);
  });

  test("나올 수 있는 단계는 3·4·5단계뿐이다", () => {
    expect(LUCKY_STAGE_INDEXES).toEqual([2, 3, 4]);
  });

  test("무작위 값이 어떻든 3·4·5단계 중 하나를 고른다", () => {
    const picks = [0, 0.34, 0.5, 0.67, 0.999].map((value) =>
      pickLuckyStageIndex(() => value)
    );

    expect(new Set(picks).size).toBeGreaterThan(1);
    for (const pick of picks) {
      expect(LUCKY_STAGE_INDEXES).toContain(pick);
    }
  });

  test("이미 구슬이 놓인 타일은 피해서 자리를 잡는다", () => {
    const occupied = [0, 1, 2, 3];

    const lucky = createLuckyMarble(occupied, () => 0);

    expect(lucky).not.toBeNull();
    expect(occupied).not.toContain(lucky!.tileIndex);
  });

  test("빈 타일이 없으면 자리를 잡지 못한다", () => {
    const occupied = Array.from({ length: BOARD_TILE_COUNT }, (_, i) => i);

    expect(createLuckyMarble(occupied, () => 0)).toBeNull();
  });
});

describe("어려움 모드 점수", () => {
  test("기본 점수, 시간 보너스, 행운 보너스가 모두 3배가 된다", () => {
    const breakdown = calculateScore({
      lastClickedNumber: TOTAL_MARBLE_COUNT,
      cleared: true,
      elapsedMs: 12_300,
      luckyTaken: true,
      mode: "hard",
    });

    expect(breakdown.base).toBe(TOTAL_MARBLE_COUNT * HARD_SCORE_MULTIPLIER);
    expect(breakdown.timeBonus).toBe(7 * HARD_SCORE_MULTIPLIER);
    expect(breakdown.luckyBonus).toBe(LUCKY_BONUS * HARD_SCORE_MULTIPLIER);
    expect(breakdown.total).toBe(
      (TOTAL_MARBLE_COUNT + 7 + LUCKY_BONUS) * HARD_SCORE_MULTIPLIER
    );
  });

  test("클리어하지 못해도 기본 점수는 3배가 된다", () => {
    const breakdown = calculateScore({
      lastClickedNumber: 9,
      cleared: false,
      elapsedMs: 9_600,
      mode: "hard",
    });

    expect(breakdown.base).toBe(9 * HARD_SCORE_MULTIPLIER);
    expect(breakdown.timeBonus).toBe(0);
    expect(breakdown.total).toBe(9 * HARD_SCORE_MULTIPLIER);
  });

  test("쉬움 모드는 배수가 걸리지 않는다", () => {
    const breakdown = calculateScore({
      lastClickedNumber: 9,
      cleared: false,
      elapsedMs: 9_600,
      mode: "easy",
    });

    expect(breakdown.base).toBe(9);
  });
});

describe("어려움 모드 회전", () => {
  test("회전까지 필요한 클릭 수는 2 또는 3이다", () => {
    expect(HARD_ROTATE_CLICK_THRESHOLDS).toEqual([2, 3]);
  });

  test("무작위 값이 어떻든 2 또는 3을 고른다", () => {
    const picks = [0, 0.3, 0.5, 0.7, 0.999].map((value) =>
      pickRotateClickThreshold(() => value)
    );

    expect(new Set(picks).size).toBeGreaterThan(1);
    for (const pick of picks) {
      expect(HARD_ROTATE_CLICK_THRESHOLDS).toContain(pick);
    }
  });

  test("무작위 값의 절반은 왼쪽, 절반은 오른쪽이다", () => {
    expect(pickRotationDirection(() => 0)).toBe("left");
    expect(pickRotationDirection(() => 0.999)).toBe("right");
  });

  test("왼쪽은 -90도, 오른쪽은 90도다", () => {
    expect(ROTATION_DEGREES.left).toBe(-90);
    expect(ROTATION_DEGREES.right).toBe(90);
  });
});
