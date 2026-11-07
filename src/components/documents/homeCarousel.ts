/**
 * The home's carousel (spec 077): a sheet with two faces turns on its vertical axis, and the face
 * turned away is given the next template while it cannot be seen. One turn shows two templates.
 */

/** One full turn: the front, then the back, then the front again. */
export const TURN_MS = 8000

/**
 * A slow drift (0° → 10°), a 0.8 s turn (to 170°), a drift (to 185°) and the turn home (to 360°),
 * each stretch eased: the motion of the reference the owner chose.
 */
export const TURN_KEYFRAMES: Keyframe[] = [
  { transform: 'rotateY(0deg)', offset: 0, easing: 'ease' },
  { transform: 'rotateY(10deg)', offset: 0.4, easing: 'ease' },
  { transform: 'rotateY(170deg)', offset: 0.5, easing: 'ease' },
  { transform: 'rotateY(185deg)', offset: 0.9, easing: 'ease' },
  { transform: 'rotateY(360deg)', offset: 1 },
]

/**
 * Past this point of a turn the front faces away (the back shows from about 45 % to 95 %), so it can
 * take the template it will show when it comes round. The back changes at the start of a turn, when
 * it faces away too.
 */
const FRONT_SWAP = 0.7

/** Which of `count` templates each face holds `elapsed` ms into the carousel. */
export function facesAt(elapsed: number, count: number): { front: number; back: number } {
  const turn = Math.floor(Math.max(0, elapsed) / TURN_MS)
  const progress = (Math.max(0, elapsed) % TURN_MS) / TURN_MS
  return {
    front: (2 * turn + (progress >= FRONT_SWAP ? 2 : 0)) % count,
    back: (2 * turn + 1) % count,
  }
}
