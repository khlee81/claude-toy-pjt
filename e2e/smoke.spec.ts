import path from "node:path";

import { expect, test } from "@playwright/test";

test("게임 화면이 열리고 설명이 먼저 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("오늘도 구슬에 털림💀");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "오늘도 구슬에 털림💀",
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "이렇게 하시면 됩니다" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "결과 캡쳐" })).toBeDisabled();
});

test("시작하면 구슬이 나오고 순서대로 누르면 사라진다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1", exact: true });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });

  await firstMarble.click();
  await expect(firstMarble).toBeHidden();
  await expect(
    page.getByRole("button", { name: "구슬 2", exact: true }),
  ).toBeVisible();
});

test("순서를 틀리면 그 자리에서 끝나고 점수가 나온다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "구슬 3", exact: true }).click();

  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다."),
  ).toBeVisible();
  await expect(page.getByText("0점")).toBeVisible();
  await expect(page.getByRole("button", { name: "결과 캡쳐" })).toBeEnabled();
});

test("구슬이 5개를 넘으면 다음에 누를 구슬만 강조된다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  // 1단계 구슬은 3개뿐이라 아직 아무 구슬도 강조되지 않는다.
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("[data-next]")).toHaveCount(0);

  // 2초가 지나 4~7번이 얹히면 화면 구슬은 7개가 되고, 1번만 강조된다.
  await expect(
    page.getByRole("button", { name: "구슬 7", exact: true }),
  ).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.locator("[data-next]")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toHaveAttribute("data-next", "");

  // 하나 누르면 강조도 다음 번호로 옮겨간다.
  await page.getByRole("button", { name: "구슬 1", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "구슬 2", exact: true }),
  ).toHaveAttribute("data-next", "");
});

test("구슬 그림 바깥을 눌러도 그 구슬을 누른 것으로 친다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1", exact: true });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });

  // 구슬 그림의 위쪽 가장자리 바로 바깥, 타일 안쪽을 노린다.
  const circle = (await firstMarble.locator("span").boundingBox())!;
  await page.mouse.click(circle.x + circle.width / 2, circle.y - 6);

  await expect(firstMarble).toBeHidden();
  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다."),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "구슬 2", exact: true }),
  ).toBeVisible();
});

test("행운 구슬은 한 판에 딱 한 번 나오고, 순서와 상관없이 눌러 10점을 얻는다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const lucky = page.locator("[data-lucky]");
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });

  // 1·2단계에는 나오지 않는다.
  await expect(lucky).toHaveCount(0);

  // 3~5단계 어딘가에서 딱 하나 나타난다. 5단계에 걸리면 8초 뒤이므로 넉넉히 기다린다.
  await expect(lucky).toHaveCount(1, { timeout: 12_000 });

  // 아직 1번도 누르지 않았는데도 눌린다. 다음 순번은 그대로 1번이다.
  await lucky.click();
  await expect(lucky).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible();

  // 남은 단계가 다 나와도 두 번째 행운 구슬은 없다.
  await expect(
    page.getByRole("button", { name: "구슬 22", exact: true }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(lucky).toHaveCount(0);

  await page.getByRole("button", { name: "게임 종료" }).click();
  await expect(page.getByText("10점")).toBeVisible();
  await expect(page.getByText(/행운 10/)).toBeVisible();
});

test("행운 구슬을 누르지 않고 끝내면 보너스가 붙지 않는다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("[data-lucky]")).toHaveCount(1, {
    timeout: 12_000,
  });

  await page.getByRole("button", { name: "게임 종료" }).click();
  await expect(page.getByText("0점")).toBeVisible();
  await expect(page.getByText(/행운/)).toBeHidden();
});

test("구슬이 없는 자리를 누르면 그 자리에서 끝난다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1", exact: true });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });
  await firstMarble.click();

  await page.getByTestId("game-board").click({ position: { x: 8, y: 8 } });

  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다."),
  ).toBeVisible();
  await expect(page.getByText("1점")).toBeVisible();
});

test("22번까지 모두 누르면 클리어되고 남은 시간이 더해진다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });

  for (let number = 1; number <= 22; number++) {
    await page
      .getByRole("button", { name: `구슬 ${number}`, exact: true })
      .click();
  }

  await expect(page.getByText("클리어!")).toBeVisible();
  await expect(page.getByText(/구슬 22 \+ 남은 시간 \d+/)).toBeVisible();
});

test("클리어하면 가운데 불꽃이 터지고, 쉬움 모드라면 어려움 모드를 권한다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  for (let number = 1; number <= 22; number++) {
    await page
      .getByRole("button", { name: `구슬 ${number}`, exact: true })
      .click();
  }

  await expect(page.getByText("환상적이에요! 클리어!")).toBeVisible();
  // 판마다 배치가 달라지므로 개수만 확인한다. 두 물결 × 14개 = 28개다.
  await expect(page.locator('[class*="fireworkParticle"]')).toHaveCount(28);
  await expect(
    page.getByText(/다음엔 어려움 모드에도 도전해 보세요/),
  ).toBeVisible();
});

test("어려움 모드로 클리어하면 어려움 모드를 권하지 않는다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "난이도" }).selectOption("hard");
  await page.getByRole("button", { name: "게임 시작" }).click();
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  for (let number = 1; number <= 22; number++) {
    await page
      .getByRole("button", { name: `구슬 ${number}`, exact: true })
      .click();
  }

  await expect(page.getByText("환상적이에요! 클리어!")).toBeVisible();
  await expect(
    page.getByText(/다음엔 어려움 모드에도 도전해 보세요/),
  ).toBeHidden();
});

test("결과 캡쳐를 누르면 점수가 담긴 이미지를 내려받는다", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1", exact: true });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });
  await firstMarble.click();
  await page.getByRole("button", { name: "게임 종료" }).click();

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "결과 캡쳐" }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe("marble-game-1.png");
  await download.saveAs(path.join(testInfo.outputDir, "result.png"));
});

test("난이도는 기본 쉬움이고, 게임 중에는 바꿀 수 없다", async ({ page }) => {
  await page.goto("/");

  const select = page.getByRole("combobox", { name: "난이도" });
  await expect(select).toHaveValue("easy");

  await select.selectOption("hard");
  await expect(select).toHaveValue("hard");
  await expect(
    page.getByText(/어려움 모드에서는 이 점수가 모두 3배가 됩니다/)
  ).toBeVisible();

  await page.getByRole("button", { name: "게임 시작" }).click();
  await expect(select).toBeDisabled();

  await page.getByRole("button", { name: "게임 종료" }).click();
  await expect(select).toBeEnabled();
  await expect(select).toHaveValue("hard");
});

test("어려움 모드에서는 클릭 몇 번마다 판이 계속 돈다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "난이도" }).selectOption("hard");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const board = page.getByTestId("game-board");
  await expect(page.getByRole("button", { name: "구슬 1", exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(board).not.toHaveAttribute("data-rotation");

  // 2단계 이후 남은 19번의 정답 클릭 동안, 2~3번마다 도니 최소 6번은 돈다.
  // 22번까지 다 눌러 값이 최소 두 번 이상 바뀌는지(=여러 번 돈다) 확인한다.
  const seenRotations = new Set<string>();
  for (let n = 1; n <= 22; n++) {
    await page.getByRole("button", { name: `구슬 ${n}`, exact: true }).click();
    const rotation = await board.getAttribute("data-rotation");
    if (rotation) seenRotations.add(rotation);
  }

  expect(seenRotations.size).toBeGreaterThanOrEqual(2);
});

test("판이 90도(홀수 배)로 돌아 있을 때는 배경이 늘어나 타일을 다 담는다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "난이도" }).selectOption("hard");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const board = page.getByTestId("game-board");
  await expect(page.getByRole("button", { name: "구슬 1", exact: true })).toBeVisible({
    timeout: 10_000,
  });

  // data-axis-swapped가 나타날 때까지 순서대로 누른다. 22번 안에는 반드시 걸린다.
  let swapped = false;
  for (let n = 1; n <= 22 && !swapped; n++) {
    await page.getByRole("button", { name: `구슬 ${n}`, exact: true }).click();
    swapped = (await board.getAttribute("data-axis-swapped")) !== null;
  }
  expect(swapped).toBe(true);

  const boardBox = (await board.boundingBox())!;
  const tileBoxes = await page.locator('[aria-label^="구슬"]').evaluateAll(
    (nodes) => nodes.map((node) => node.getBoundingClientRect().toJSON())
  );

  for (const tile of tileBoxes) {
    expect(tile.top).toBeGreaterThanOrEqual(boardBox.y - 1);
    expect(tile.bottom).toBeLessThanOrEqual(boardBox.y + boardBox.height + 1);
  }
});

test("어려움 모드는 구슬 점수와 남은 시간 보너스가 3배다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "난이도" }).selectOption("hard");
  await page.getByRole("button", { name: "게임 시작" }).click();

  await expect(page.getByRole("button", { name: "구슬 1", exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "구슬 1", exact: true }).click();
  await page.getByRole("button", { name: "게임 종료" }).click();

  await expect(page.getByText("3점")).toBeVisible();
  await expect(page.getByText(/마지막으로 맞게 누른 구슬: 1 × 3/)).toBeVisible();
});

test("구슬이 3개뿐일 때는 놀림 캐릭터가 나오지 않는다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  await expect(page.getByRole("button", { name: "구슬 1", exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('[class*="tauntMascot"]')).toHaveCount(0);
});

test("구슬이 10개 이상 되면 왼쪽 위에 놀림 캐릭터가 나타나고, 말풍선이 2초마다 바뀐다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  // 아무것도 누르지 않고 두면 3단계까지 강제로 쌓여 구슬이 12개가 된다(10 이상).
  await expect(page.getByRole("button", { name: "구슬 10", exact: true })).toBeVisible({
    timeout: 15_000,
  });

  const mascot = page.locator('[class*="tauntMascot"]');
  await expect(mascot).toBeVisible();

  const bubble = page.locator('[class*="tauntBubble"]');
  const firstPhrase = await bubble.innerText();
  await expect(bubble).not.toHaveText(firstPhrase, { timeout: 3_000 });

  // 구슬을 눌러 10개 밑으로 줄어도 한 번 나타난 캐릭터는 사라지지 않는다.
  await page.getByRole("button", { name: "구슬 1", exact: true }).click();
  await expect(mascot).toBeVisible();

  // 게임이 끝나면 사라진다.
  await page.getByRole("button", { name: "게임 종료" }).click();
  await expect(mascot).toHaveCount(0);
});
