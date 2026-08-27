/** 화면에 놓인 구슬 하나. `tileIndex`는 육각 타일의 0-based 위치다. */
export type Marble = {
  number: number;
  tileIndex: number;
};

export const BOARD_ROWS = 5;
export const BOARD_COLS = 5;
export const BOARD_TILE_COUNT = BOARD_ROWS * BOARD_COLS;

/** 단계마다 새로 나오는 구슬 수. 앞 단계에서 못 누른 구슬은 그대로 남는다. */
export const STAGE_MARBLE_COUNTS = [3, 4, 5, 5, 5];
export const STAGE_COUNT = STAGE_MARBLE_COUNTS.length;
export const TOTAL_MARBLE_COUNT = STAGE_MARBLE_COUNTS.reduce(
  (sum, count) => sum + count,
  0
);

/** 화면의 구슬이 이 수를 넘으면 다음에 눌러야 할 구슬을 표시해 준다. */
export const HINT_AFTER_MARBLE_COUNT = 5;

/** 숫자가 없는 행운 구슬. 순서와 무관하게 누를 수 있다. */
export type LuckyMarble = {
  tileIndex: number;
};

export const LUCKY_BONUS = 10;

/** 행운 구슬이 나올 수 있는 단계(3·4·5단계). 한 판에 이 중 한 단계에서만 나온다. */
export const LUCKY_STAGE_INDEXES = [2, 3, 4];

export function pickLuckyStageIndex(
  random: () => number = Math.random
): number {
  const position = Math.min(
    LUCKY_STAGE_INDEXES.length - 1,
    Math.floor(random() * LUCKY_STAGE_INDEXES.length)
  );
  return LUCKY_STAGE_INDEXES[position];
}

export function createLuckyMarble(
  occupiedTiles: number[],
  random: () => number = Math.random
): LuckyMarble | null {
  const [tileIndex] = pickFreeTiles(occupiedTiles, 1, random);
  return tileIndex === undefined ? null : { tileIndex };
}

/** 비어 있는 타일 중 `count`개를 겹치지 않게 고른다. 남은 자리가 모자라면 그만큼만 준다. */
function pickFreeTiles(
  occupiedTiles: number[],
  count: number,
  random: () => number
): number[] {
  const occupied = new Set(occupiedTiles);
  const freeTiles = Array.from(
    { length: BOARD_TILE_COUNT },
    (_, index) => index
  ).filter((index) => !occupied.has(index));

  const picked: number[] = [];
  while (picked.length < count && freeTiles.length > 0) {
    const position = Math.min(
      freeTiles.length - 1,
      Math.floor(random() * freeTiles.length)
    );
    picked.push(freeTiles.splice(position, 1)[0]);
  }

  return picked;
}

export const TIME_LIMIT_MS = 20_000;
export const WARN_AFTER_MS = 15_000;
export const STAGE_INTERVAL_MS = 2_000;

export const COUNTDOWN_STEPS = ["3", "2", "1", "시작"];
export const COUNTDOWN_STEP_MS = 700;

/** 게임이 끝난 이유. 점수 보너스는 `clear`일 때만 붙는다. */
export type GameEnding = "clear" | "miss" | "timeout" | "stopped";

export function calculateScore({
  lastClickedNumber,
  cleared,
  elapsedMs,
  luckyTaken = false,
}: {
  lastClickedNumber: number;
  cleared: boolean;
  elapsedMs: number;
  luckyTaken?: boolean;
}): number {
  const luckyBonus = luckyTaken ? LUCKY_BONUS : 0;
  if (!cleared) return lastClickedNumber + luckyBonus;

  const remainingSeconds = Math.max(
    0,
    Math.floor((TIME_LIMIT_MS - elapsedMs) / 1000)
  );
  return lastClickedNumber + remainingSeconds + luckyBonus;
}

/**
 * `stageIndex` 단계의 구슬을 만든다. 숫자는 앞 단계까지의 누적 개수에서 이어지고,
 * 이미 무언가 놓인 타일은 피한다.
 */
export function createStageMarbles(
  occupiedTiles: number[],
  stageIndex: number,
  random: () => number = Math.random
): Marble[] {
  const count = STAGE_MARBLE_COUNTS[stageIndex] ?? 0;
  if (count === 0) return [];

  const startNumber =
    STAGE_MARBLE_COUNTS.slice(0, stageIndex).reduce(
      (sum, stageCount) => sum + stageCount,
      0
    ) + 1;

  return pickFreeTiles(occupiedTiles, count, random).map(
    (tileIndex, offset) => ({ number: startNumber + offset, tileIndex })
  );
}
