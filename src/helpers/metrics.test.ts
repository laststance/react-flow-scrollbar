import type { Node } from '@xyflow/react';
import {
  getReactFlowFocusViewport,
  getReactFlowScrollMetrics,
  getReactFlowTranslateExtent,
  getReactFlowViewportFromScrollRatios,
} from './metrics';

describe('getReactFlowScrollMetrics', () => {
  const baseNodes: Node[] = [
    {
      id: 'a',
      position: { x: 100, y: 200 },
      data: {},
      width: 200,
      height: 100,
    },
    {
      id: 'b',
      position: { x: 500, y: 800 },
      data: {},
      width: 200,
      height: 100,
    },
  ];

  it('shows both horizontal and vertical scrollbars when content exceeds the container', () => {
    // Arrange
    const reactFlowViewport = { x: -70, y: -170, zoom: 1 };

    // Act
    const metrics = getReactFlowScrollMetrics({
      nodes: baseNodes,
      containerWidth: 400,
      containerHeight: 300,
      reactFlowViewport,
      scrollbarTrackSize: 12,
      minThumbSize: 32,
      margin: 30,
    });

    // Assert
    expect(metrics.content).toBeDefined();
    expect(metrics.horizontal.isVisible).toBe(true);
    expect(metrics.vertical.isVisible).toBe(true);
    expect(metrics.horizontal.thumbSizePx).toBeGreaterThanOrEqual(32);
    expect(metrics.vertical.thumbSizePx).toBeGreaterThanOrEqual(32);
  });

  it('hides the scrollbars when every node fits inside the container', () => {
    // Arrange
    const reactFlowViewport = { x: -70, y: -170, zoom: 1 };

    // Act
    const metrics = getReactFlowScrollMetrics({
      nodes: baseNodes,
      containerWidth: 2000,
      containerHeight: 2000,
      reactFlowViewport,
      scrollbarTrackSize: 12,
      minThumbSize: 32,
      margin: 30,
    });

    // Assert
    expect(metrics.horizontal.isVisible).toBe(false);
    expect(metrics.vertical.isVisible).toBe(false);
  });

  it('maps scroll ratios back to React Flow viewport coordinates', () => {
    // Arrange
    const reactFlowViewport = { x: -70, y: -170, zoom: 1 };
    const metrics = getReactFlowScrollMetrics({
      nodes: baseNodes,
      containerWidth: 400,
      containerHeight: 300,
      reactFlowViewport,
      scrollbarTrackSize: 12,
      minThumbSize: 32,
      margin: 30,
    });

    // Act
    const nextReactFlowViewport = getReactFlowViewportFromScrollRatios({
      content: metrics.content!,
      reactFlowViewport,
      horizontalRatio: 1,
      verticalRatio: 1,
    });

    // Assert
    expect(nextReactFlowViewport.x).toBe(
      -(metrics.content!.contentMinX + metrics.content!.scrollRangeX),
    );
    expect(nextReactFlowViewport.y).toBe(
      -(metrics.content!.contentMinY + metrics.content!.scrollRangeY),
    );
    expect(nextReactFlowViewport.zoom).toBe(1);
  });

  it('shows only the vertical scrollbar when content overflows vertically but fits horizontally', () => {
    // Arrange
    const reactFlowViewport = { x: -70, y: -170, zoom: 1 };

    // Act
    const metrics = getReactFlowScrollMetrics({
      nodes: baseNodes,
      containerWidth: 700,
      containerHeight: 300,
      reactFlowViewport,
      scrollbarTrackSize: 12,
      minThumbSize: 32,
      margin: 30,
    });

    // Assert
    expect(metrics.horizontal.isVisible).toBe(false);
    expect(metrics.vertical.isVisible).toBe(true);
    expect(metrics.content!.scrollRangeX).toBe(0);
    expect(metrics.content!.scrollRangeY).toBe(460);
    // The non-scrolling axis thumb spans the full track (700 - 12).
    expect(metrics.horizontal.thumbSizePx).toBe(688);
  });

  it('clamps out-of-range scroll ratios to the content edges', () => {
    // Arrange
    const reactFlowViewport = { x: -70, y: -170, zoom: 1 };
    const metrics = getReactFlowScrollMetrics({
      nodes: baseNodes,
      containerWidth: 400,
      containerHeight: 300,
      reactFlowViewport,
      scrollbarTrackSize: 12,
      minThumbSize: 32,
      margin: 30,
    });

    // Act
    const nextReactFlowViewport = getReactFlowViewportFromScrollRatios({
      content: metrics.content!,
      reactFlowViewport,
      horizontalRatio: 1.5,
      verticalRatio: -0.5,
    });

    // Assert
    // clamped to ratio 1: -(contentMinX 70 + scrollRangeX 260)
    expect(nextReactFlowViewport.x).toBe(-330);
    // clamped to ratio 0: -(contentMinY 170 + 0)
    expect(nextReactFlowViewport.y).toBe(-170);
  });

  it('accounts for zoom when computing the scroll range and viewport coordinates', () => {
    // Arrange
    const reactFlowViewport = { x: -140, y: -340, zoom: 2 };

    // Act
    const metrics = getReactFlowScrollMetrics({
      nodes: baseNodes,
      containerWidth: 400,
      containerHeight: 300,
      reactFlowViewport,
      scrollbarTrackSize: 12,
      minThumbSize: 32,
      margin: 30,
    });
    const nextReactFlowViewport = getReactFlowViewportFromScrollRatios({
      content: metrics.content!,
      reactFlowViewport,
      horizontalRatio: 1,
      verticalRatio: 1,
    });

    // Assert
    // visible world = container / zoom: 660 - 400/2 = 460
    expect(metrics.content!.scrollRangeX).toBe(460);
    // 760 - 300/2 = 610
    expect(metrics.content!.scrollRangeY).toBe(610);
    // world coordinate scaled by zoom: -(70 + 460) * 2
    expect(nextReactFlowViewport.x).toBe(-1060);
    // -(170 + 610) * 2
    expect(nextReactFlowViewport.y).toBe(-1560);
    expect(nextReactFlowViewport.zoom).toBe(2);
  });

  it('applies the minimum thumb size when content vastly exceeds the container', () => {
    // Arrange
    const farApartNodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, width: 200, height: 200 },
      {
        id: 'b',
        position: { x: 9800, y: 9800 },
        data: {},
        width: 200,
        height: 200,
      },
    ];
    const reactFlowViewport = { x: -30, y: -30, zoom: 1 };

    // Act
    const metrics = getReactFlowScrollMetrics({
      nodes: farApartNodes,
      containerWidth: 400,
      containerHeight: 300,
      reactFlowViewport,
      scrollbarTrackSize: 12,
      minThumbSize: 32,
      margin: 30,
    });

    // Assert
    // The proportional thumb (~15px / ~9px) is below minThumbSize, so it is floored to 32px.
    expect(metrics.horizontal.thumbSizePx).toBe(32);
    expect(metrics.vertical.thumbSizePx).toBe(32);
  });

  it('returns no scrollable content when there are no nodes', () => {
    // Arrange
    const reactFlowViewport = { x: 0, y: 0, zoom: 1 };

    // Act
    const metrics = getReactFlowScrollMetrics({
      nodes: [],
      containerWidth: 400,
      containerHeight: 300,
      reactFlowViewport,
      scrollbarTrackSize: 12,
      minThumbSize: 32,
      margin: 30,
    });

    // Assert
    expect(metrics.content).toBeUndefined();
    expect(metrics.horizontal.isVisible).toBe(false);
    expect(metrics.vertical.isVisible).toBe(false);
    // trackSizePx is still derived from the container size even without content.
    expect(metrics.horizontal.trackSizePx).toBe(388);
    expect(metrics.vertical.trackSizePx).toBe(288);
  });
});

describe('getReactFlowTranslateExtent', () => {
  // Content range: x 0..500 (a:0..200, b:300..500), y 0..150 (a:0..100, b:50..150)
  const compactNodes: Node[] = [
    { id: 'a', position: { x: 0, y: 0 }, data: {}, width: 200, height: 100 },
    { id: 'b', position: { x: 300, y: 50 }, data: {}, width: 200, height: 100 },
  ];

  it('pads the extent to the viewport size when content is smaller, preventing the centering snap on pan', () => {
    // Arrange
    // content 500x150 fits inside container 1280x576 (both axes fit)

    // Act
    const extent = getReactFlowTranslateExtent({
      nodes: compactNodes,
      containerWidth: 1280,
      containerHeight: 576,
      margin: 30,
    });

    // Assert
    // Without padding d3 centers content and disagrees with focus/scrollbars (top-left), causing a snap.
    // minX=-30, maxX=max(530, -30+1280)=1250 / minY=-30, maxY=max(180, -30+576)=546
    expect(extent).toEqual([
      [-30, -30],
      [1250, 546],
    ]);
    // extent is at least the viewport size (= the condition for d3 to edge-clamp)
    expect(extent![1][0] - extent![0][0]).toBe(1280);
    expect(extent![1][1] - extent![0][1]).toBe(576);
  });

  it('keeps the extent at the content edge + margin when content is larger, preserving the scroll range', () => {
    // Arrange
    // content 500x150 exceeds container 300x100 (both axes scroll)

    // Act
    const extent = getReactFlowTranslateExtent({
      nodes: compactNodes,
      containerWidth: 300,
      containerHeight: 100,
      margin: 30,
    });

    // Assert
    // maxX=max(530, -30+300)=530 / maxY=max(180, -30+100)=180 → not padded, stays as-is
    expect(extent).toEqual([
      [-30, -30],
      [530, 180],
    ]);
  });

  it('does not collapse the extent when the container is unmeasured (0), falling back to the content edge + margin', () => {
    // Arrange
    // simulates the transient 0 before useMeasure initializes

    // Act
    const extent = getReactFlowTranslateExtent({
      nodes: compactNodes,
      containerWidth: 0,
      containerHeight: 0,
      margin: 30,
    });

    // Assert
    // Math.max keeps the content edge
    expect(extent).toEqual([
      [-30, -30],
      [530, 180],
    ]);
  });

  it('returns no extent when there are no nodes', () => {
    // Arrange & Act
    const extent = getReactFlowTranslateExtent({
      nodes: [],
      containerWidth: 1280,
      containerHeight: 576,
      margin: 30,
    });

    // Assert
    expect(extent).toBeUndefined();
  });

  it('pads to the visible world (containerSize / zoom) at zoom != 1 so panning still edge-clamps instead of centering', () => {
    // Arrange
    // content 500x150 fits inside the visible world 640x288 (= 1280x576 / 2) at zoom 2

    // Act
    const extent = getReactFlowTranslateExtent({
      nodes: compactNodes,
      containerWidth: 1280,
      containerHeight: 576,
      zoom: 2,
      margin: 30,
    });

    // Assert
    // visible world = container / zoom: 1280/2=640, 576/2=288.
    // minX=-30, maxX=max(530, -30+640)=610 / minY=-30, maxY=max(180, -30+288)=258
    expect(extent).toEqual([
      [-30, -30],
      [610, 258],
    ]);
    // extent spans exactly the visible world; the buggy `+ containerWidth` form would yield 1250.
    expect(extent![1][0] - extent![0][0]).toBe(640);
    expect(extent![1][1] - extent![0][1]).toBe(288);
  });

  it('keeps the extent at the content edge at zoom != 1 when content exceeds the visible world (identical to zoom 1)', () => {
    // Arrange
    // content 500x150 exceeds the visible world 150x50 (= 300x100 / 2) at zoom 2

    // Act
    const extent = getReactFlowTranslateExtent({
      nodes: compactNodes,
      containerWidth: 300,
      containerHeight: 100,
      zoom: 2,
      margin: 30,
    });

    // Assert
    // maxX=max(530, -30+150)=530 / maxY=max(180, -30+50)=180 → identical to the zoom=1 case (stable)
    expect(extent).toEqual([
      [-30, -30],
      [530, 180],
    ]);
  });
});

describe('getReactFlowFocusViewport', () => {
  it('top-left-pins (not centers) a target when the tree fits the viewport, so the first scroll after focus does not snap', () => {
    // Arrange
    // content 500x150 fits inside container 1280x576. Centering target b would give
    // worldLeft=-240/worldTop=-188, but it should clamp to top-left.
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, width: 200, height: 100 },
      {
        id: 'b',
        position: { x: 300, y: 50 },
        data: {},
        width: 200,
        height: 100,
      },
    ];

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode: nodes[1]!,
      containerWidth: 1280,
      containerHeight: 576,
      zoom: 1,
      margin: 30,
    });

    // Assert
    // top-left: worldLeft=worldTop=contentMin(-30) → viewport=(30,30). Centering would give (240,188).
    expect(viewport).toEqual({ x: 30, y: 30, zoom: 1 });
  });

  it('centers a target within the scroll range when the tree is larger than the viewport', () => {
    // Arrange
    // content 2200x1600 exceeds container 1000x800. The middle target b fits the range and is centered.
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, width: 200, height: 100 },
      {
        id: 'b',
        position: { x: 1000, y: 700 },
        data: {},
        width: 200,
        height: 100,
      },
      {
        id: 'c',
        position: { x: 2000, y: 1500 },
        data: {},
        width: 200,
        height: 100,
      },
    ];

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode: nodes[1]!,
      containerWidth: 1000,
      containerHeight: 800,
      zoom: 1,
      margin: 30,
    });

    // Assert
    // target center (1100,750) to screen center: worldLeft=600/worldTop=350 (within [-30,1230]/[-30,830]) → viewport=(-600,-350)
    expect(viewport).toEqual({ x: -600, y: -350, zoom: 1 });
  });

  it('prefers measured dimensions over width/height when computing the target center', () => {
    // Arrange
    // target b has measured 400x300 differing from width/height 200x100. The real getNodes() returns
    // measured-aware nodes, so the center should use measured. The farthest node c dominates bounds,
    // isolating measured-preference to the center computation.
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, width: 200, height: 100 },
      {
        id: 'b',
        position: { x: 1000, y: 700 },
        data: {},
        measured: { width: 400, height: 300 },
        width: 200,
        height: 100,
      },
      {
        id: 'c',
        position: { x: 2000, y: 1500 },
        data: {},
        width: 200,
        height: 100,
      },
    ];

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode: nodes[1]!,
      containerWidth: 1000,
      containerHeight: 800,
      zoom: 1,
      margin: 30,
    });

    // Assert
    // measured-preferred center (1000+200, 700+150)=(1200,850) → worldLeft=700/worldTop=450 (within [-30,1230]/[-30,830])
    // → viewport=(-700,-450). Misusing width(200x100) would give center (1100,750) → (-600,-350).
    expect(viewport).toEqual({ x: -700, y: -450, zoom: 1 });
  });

  it('clamps the center placement to the upper bound of the scroll range for an edge target', () => {
    // Arrange
    // Centering the farthest node c would push desiredWorld past the scroll range, so it clamps to the bottom-right.
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, width: 200, height: 100 },
      {
        id: 'b',
        position: { x: 1000, y: 700 },
        data: {},
        width: 200,
        height: 100,
      },
      {
        id: 'c',
        position: { x: 2000, y: 1500 },
        data: {},
        width: 200,
        height: 100,
      },
    ];

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode: nodes[2]!,
      containerWidth: 1000,
      containerHeight: 800,
      zoom: 1,
      margin: 30,
    });

    // Assert
    // center (2100,1550) → desiredWorldLeft=1600/Top=1150 exceeds range [-30,1230]/[-30,830], clamped to
    // worldLeft=1230/worldTop=830 → viewport=(-1230,-830)
    expect(viewport).toEqual({ x: -1230, y: -830, zoom: 1 });
  });

  it('top-left-pins the horizontal axis and centers the vertical axis when one fits and the other overflows', () => {
    // Arrange
    // content width 400 fits container 1000 (horizontal fit→top-left), content height 1600 exceeds 800 (vertical scroll)
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, width: 200, height: 100 },
      {
        id: 'b',
        position: { x: 100, y: 800 },
        data: {},
        width: 200,
        height: 100,
      },
      {
        id: 'c',
        position: { x: 200, y: 1500 },
        data: {},
        width: 200,
        height: 100,
      },
    ];

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode: nodes[1]!,
      containerWidth: 1000,
      containerHeight: 800,
      zoom: 1,
      margin: 30,
    });

    // Assert
    // horizontal: scrollRangeX=0 so the centering request clamps to contentMinX(-30) → viewport.x=30 (top-left).
    // vertical: target center 850 → worldTop=450 (within [-30,830]) centered → viewport.y=-450
    expect(viewport).toEqual({ x: 30, y: -450, zoom: 1 });
  });

  it('align=topLeft pins the node top-left + margin when the topmost node is the content top edge (no-op on a uniform-height tree)', () => {
    // Arrange
    // uniform-height tree: topmost node a (y=0) is the content top edge; b is also y=0, nothing above a
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, width: 200, height: 100 },
      { id: 'b', position: { x: 300, y: 0 }, data: {}, width: 200, height: 100 },
    ];

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode: nodes[0]!,
      containerWidth: 1280,
      containerHeight: 576,
      zoom: 1,
      align: 'topLeft',
      margin: 30,
    });

    // Assert
    // worldLeft=worldTop=contentMin(-30) → viewport=(30,30), matching the legacy "node top-left + margin" (no-op)
    expect(viewport).toEqual({ x: 30, y: 30, zoom: 1 });
  });

  it('align=topLeft clamps to the content top edge when a taller sibling sits above the topmost node and the tree fits, avoiding the post-focus snap', () => {
    // Arrange
    // variable-height tree: a taller sort-0 child of root (y=0) is placed above root (y=-120) by height
    // compensation, so root is NOT the content top edge. content 500x220 fits container 1280x576 (both fit).
    const nodes: Node[] = [
      {
        id: 'root',
        position: { x: 0, y: 0 },
        data: {},
        width: 200,
        height: 100,
      },
      {
        id: 'tall',
        position: { x: 300, y: -120 },
        data: {},
        width: 200,
        height: 100,
      },
    ];

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode: nodes[0]!,
      containerWidth: 1280,
      containerHeight: 576,
      zoom: 1,
      align: 'topLeft',
      margin: 30,
    });

    // Assert
    // Without clamping worldTop=root.y-margin=-30 (viewport.y=30), but d3 edge-clamps at contentMinY=-150, so the
    // first pan snaps y=30→150. Clamping to worldTop=contentMinY(-150) → viewport.y=150 aligns them and avoids the snap.
    expect(viewport).toEqual({ x: 30, y: 150, zoom: 1 });
  });

  it('align=topLeft pins the topmost node to the content top edge (scroll-range origin) when the tree is larger than the viewport', () => {
    // Arrange
    // vertically large tree: root (y=0) is the content top edge. content 200x2100 exceeds container height 576.
    const nodes: Node[] = [
      {
        id: 'root',
        position: { x: 0, y: 0 },
        data: {},
        width: 200,
        height: 100,
      },
      {
        id: 'deep',
        position: { x: 0, y: 2000 },
        data: {},
        width: 200,
        height: 100,
      },
    ];

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes,
      targetNode: nodes[0]!,
      containerWidth: 1280,
      containerHeight: 576,
      zoom: 1,
      align: 'topLeft',
      margin: 30,
    });

    // Assert
    // worldTop=root.y-margin=-30=contentMinY (origin of scroll range [-30, 1554]) → viewport.y=30. No over-clamping.
    expect(viewport).toEqual({ x: 30, y: 30, zoom: 1 });
  });

  it('returns no viewport when there are no nodes', () => {
    // Arrange
    const targetNode: Node = {
      id: 'a',
      position: { x: 0, y: 0 },
      data: {},
      width: 200,
      height: 100,
    };

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes: [],
      targetNode,
      containerWidth: 1280,
      containerHeight: 576,
      zoom: 1,
      margin: 30,
    });

    // Assert
    expect(viewport).toBeUndefined();
  });

  it('returns no viewport when the container is unmeasured (width 0), deferring to the caller fallback', () => {
    // Arrange
    // before useMeasure initializes, containerWidth is 0; the focus caller sees undefined and falls back to a direct viewport
    const targetNode: Node = {
      id: 'a',
      position: { x: 0, y: 0 },
      data: {},
      width: 200,
      height: 100,
    };

    // Act
    const viewport = getReactFlowFocusViewport({
      nodes: [targetNode],
      targetNode,
      containerWidth: 0,
      containerHeight: 800,
      zoom: 1,
      margin: 30,
    });

    // Assert
    expect(viewport).toBeUndefined();
  });
});
