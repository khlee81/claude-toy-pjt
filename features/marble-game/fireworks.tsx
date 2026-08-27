"use client";

import { useMemo, type CSSProperties } from "react";

import styles from "./marble-game.module.css";

const FIREWORK_COLORS = [
  "#ff5f6d",
  "#ffb36b",
  "#fff07a",
  "#6bffb0",
  "#5ecbff",
  "#9b8bff",
  "#ff7ae0",
];

const PARTICLES_PER_WAVE = 14;
/** 한 번에 다 터뜨리지 않고 두 물결로 나눠, 계속 터지는 느낌을 준다. */
const WAVE_DELAYS_S = [0, 0.4];

type Particle = {
  angleDeg: number;
  distancePx: number;
  delayS: number;
  color: string;
};

/**
 * 렌더 중에는 `Math.random` 같은 비순수 함수를 쓸 수 없어, 시드를 넣으면 같은
 * 값을 내는 결정적 의사난수를 대신 쓴다. seed가 같으면 항상 같은 값이 나오되,
 * seed 자체(클리어 시점의 경과 시간)가 판마다 달라 매번 다르게 보인다.
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * 클리어했을 때 판 가운데서 터지는 불꽃. `seedBase`가 판마다 달라지므로 매번
 * 다른 배치로 터지되, 같은 판 안에서는(안내 토스트 등으로 다시 그려져도)
 * 자리가 흔들리지 않는다.
 */
export function Fireworks({
  active,
  seedBase,
}: {
  active: boolean;
  seedBase: number;
}) {
  const particles = useMemo<Particle[]>(() => {
    if (!active) return [];
    const list: Particle[] = [];
    WAVE_DELAYS_S.forEach((waveDelay, wave) => {
      for (let i = 0; i < PARTICLES_PER_WAVE; i++) {
        const seed = seedBase + wave * 1000 + i;
        list.push({
          angleDeg:
            (360 / PARTICLES_PER_WAVE) * i + (pseudoRandom(seed) * 14 - 7),
          distancePx: 90 + pseudoRandom(seed + 0.5) * 110,
          delayS: waveDelay + pseudoRandom(seed + 0.25) * 0.12,
          color: FIREWORK_COLORS[(i + wave * 3) % FIREWORK_COLORS.length],
        });
      }
    });
    return list;
  }, [active, seedBase]);

  if (particles.length === 0) return null;

  return (
    <div className={styles.fireworks} aria-hidden="true">
      {particles.map((particle, index) => (
        <span
          key={index}
          className={styles.fireworkParticle}
          style={
            {
              "--angle": `${particle.angleDeg}deg`,
              "--distance": `${particle.distancePx}px`,
              "--delay": `${particle.delayS}s`,
              "--spark-color": particle.color,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
