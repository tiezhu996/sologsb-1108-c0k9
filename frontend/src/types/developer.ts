export type DeveloperCategory = 'D-76' | 'HC-110' | 'Rodinal' | 'C-41'
export type Dilution = '1:1' | '1:3'
export type DeveloperState = '新配' | '在用' | '报废'

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
  /** 升温系数：实测温度每高于基准 1°C，显影时间乘以此值 */
  warmFactor?: number
  /** 降温系数：实测温度每低于基准 1°C，显影时间乘以此值 */
  coolFactor?: number
  schemaRev?: number
}
