import { computed, ref, type Ref } from 'vue'
import {
  resolveCoolFactor,
  resolveWarmFactor,
  type Developer
} from '../types/developer'

export interface CompensationAdvice {
  minutes: number
  factor: number
  delta: number
  advice: string
}

/** 一组升温 / 降温系数，结构与 Developer 上的同名字段一致 */
export type CompensationCoefficients = Pick<Developer, 'warmFactor' | 'coolFactor'>

export function compensationFactor(
  actualTempC: number,
  referenceTempC: number,
  coefficients?: CompensationCoefficients | null
): number {
  const delta = actualTempC - referenceTempC
  const warm = resolveWarmFactor(coefficients)
  const cool = resolveCoolFactor(coefficients)
  return delta >= 0 ? Math.pow(warm, delta) : Math.pow(cool, Math.abs(delta))
}

export function calculateCompensatedMinutes(
  baseMinutes: number,
  actualTempC: number,
  referenceTempC = 20,
  coefficients?: CompensationCoefficients | null
): number {
  const safeBase = Math.max(0.1, baseMinutes)
  const factor = compensationFactor(actualTempC, referenceTempC, coefficients)
  return Math.max(0.25, Math.round(safeBase * factor * 100) / 100)
}

export function getCompensationAdvice(
  baseMinutes: number,
  actualTempC: number,
  referenceTempC = 20,
  coefficients?: CompensationCoefficients | null
): CompensationAdvice {
  const delta = Math.round((actualTempC - referenceTempC) * 10) / 10
  const minutes = calculateCompensatedMinutes(baseMinutes, actualTempC, referenceTempC, coefficients)
  const factor = compensationFactor(actualTempC, referenceTempC, coefficients)
  const direction = delta > 0 ? '缩短' : delta < 0 ? '延长' : '维持'
  const advice = delta === 0
    ? '实测温度等于配方基准，按原时间执行'
    : `实测温度${delta > 0 ? '偏高' : '偏低'} ${Math.abs(delta).toFixed(1)}°C，建议${direction}至 ${minutes.toFixed(2)} 分钟`
  return { minutes, factor: Math.round(factor * 1000) / 1000, delta, advice }
}

export function useTempCompensate(
  referenceTempC: Ref<number> = ref(20),
  coefficients: Ref<CompensationCoefficients | undefined> = ref(undefined)
) {
  const actualTempC = ref(referenceTempC.value)
  const advice = computed(() =>
    getCompensationAdvice(10, actualTempC.value, referenceTempC.value, coefficients.value)
  )

  function compensate(baseMinutes: number, tempC = actualTempC.value): number {
    return calculateCompensatedMinutes(baseMinutes, tempC, referenceTempC.value, coefficients.value)
  }

  function suggest(baseMinutes: number, tempC = actualTempC.value): CompensationAdvice {
    return getCompensationAdvice(baseMinutes, tempC, referenceTempC.value, coefficients.value)
  }

  return { referenceTempC, actualTempC, advice, compensate, suggest }
}

/**
 * 按配方所用工作液取温度补偿系数。
 * 配方表与冲洗记录都通过这里折算，保证同一配方在两处算出的分钟一致；
 * 工作液缺失或从未登记系数时返回 undefined，由折算逻辑回落通用值。
 */
export function coefficientsForDeveloper(
  developerId: number | undefined,
  developers: Array<Pick<Developer, 'id' | 'warmFactor' | 'coolFactor'>>
): CompensationCoefficients | undefined {
  if (developerId === undefined) return undefined
  return developers.find((developer) => developer.id === developerId)
}
