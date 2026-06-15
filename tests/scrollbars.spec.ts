import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// Selectors for the library's stable data-attributes (part of the component's public surface).
const H_TRACK = '[data-rf-scrollbar-track][data-axis="x"]';
const V_TRACK = '[data-rf-scrollbar-track][data-axis="y"]';
const H_THUMB = '[data-rf-scrollbar-thumb][data-axis="x"]';
const V_THUMB = '[data-rf-scrollbar-thumb][data-axis="y"]';

/** Parse the React Flow viewport transform (`translate(Xpx, Ypx) scale(Z)`) into numbers. */
async function readViewportTransform(
  page: Page,
): Promise<{ x: number; y: number; zoom: number }> {
  const transform = await page
    .locator('.react-flow__viewport')
    .evaluate((element) => (element as HTMLElement).style.transform);
  const match = transform.match(
    /translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(\s*([-\d.]+)\s*\)/,
  );
  if (!match) {
    throw new Error(`Unexpected viewport transform: "${transform}"`);
  }
  return { x: Number(match[1]), y: Number(match[2]), zoom: Number(match[3]) };
}

/** The thumb's left/top offset in px, read from the inline geometry the component sets per frame. */
async function readThumbOffset(thumb: Locator, axis: 'x' | 'y'): Promise<number> {
  return thumb.evaluate(
    (element, which) =>
      parseFloat(
        which === 'x'
          ? (element as HTMLElement).style.left
          : (element as HTMLElement).style.top,
      ),
    axis,
  );
}

/** Wait two animation frames so the controller's rAF-coalesced viewport write has actually applied. */
async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test.describe('ReactFlowScrollbars', () => {
  test('shows both scrollbars once React Flow measures the unsized nodes', async ({
    page,
  }) => {
    // Arrange / Act — the nodes ship without width/height, so the bars can only appear after React
    // Flow measures them asynchronously (the regression this guards: stale bounds → bars never show).
    await page.goto('/');

    // Assert — both bars become visible.
    await expect(page.locator(H_THUMB)).toBeVisible();
    await expect(page.locator(V_THUMB)).toBeVisible();
  });

  test('keeps the scrollbar tracks pinned to the pane while the canvas pans', async ({
    page,
  }) => {
    // Arrange — wait for the bars, snapshot the track positions and the horizontal thumb offset.
    await page.goto('/');
    const hTrack = page.locator(H_TRACK);
    const vTrack = page.locator(V_TRACK);
    await expect(hTrack).toBeVisible();
    const hTrackBefore = await hTrack.boundingBox();
    const vTrackBefore = await vTrack.boundingBox();
    const hThumbBefore = await readThumbOffset(page.locator(H_THUMB), 'x');

    // Act — pan the canvas up-left by dragging an empty part of the pane (reveals down-right content).
    const container = await page.locator('[data-testid="flow-container"]').boundingBox();
    if (!container || !hTrackBefore || !vTrackBefore) {
      throw new Error('Missing layout boxes');
    }
    await page.mouse.move(container.x + 420, container.y + 320);
    await page.mouse.down();
    await page.mouse.move(container.x + 200, container.y + 140, { steps: 8 });
    await page.mouse.up();

    // Assert — the tracks stayed pinned (overlay is fixed to the pane, NOT riding the transform)...
    const hTrackAfter = await hTrack.boundingBox();
    const vTrackAfter = await vTrack.boundingBox();
    expect(hTrackAfter!.x).toBeCloseTo(hTrackBefore.x, 0);
    expect(hTrackAfter!.y).toBeCloseTo(hTrackBefore.y, 0);
    expect(vTrackAfter!.x).toBeCloseTo(vTrackBefore.x, 0);
    expect(vTrackAfter!.y).toBeCloseTo(vTrackBefore.y, 0);
    // ...while the thumb DID move, proving the pan registered and the bar reflects scroll position.
    await expect
      .poll(() => readThumbOffset(page.locator(H_THUMB), 'x'))
      .toBeGreaterThan(hThumbBefore);
  });

  test('drags the horizontal thumb to scroll the canvas right', async ({ page }) => {
    // Arrange
    await page.goto('/');
    const hThumb = page.locator(H_THUMB);
    await expect(hThumb).toBeVisible();
    const transformBefore = await readViewportTransform(page);
    const thumbBox = await hThumb.boundingBox();
    if (!thumbBox) {
      throw new Error('Missing thumb box');
    }

    // Act — grab the thumb centre and drag it 160px to the right.
    await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2 + 160,
      thumbBox.y + thumbBox.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();

    // Assert — the canvas scrolled right (viewport translateX moved further negative). Polled because
    // the drag's final scroll lands through the controller's rAF-coalesced write.
    await expect
      .poll(async () => (await readViewportTransform(page)).x)
      .toBeLessThan(transformBefore.x);
    const transformAfter = await readViewportTransform(page);
    expect(transformAfter.zoom).toBeCloseTo(transformBefore.zoom, 5);
  });

  test('jumps the thumb toward a click on the empty track gutter', async ({ page }) => {
    // Arrange
    await page.goto('/');
    const hTrack = page.locator(H_TRACK);
    const hThumb = page.locator(H_THUMB);
    await expect(hThumb).toBeVisible();
    const thumbOffsetBefore = await readThumbOffset(hThumb, 'x');
    const trackBox = await hTrack.boundingBox();
    const thumbBox = await hThumb.boundingBox();
    if (!trackBox || !thumbBox) {
      throw new Error('Missing track/thumb box');
    }

    // Act — click the empty gutter just past the thumb's right edge. Deliberately NOT at the far-right
    // end: React Flow's attribution link sits bottom-right and would intercept the click there.
    await page.mouse.click(
      thumbBox.x + thumbBox.width + 40,
      trackBox.y + trackBox.height / 2,
    );

    // Assert — the thumb jumped to the right. Poll because the jump is applied through the controller's
    // rAF-coalesced viewport write, so the new offset lands a frame or two after the click.
    await expect
      .poll(() => readThumbOffset(hThumb, 'x'))
      .toBeGreaterThan(thumbOffsetBefore);
  });

  test('stops scrolling when a drag is cancelled by pointercancel', async ({ page }) => {
    // Arrange — grab the horizontal thumb and drag it part-way to scroll the canvas.
    await page.goto('/');
    const hThumb = page.locator(H_THUMB);
    await expect(hThumb).toBeVisible();
    const thumbBox = await hThumb.boundingBox();
    if (!thumbBox) {
      throw new Error('Missing thumb box');
    }
    const startX = thumbBox.x + thumbBox.width / 2;
    const startY = thumbBox.y + thumbBox.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY, { steps: 6 });
    await settleFrames(page);
    const transformAtCancel = await readViewportTransform(page);

    // Act — the OS yanks the gesture (e.g. palm rejection): the library listens for pointercancel.
    await page.evaluate(() =>
      window.dispatchEvent(new PointerEvent('pointercancel')),
    );
    // Move the pointer far further — a still-live drag would scroll a lot more.
    await page.mouse.move(startX + 240, startY, { steps: 8 });
    await settleFrames(page);
    const transformAfterCancel = await readViewportTransform(page);
    await page.mouse.up();

    // Assert — the viewport did not move after the cancel, proving the drag was released.
    expect(transformAfterCancel.x).toBeCloseTo(transformAtCancel.x, 0);
  });

  test('aborts the drag cleanly when the flow unmounts mid-gesture', async ({
    page,
  }) => {
    // Arrange — collect any runtime error so a ghost listener / post-unmount write would fail the test.
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    await page.goto('/');
    const hThumb = page.locator(H_THUMB);
    await expect(hThumb).toBeVisible();
    const thumbBox = await hThumb.boundingBox();
    if (!thumbBox) {
      throw new Error('Missing thumb box');
    }
    const startX = thumbBox.x + thumbBox.width / 2;
    const startY = thumbBox.y + thumbBox.height / 2;

    // Act — begin a drag, then unmount the whole flow while the pointer is still down. Clicking the
    // toggle via JS (not the held virtual mouse) avoids clobbering the in-flight drag gesture.
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY, { steps: 4 });
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>(
        '[data-testid="toggle-mount"]',
      )?.click();
    });
    // The orphaned pointer keeps moving — the aborted listeners must ignore it without throwing.
    await page.mouse.move(startX + 200, startY, { steps: 6 });
    await page.mouse.up();

    // Assert — the overlay is gone and nothing errored during the torn-down gesture.
    await expect(page.locator('[data-rf-scrollbars]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('keeps the scrollbars visible and tracks pinned while zooming in and out', async ({
    page,
  }) => {
    // Arrange — record the bottom edge of the horizontal track (it must stay pinned across zoom).
    await page.goto('/');
    const hTrack = page.locator(H_TRACK);
    const hThumb = page.locator(H_THUMB);
    await expect(hThumb).toBeVisible();
    const trackBefore = await hTrack.boundingBox();
    if (!trackBefore) {
      throw new Error('Missing track box');
    }

    // Act — zoom in three steps then back out, using the built-in React Flow controls. The recorded
    // video is the real artifact here: per project rules, motion/jank is verified from frames, not
    // from static sampling — these assertions only guard the gross "bars vanished / track jumped" case.
    const zoomIn = page.locator('.react-flow__controls-zoomin');
    const zoomOut = page.locator('.react-flow__controls-zoomout');
    for (let step = 0; step < 3; step += 1) {
      await zoomIn.click();
      await settleFrames(page);
    }
    await expect(hThumb).toBeVisible();
    for (let step = 0; step < 3; step += 1) {
      await zoomOut.click();
      await settleFrames(page);
    }

    // Assert — bars survived the zoom round-trip and the track is still pinned to the pane bottom.
    await expect(hThumb).toBeVisible();
    const trackAfter = await hTrack.boundingBox();
    expect(trackAfter!.y).toBeCloseTo(trackBefore.y, 0);
  });
});
