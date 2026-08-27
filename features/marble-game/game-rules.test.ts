import { describe, expect, test } from "vitest";

import {
  BOARD_TILE_COUNT,
  LUCKY_BONUS,
  LUCKY_STAGE_INDEXES,
  STAGE_MARBLE_COUNTS,
  TIME_LIMIT_MS,
  TOTAL_MARBLE_COUNT,
  calculateScore,
  createLuckyMarble,
  createStageMarbles,
  pickLuckyStageIndex,
} from "./game-rules";

describe("점수 계산", () => {
  test("클리어하지 못하면 마지막으로 맞게 누른 구슬의 숫자가 점수다", () => {
    expect(
      calculateScore({ lastClickedNumber: 9, cleared: false, elapsedMs: 9_600 })
    ).toBe(9);
  });

  test("한 개도 누르지 못했으면 0점이다", () => {
    expect(
      calculateScore({
        lastClickedNumber: 0,
        cleared: false,
        elapsedMs: TIME_LIMIT_MS,
      })
    ).toBe(0);
  });

  test("클리어하면 20초에서 경과 시간을 뺀 초만큼 더한다", () => {
    expect(
      calculateScore({
        lastClickedNumber: TOTAL_MARBLE_COUNT,
        cleared: true,
        elapsedMs: 12_300,
      })
    ).toBe(TOTAL_MARBLE_COUNT + 7);
  });

  test("제한 시간을 다 쓰고 클리어하면 보너스가 0이다", () => {
    expect(
      calculateScore({
        lastClickedNumber: TOTAL_MARBLE_COUNT,
        cleared: true,
        elapsedMs: TIME_LIMIT_MS,
      })
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
      })
    ).toBe(9 + LUCKY_BONUS);
  });

  test("행운 구슬을 누르지 않았으면 보너스가 없다", () => {
    expect(
      calculateScore({
        lastClickedNumber: 9,
        cleared: false,
        elapsedMs: 9_600,
        luckyTaken: false,
      })
    ).toBe(9);
  });

  test("클리어 보너스와 행운 보너스는 함께 붙는다", () => {
    expect(
      calculateScore({
        lastClickedNumber: TOTAL_MARBLE_COUNT,
        cleared: true,
        elapsedMs: 12_300,
        luckyTaken: true,
      })
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
