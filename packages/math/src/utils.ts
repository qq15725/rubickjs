export const PI = Math.PI
export const PI_2 = PI * 2
export const DEG_TO_RAD = PI / 180
export const RAD_TO_DEG = 180 / PI

export function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(val, max))
}

export function lerp(a: number, b: number, weight: number) {
  return (1 - weight) * a + weight * b
}
