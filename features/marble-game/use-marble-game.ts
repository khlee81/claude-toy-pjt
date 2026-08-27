"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  COUNTDOWN_STEPS,
  COUNTDOWN_STEP_MS,
  HARD_ROTATE_TRIGGER_STAGE_INDEX,
  HINT_AFTER_MARBLE_COUNT,
  MASCOT_TRIGGER_MARBLE_COUNT,
  ROTATION_DEGREES,
  STAGE_COUNT,
  STAGE_INTERVAL_MS,
  TIME_LIMIT_MS,
  TOTAL_MARBLE_COUNT,
  WARN_AFTER_MS,
  calculateScore,
  createLuckyMarble,
  createStageMarbles,
  pickLuckyStageIndex,
  pickRotateClickThreshold,
  pickRotationDirection,
  type GameEnding,
  type GameMode,
  type LuckyMarble,
  type Marble,
  type RotationDirection,
} from "./game-rules";

export type GamePhase = "idle" | "countdown" | "playing" | "result";

type State = {
  phase: GamePhase;
  countdownStep: number;
  marbles: Marble[];
  /** 아직 화면에 남아 있는 행운 구슬. 누르면 사라진다. */
  lucky: LuckyMarble | null;
  /** 행운 구슬을 내보낼 단계. 한 판에 한 번만 쓰이도록 판마다 새로 뽑는다. */
  luckyStageIndex: number;
  luckyTaken: boolean;
  stageIndex: number;
  nextNumber: number;
  lastClickedNumber: number;
  elapsedMs: number;
  ending: GameEnding | null;
  mode: GameMode;
  /**
   * 어려움 모드에서만 쓰인다. null이면 아직 2단계가 시작되지 않아 클릭 수를 세지
   * 않는다. 2단계가 시작되면 값이 생기고, 회전이 일어날 때마다 다음 회전까지
   * 필요한 수로 다시 뽑혀 계속 이어진다.
   */
  hardRotateThreshold: number | null;
  /** 마지막 회전(또는 2단계 시작) 이후로 맞게 클릭한 수. */
  hardClicksSinceRotation: number;
  /** 지금까지 누적된 회전 각도(도). 회전이 일어날 때마다 ±90씩 더해진다. */
  rotationDeg: number;
  /** 가장 최근 회전의 방향. 알림 문구에만 쓰고, 누적 각도 계산에는 쓰지 않는다. */
  lastRotationDirection: RotationDirection | null;
  /** 회전이 일어난 횟수. 매번 알림을 한 번씩 띄우기 위한 신호로만 쓴다. */
  rotationEventCount: number;
  /** 화면의 구슬이 한 번이라도 MASCOT_TRIGGER_MARBLE_COUNT에 닿았는지. 한 번 켜지면 그 판이 끝날 때까지 꺼지지 않는다. */
  mascotTriggered: boolean;
};

type Action =
  | { type: "start"; mode: GameMode }
  | { type: "countdown-next" }
  | { type: "begin-play" }
  | { type: "tick"; elapsedMs: number }
  | { type: "spawn-stage" }
  | { type: "click-marble"; number: number; elapsedMs: number }
  | { type: "click-lucky"; elapsedMs: number }
  | { type: "click-empty"; elapsedMs: number }
  | { type: "stop"; elapsedMs: number }
  | { type: "show-help" };

const initialState: State = {
  phase: "idle",
  countdownStep: 0,
  marbles: [],
  lucky: null,
  luckyStageIndex: 0,
  luckyTaken: false,
  stageIndex: 0,
  nextNumber: 1,
  lastClickedNumber: 0,
  elapsedMs: 0,
  ending: null,
  mode: "easy",
  hardRotateThreshold: null,
  hardClicksSinceRotation: 0,
  rotationDeg: 0,
  lastRotationDirection: null,
  rotationEventCount: 0,
  mascotTriggered: false,
};

function endGame(state: State, ending: GameEnding, elapsedMs: number): State {
  return { ...state, phase: "result", ending, elapsedMs };
}

function occupiedTilesOf(state: State): number[] {
  const tiles = state.marbles.map((marble) => marble.tileIndex);
  return state.lucky ? [...tiles, state.lucky.tileIndex] : tiles;
}

function addNextStage(state: State): State {
  if (state.stageIndex >= STAGE_COUNT) return state;

  const added = createStageMarbles(occupiedTilesOf(state), state.stageIndex);
  const marbles = [...state.marbles, ...added];

  // 정해진 단계가 오면 이 판의 행운 구슬을 한 번만 내보낸다.
  const bringLucky =
    state.stageIndex === state.luckyStageIndex &&
    state.lucky === null &&
    !state.luckyTaken;
  const lucky = bringLucky
    ? createLuckyMarble(marbles.map((marble) => marble.tileIndex))
    : state.lucky;

  // 구슬이 이번에 처음 문턱을 넘었으면 놀림 캐릭터를 켠다. 이미 켜져 있으면
  // 그대로 두고, 나중에 구슬 수가 줄어도 다시 끄지 않는다.
  const visibleCount = marbles.length + (lucky ? 1 : 0);
  const mascotTriggered =
    state.mascotTriggered || visibleCount >= MASCOT_TRIGGER_MARBLE_COUNT;

  // 어려움 모드에서 2단계 구슬이 나오는 순간, 클릭 수 세기를 시작한다. 이후로는
  // 회전이 일어날 때마다(click-marble에서) 다음 회전까지 필요한 수를 새로 뽑는다.
  const armRotation =
    state.mode === "hard" &&
    state.stageIndex === HARD_ROTATE_TRIGGER_STAGE_INDEX &&
    state.hardRotateThreshold === null;

  return {
    ...state,
    marbles,
    lucky,
    stageIndex: state.stageIndex + 1,
    mascotTriggered,
    hardRotateThreshold: armRotation
      ? pickRotateClickThreshold()
      : state.hardRotateThreshold,
    hardClicksSinceRotation: armRotation ? 0 : state.hardClicksSinceRotation,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return {
        ...initialState,
        phase: "countdown",
        mode: action.mode,
        luckyStageIndex: pickLuckyStageIndex(),
      };

    case "countdown-next":
      return { ...state, countdownStep: state.countdownStep + 1 };

    case "begin-play":
      return addNextStage({
        ...initialState,
        phase: "playing",
        mode: state.mode,
        luckyStageIndex: state.luckyStageIndex,
      });

    case "tick": {
      if (state.phase !== "playing") return state;
      if (action.elapsedMs >= TIME_LIMIT_MS) {
        return endGame(state, "timeout", TIME_LIMIT_MS);
      }
      return { ...state, elapsedMs: action.elapsedMs };
    }

    case "spawn-stage":
      if (state.phase !== "playing") return state;
      return addNextStage(state);

    case "click-marble": {
      if (state.phase !== "playing") return state;
      if (action.number !== state.nextNumber) {
        return endGame(state, "miss", action.elapsedMs);
      }

      const remaining = state.marbles.filter(
        (marble) => marble.number !== action.number
      );

      // 2단계가 시작된 뒤로 맞게 누른 수를 세고, 정해진 수(2 또는 3)에 닿을 때마다
      // 회전을 한 번 더 적용한 뒤 다음 회전까지 필요한 수를 새로 뽑는다. 게임이
      // 끝날 때까지 계속 반복된다.
      const shouldCount = state.hardRotateThreshold !== null;
      const clicksSoFar = shouldCount
        ? state.hardClicksSinceRotation + 1
        : state.hardClicksSinceRotation;
      const rotatesNow = shouldCount && clicksSoFar >= state.hardRotateThreshold!;
      const rotationDirection = rotatesNow ? pickRotationDirection() : null;

      const advanced: State = {
        ...state,
        marbles: remaining,
        lastClickedNumber: action.number,
        nextNumber: state.nextNumber + 1,
        elapsedMs: action.elapsedMs,
        hardClicksSinceRotation: rotatesNow ? 0 : clicksSoFar,
        hardRotateThreshold: rotatesNow
          ? pickRotateClickThreshold()
          : state.hardRotateThreshold,
        rotationDeg: rotationDirection
          ? state.rotationDeg + ROTATION_DEGREES[rotationDirection]
          : state.rotationDeg,
        lastRotationDirection: rotationDirection ?? state.lastRotationDirection,
        rotationEventCount: rotatesNow
          ? state.rotationEventCount + 1
          : state.rotationEventCount,
      };

      if (advanced.nextNumber > TOTAL_MARBLE_COUNT) {
        return endGame(advanced, "clear", action.elapsedMs);
      }
      // 화면을 다 비웠으면 다음 단계를 기다리지 않고 바로 채운다.
      return remaining.length === 0 ? addNextStage(advanced) : advanced;
    }

    // 행운 구슬은 순서 판정에 끼어들지 않는다. 다음 순번도, 회전 클릭 수도 그대로 둔다.
    case "click-lucky":
      if (state.phase !== "playing" || state.lucky === null) return state;
      return {
        ...state,
        lucky: null,
        luckyTaken: true,
        elapsedMs: action.elapsedMs,
      };

    case "click-empty":
      if (state.phase !== "playing") return state;
      return endGame(state, "miss", action.elapsedMs);

    case "stop":
      if (state.phase === "countdown") return initialState;
      if (state.phase !== "playing") return state;
      return endGame(state, "stopped", action.elapsedMs);

    case "show-help":
      return initialState;

    default:
      return state;
  }
}

export function useMarbleGame() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const startedAtRef = useRef(0);

  const readElapsed = useCallback(
    () =>
      startedAtRef.current === 0
        ? 0
        : Math.min(TIME_LIMIT_MS, performance.now() - startedAtRef.current),
    []
  );

  // 카운트다운: 3 → 2 → 1 → 시작 순서로 넘기고, 끝나면 판을 연다.
  useEffect(() => {
    if (state.phase !== "countdown") return;

    const isLastStep = state.countdownStep >= COUNTDOWN_STEPS.length - 1;
    const timer = window.setTimeout(() => {
      if (isLastStep) {
        startedAtRef.current = performance.now();
        dispatch({ type: "begin-play" });
      } else {
        dispatch({ type: "countdown-next" });
      }
    }, COUNTDOWN_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [state.phase, state.countdownStep]);

  // 경과 시간. 제한 시간을 넘기는 순간의 강제 종료도 여기서 판정한다.
  useEffect(() => {
    if (state.phase !== "playing") return;

    const timer = window.setInterval(() => {
      dispatch({ type: "tick", elapsedMs: readElapsed() });
    }, 50);

    return () => window.clearInterval(timer);
  }, [state.phase, readElapsed]);

  // 구슬을 다 누르지 못해도 2초가 지나면 다음 단계를 얹는다.
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (state.stageIndex >= STAGE_COUNT) return;

    const timer = window.setTimeout(() => {
      dispatch({ type: "spawn-stage" });
    }, STAGE_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [state.phase, state.stageIndex]);

  const start = useCallback((mode: GameMode = "easy") => {
    startedAtRef.current = 0;
    dispatch({ type: "start", mode });
  }, []);

  const stop = useCallback(() => {
    dispatch({ type: "stop", elapsedMs: readElapsed() });
  }, [readElapsed]);

  const showHelp = useCallback(() => {
    startedAtRef.current = 0;
    dispatch({ type: "show-help" });
  }, []);

  const clickMarble = useCallback(
    (number: number) => {
      dispatch({ type: "click-marble", number, elapsedMs: readElapsed() });
    },
    [readElapsed]
  );

  const clickLucky = useCallback(() => {
    dispatch({ type: "click-lucky", elapsedMs: readElapsed() });
  }, [readElapsed]);

  const clickEmpty = useCallback(() => {
    dispatch({ type: "click-empty", elapsedMs: readElapsed() });
  }, [readElapsed]);

  const cleared = state.ending === "clear";
  const visibleMarbleCount = state.marbles.length + (state.lucky ? 1 : 0);
  const scoreBreakdown = calculateScore({
    lastClickedNumber: state.lastClickedNumber,
    cleared,
    elapsedMs: state.elapsedMs,
    luckyTaken: state.luckyTaken,
    mode: state.mode,
  });

  return {
    phase: state.phase,
    mode: state.mode,
    countdownLabel: COUNTDOWN_STEPS[state.countdownStep],
    marbles: state.marbles,
    lucky: state.lucky,
    luckyTaken: state.luckyTaken,
    /** 판의 시각적 회전 각도(도, 누적값). 0이면 돌지 않은 것이다. */
    rotationDeg: state.rotationDeg,
    /** 90도 홀수 배(90, 270, -90...)일 때만 참이다. 이때 가로·세로가 서로 맞바뀐다. */
    rotationAxisSwapped: Math.abs(state.rotationDeg / 90) % 2 === 1,
    lastRotationDirection: state.lastRotationDirection,
    rotationEventCount: state.rotationEventCount,
    /** 게임을 진행하는 동안, 구슬이 한 번이라도 문턱을 넘었으면 놀림 캐릭터를 보여 준다. */
    mascotVisible: state.phase === "playing" && state.mascotTriggered,
    nextNumber: state.nextNumber,
    lastClickedNumber: state.lastClickedNumber,
    elapsedMs: state.elapsedMs,
    ending: state.ending,
    cleared,
    /** 판이 붐빌 때만 다음에 눌러야 할 구슬 번호를 알려 준다. */
    hintedNumber:
      state.phase === "playing" && visibleMarbleCount > HINT_AFTER_MARBLE_COUNT
        ? state.nextNumber
        : null,
    warning: state.phase === "playing" && state.elapsedMs > WARN_AFTER_MS,
    score: scoreBreakdown.total,
    scoreBase: scoreBreakdown.base,
    scoreTimeBonus: scoreBreakdown.timeBonus,
    scoreLuckyBonus: scoreBreakdown.luckyBonus,
    /** 배수를 적용하기 전의 순수 남은 초. 점수 문구에 "N × 3"처럼 풀어 보여줄 때 쓴다. */
    remainingBonusSeconds: Math.max(
      0,
      Math.floor((TIME_LIMIT_MS - state.elapsedMs) / 1000)
    ),
    start,
    stop,
    showHelp,
    clickMarble,
    clickLucky,
    clickEmpty,
  };
}
