export type DeveloperCategory = 'D-76' | 'HC-110' | 'Rodinal' | 'C-41'
export type Dilution = '1:1' | '1:3'
export type DeveloperState = '新配' | '在用' | '报废'

/** 通用温度补偿系数：温度每升高 1°C 乘 0.9，每降低 1°C 乘 1.1 */
export const DEFAULT_WARM_FACTOR = 0.9
export const DEFAULT_COOL_FACTOR = 1.1

export interface Developer {
  id?: number
  name: string
  category: DeveloperCategory
  dilution: Dilution
  volumeMl: number
  mixedAt: string
  maxRolls: number
  usedRolls: number
  state: DeveloperState
  /** 升温系数：实测温度每高于基准 1°C，显影时间乘该值；未登记时沿用 0.9 */
  warmFactor?: number
  /** 降温系数：实测温度每低于基准 1°C，显影时间乘该值；未登记时沿用 1.1 */
  coolFactor?: number
  schemaRev?: number
}

/** 判断补偿系数是否可用于折算（必须是正数） */
export function isValidFactor(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** 取工作液的升温系数，缺省或非法时回落到通用值 */
export function resolveWarmFactor(developer?: Pick<Developer, 'warmFactor'> | null): number {
  return isValidFactor(developer?.warmFactor) ? developer.warmFactor : DEFAULT_WARM_FACTOR
}

/** 取工作液的降温系数，缺省或非法时回落到通用值 */
export function resolveCoolFactor(developer?: Pick<Developer, 'coolFactor'> | null): number {
  return isValidFactor(developer?.coolFactor) ? developer.coolFactor : DEFAULT_COOL_FACTOR
}
