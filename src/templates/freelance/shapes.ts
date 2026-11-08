/**
 * Freelance's two wireframe shapes (spec 081) as SVG path data, worked out once here: a ring seen at
 * a slant behind the photo, and a round patch of warped grid in the page's corner. Only straight
 * segments and plain shapes, which the direct PDF draws as they are (no transforms, no gradients).
 * The grid lines are in the paper's colour, over the accent.
 */

type Point = [number, number]

const round = (n: number) => Math.round(n * 100) / 100

function path(points: Point[], closed = false): string {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`).join('') + (closed ? 'Z' : '')
}

interface Ellipse {
  cx: number
  cy: number
  rx: number
  ry: number
}

/** A point on an ellipse turned by `tilt` radians, at angle `t`. */
function onEllipse(e: Ellipse, tilt: number, t: number): Point {
  const x = e.rx * Math.cos(t)
  const y = e.ry * Math.sin(t)
  return [e.cx + x * Math.cos(tilt) - y * Math.sin(tilt), e.cy + x * Math.sin(tilt) + y * Math.cos(tilt)]
}

function ellipsePath(e: Ellipse, tilt: number, steps = 48): string {
  return path(Array.from({ length: steps }, (_, i) => onEllipse(e, tilt, (i / steps) * 2 * Math.PI)), true)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* ---- the ring, in a 100 × 110 box ----------------------------------------------------------- */

const TILT = -0.42
const OUTER: Ellipse = { cx: 50, cy: 56, rx: 44, ry: 51 }
const HOLE: Ellipse = { cx: 59, cy: 44, rx: 15, ry: 21 }
const between = (t: number): Ellipse => ({
  cx: lerp(HOLE.cx, OUTER.cx, t),
  cy: lerp(HOLE.cy, OUTER.cy, t),
  rx: lerp(HOLE.rx, OUTER.rx, t),
  ry: lerp(HOLE.ry, OUTER.ry, t),
})

export const RING = {
  viewBox: '0 0 100 110',
  outer: ellipsePath(OUTER, TILT),
  hole: ellipsePath(HOLE, TILT),
  /** Two rings between the hole and the edge, and the spokes across them. */
  grid: [
    ellipsePath(between(1 / 3), TILT),
    ellipsePath(between(2 / 3), TILT),
    ...Array.from({ length: 18 }, (_, i) => {
      const t = (i / 18) * 2 * Math.PI
      return path([onEllipse(HOLE, TILT, t), onEllipse(between(1 / 3), TILT, t), onEllipse(between(2 / 3), TILT, t), onEllipse(OUTER, TILT, t)])
    }),
  ].join(''),
}

/* ---- the corner patch, in a 100 × 90 box, its round edge running off the right and bottom ---- */

const PATCH = { cx: 74, cy: 74, r: 64 }
const inside = ([x, y]: Point) => Math.hypot(x - PATCH.cx, y - PATCH.cy) <= PATCH.r - 0.5

/** A line of points kept only where it crosses the patch, as one or more runs. */
function clipped(points: Point[]): string {
  const runs: Point[][] = [[]]
  for (const p of points) {
    if (inside(p)) runs[runs.length - 1]!.push(p)
    else if (runs[runs.length - 1]!.length) runs.push([])
  }
  return runs.filter((run) => run.length > 1).map((run) => path(run)).join('')
}

const span = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step)

export const PATCH_SHAPE = {
  viewBox: '0 0 100 90',
  disc: path(span(0, 95, 1).map((i) => [PATCH.cx + PATCH.r * Math.cos((i / 96) * 2 * Math.PI), PATCH.cy + PATCH.r * Math.sin((i / 96) * 2 * Math.PI)] as Point), true),
  /** Rows bending like a cloth, and columns leaning with them. */
  grid: [
    ...span(16, 140, 12).map((y0) => clipped(span(0, 140, 2).map((x) => [x, y0 + 5 * Math.sin(x / 16 + y0 / 22)] as Point))),
    ...span(20, 140, 13).map((x0) => clipped(span(0, 140, 2).map((y) => [x0 + 6 * Math.sin(y / 19 + x0 / 30) - y * 0.12, y] as Point))),
  ].join(''),
}
