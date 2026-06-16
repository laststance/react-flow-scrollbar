import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// The thin (8px) horizontal bar. Its visible thumb is only ~6px tall, far below the 44px coarse-pointer
// touch-target guidance — so on touch it relies on the invisible `::before` hit-zone, which widens to
// 24px under `@media (pointer: coarse)`. These selectors are the library's stable public data-attrs.
const H_THUMB = '[data-rf-scrollbar-thumb][data-axis="x"]';

// A paced finger drag: ~190px of rightward travel spread over 12 moves with a 30ms beat. The pacing
// matters twice — it stops Chromium coalescing the moves into one jump, and it makes the thumb glide
// across ~8 video frames so the recorded motion can be eyeballed for jank (an instant CDP drag is
// invisible on video). `_MIN_DRAG_PX` is the floor that separates a real grab+drag from a 1-2px twitch.
const DRAG_STEPS = 12;
const DRAG_STEP_PX = 16;
const DRAG_STEP_PACE_MS = 30;
const MIN_THUMB_TRAVEL_PX = 40;

/** Viewport translateX from the React Flow transform; a thumb-drag-right drives this MORE NEGATIVE. */
async function readViewportX(page: Page): Promise<number> {
  const transform = await page
    .locator('.react-flow__viewport')
    .evaluate((element) => (element as HTMLElement).style.transform);
  const match = transform.match(/translate\(\s*([-\d.]+)px/);
  if (!match) {
    throw new Error(`Unexpected viewport transform: "${transform}"`);
  }
  return Number(match[1]);
}

/** The horizontal thumb's inline `left` offset in px; a thumb-drag-right makes this INCREASE. */
async function readThumbLeft(thumb: Locator): Promise<number> {
  return thumb.evaluate((element) =>
    parseFloat((element as HTMLElement).style.left),
  );
}

test.describe('thin scrollbar touch target (8px bar, coarse pointer)', () => {
  // A coarse pointer with room for the 800×600 pane. `isMobile` is what makes Chromium report
  // `@media (pointer: coarse)` as matching (so the widened hit-zone activates); the larger viewport
  // keeps the whole pane on-screen (a phone-sized viewport would clip it).
  test.use({ viewport: { width: 1280, height: 900 }, hasTouch: true, isMobile: true });

  test('a touch landing above the 6px bar still grabs the thumb and scrolls — proving the widened hit-zone makes the thin bar tappable', async ({
    page,
  }) => {
    // Arrange — wait for the bar, then assert the coarse-pointer state that the touch-target fix depends on:
    // the media query matches AND the thumb's `::before` grab pad has widened from 8px to 24px.
    await page.goto('/');
    const thumb = page.locator(H_THUMB);
    await expect(thumb).toBeVisible();

    const coarsePointerMatches = await page.evaluate(
      () => matchMedia('(pointer: coarse)').matches,
    );
    expect(coarsePointerMatches).toBe(true);

    const hitZoneHeight = await thumb.evaluate(
      (element) => getComputedStyle(element, '::before').height,
    );
    expect(hitZoneHeight).toBe('24px');

    const thumbBox = await thumb.boundingBox();
    if (!thumbBox) {
      throw new Error('Missing thumb box');
    }
    const viewportXBefore = await readViewportX(page);
    const thumbLeftBefore = await readThumbLeft(thumb);

    // Act — dispatch a REAL touch drag (CDP, coordinate-based so it goes through true hit-testing) whose
    // start point is 12px ABOVE the visible 6px thumb: inside the 24px `::before` pad, outside the bar.
    // If the pad weren't there this coordinate would hit the React Flow pane instead of the thumb. The
    // moves are paced so the thumb glides across video frames rather than teleporting in one coalesced jump.
    const grabX = thumbBox.x + thumbBox.width / 2;
    const grabY = thumbBox.y - 12;
    const cdpSession = await page.context().newCDPSession(page);
    const touchAt = (x: number) => ({ x, y: grabY });
    await cdpSession.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [touchAt(grabX)],
    });
    for (let step = 1; step <= DRAG_STEPS; step += 1) {
      await cdpSession.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [touchAt(grabX + step * DRAG_STEP_PX)],
      });
      await page.waitForTimeout(DRAG_STEP_PACE_MS);
    }
    await cdpSession.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });

    // Assert — the THUMB was dragged right (not the pane panned): a thumb-drag-right uniquely moves the
    // thumb's own `left` offset UP while pushing the viewport translateX DOWN. A pane-pan from the same
    // spot would do the opposite (thumb left would decrease), so this pair rules out an accidental pan.
    // The travel floor proves a genuine grab+drag, not a 1-2px twitch that a directional check would pass.
    await expect
      .poll(() => readThumbLeft(thumb))
      .toBeGreaterThan(thumbLeftBefore + MIN_THUMB_TRAVEL_PX);
    const thumbLeftAfter = await readThumbLeft(thumb);
    const viewportXAfter = await readViewportX(page);
    // Surfaced in the run log so the recorded magnitude can be cross-checked against the inspected frames.
    console.log(
      `[touch-drag] thumbLeft ${thumbLeftBefore.toFixed(1)} -> ${thumbLeftAfter.toFixed(1)} ` +
        `(Δ${(thumbLeftAfter - thumbLeftBefore).toFixed(1)}px)  |  ` +
        `viewportX ${viewportXBefore.toFixed(1)} -> ${viewportXAfter.toFixed(1)} ` +
        `(Δ${(viewportXAfter - viewportXBefore).toFixed(1)}px)`,
    );
    expect(viewportXAfter).toBeLessThan(viewportXBefore);
  });
});
