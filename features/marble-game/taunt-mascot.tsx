"use client";

import { useEffect, useState } from "react";

import styles from "./marble-game.module.css";

/**
 * 특정 캐릭터(하츄핑 등)의 디자인을 그대로 재현하는 대신, 같은 자리에 쓸 수
 * 있는 오리지널 놀림 요정을 작게 그린다. 저작권 있는 캐릭터를 베끼지 않기
 * 위한 대체 디자인이다.
 */
const TAUNT_PHRASES = ["빨리빨리!", "후다닥!", "발동동!", "재깍재깍!", "부랴부랴!"];
const PHRASE_INTERVAL_MS = 2000;

/** 판이 붐빌 때(`active`)만 왼쪽 위에 나타나 조롱의 춤을 추고, 말풍선 재촉 문구를 2초마다 바꾼다. */
export function TauntMascot({ active }: { active: boolean }) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setPhraseIndex((index) => (index + 1) % TAUNT_PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div className={styles.tauntMascot} aria-hidden="true">
      <p key={phraseIndex} className={styles.tauntBubble}>
        {TAUNT_PHRASES[phraseIndex]}
      </p>
      <div className={styles.tauntSprite}>
        <span className={styles.tauntArmLeft} />
        <span className={styles.tauntArmRight} />
        <span className={styles.tauntHornLeft} />
        <span className={styles.tauntHornRight} />
        <span className={styles.tauntBody}>
          <span className={styles.tauntBlushLeft} />
          <span className={styles.tauntBlushRight} />
          <span className={styles.tauntEyeLeft} />
          <span className={styles.tauntEyeRight} />
          <span className={styles.tauntMouth} />
        </span>
      </div>
    </div>
  );
}
