// @vitest-environment jsdom
import type { CoordinateExtent } from '@xyflow/react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStableExtent } from './useBoundedReactFlowViewport';

// This memo is the load-bearing fix for "panning snaps back on every zoom frame": when content ≥
// viewport the extent's four numbers do not move with zoom, so the hook must hand back the SAME array
// reference — otherwise <ReactFlow> sees a new translateExtent prop each frame and re-clamps the pan.
describe('useStableExtent', () => {
  it('returns the same extent reference when the four bounds are unchanged so React Flow does not re-clamp the viewport on every zoom frame', () => {
    // Arrange — content ≥ viewport: the extent numbers stay put as zoom changes.
    const firstExtent: CoordinateExtent = [
      [-30, -30],
      [610, 258],
    ];
    const { result, rerender } = renderHook(
      ({ extent }) => useStableExtent(extent),
      { initialProps: { extent: firstExtent } },
    );
    const firstReference = result.current;

    // Act — a later render recomputes a brand-new array holding the identical four numbers.
    const valueEqualExtent: CoordinateExtent = [
      [-30, -30],
      [610, 258],
    ];
    rerender({ extent: valueEqualExtent });

    // Assert — the hook returns the ORIGINAL array, so the <ReactFlow> prop identity is stable.
    expect(result.current).toBe(firstReference);
    expect(result.current).not.toBe(valueEqualExtent);
  });

  it('returns a new extent reference when a bound actually moves so a resized graph re-clamps', () => {
    // Arrange
    const firstExtent: CoordinateExtent = [
      [-30, -30],
      [610, 258],
    ];
    const { result, rerender } = renderHook(
      ({ extent }) => useStableExtent(extent),
      { initialProps: { extent: firstExtent } },
    );

    // Act — the graph grew one pixel wider, moving the right bound.
    const movedExtent: CoordinateExtent = [
      [-30, -30],
      [611, 258],
    ];
    rerender({ extent: movedExtent });

    // Assert — a fresh reference carrying the moved bounds.
    expect(result.current).toBe(movedExtent);
    expect(result.current).toEqual([
      [-30, -30],
      [611, 258],
    ]);
  });

  it('stays undefined while there is nothing to scroll so no translateExtent is forced onto React Flow', () => {
    // Arrange — content < viewport leaves the controller with no extent to bound.
    const { result, rerender } = renderHook<
      CoordinateExtent | undefined,
      { extent: CoordinateExtent | undefined }
    >(({ extent }) => useStableExtent(extent), {
      initialProps: { extent: undefined },
    });

    // Act
    rerender({ extent: undefined });

    // Assert
    expect(result.current).toBeUndefined();
  });
});
