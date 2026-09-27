import { computed, ref, type Ref } from 'vue'
import type { Developer } from '../types/developer'

export interface CompensationFactors {
  /** 升温系数（温度高于基准时，每 1°C 乘以此值） */
  warmFactor: number
  /** 降温系数（温度低于基准时，每 1°C 乘以此值） */
  coolFactor: number
}

export interface CompensationAdvice {
  minutes: number
  factor: number
  delta: number
  advice: string
}

/** 通用温度补偿值：升温每 1°C 乘 0.9，降温每 1°C 乘 1.1。未登记系数的工作液沿用此值。 */
export const DEFAULT_COMPENSATION: CompensationFactors = {
  warmFactor: 0.9,
  coolFactor: 1.1
}

/** 系数必须为大于 0 的有限数字；0、负数或非数字均不接受 */
export function isValidFactor(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** 取工作液的升/降温系数，缺失或异常时回落到通用值 */
export function resolveFactors(developer?: Pick<Developer, 'warmFactor' | 'coolFactor'> | null): CompensationFactors {
  return {
    warmFactor: isValidFactor(developer?.warmFactor) ? developer.warmFactor : DEFAULT_COMPENSATION.warmFactor,
    coolFactor: isValidFactor(developer?.coolFactor) ? developer.coolFactor : DEFAULT_COMPENSATION.coolFactor
  }
}

export interface CompensatedRecipe {
  devMinutes: number
  tempC: number
}

/**
 * 配方表与冲洗记录共用的唯一折算入口：
 * 按配方所用工作液的升/降温系数，把基准时间折算到目标温度。
 */
export function suggestRecipeMinutes(
  recipe: CompensatedRecipe,
  targetTempC: number,
  developer?: Pick<Developer, 'warmFactor' | 'coolFactor'> | null
): CompensationAdvice {
  return getCompensationAdvice(
    recipe.devMinutes,
    targetTempC,
    recipe.tempC,
    resolveFactors(developer)
  )
}

function factorForDelta(delta: number, factors: CompensationFactors): number {
  return delta >= 0 ? Math.pow(factors.warmFactor, delta) : Math.pow(factors.coolFactor, Math.abs(delta))
}

export function calculateCompensatedMinutes(
  baseMinutes: number,
  actualTempC: number,
  referenceTempC = 20,
  factors: CompensationFactors = DEFAULT_COMPENSATION
): number {
  const safeBase = Math.max(0.1, baseMinutes)
  const delta = actualTempC - referenceTempC
  const factor = factorForDelta(delta, factors)
  return Math.max(0.25, Math.round(safeBase * factor * 100) / 100)
}

export function getCompensationAdvice(
  baseMinutes: number,
  actualTempC: number,
  referenceTempC = 20,
  factors: CompensationFactors = DEFAULT_COMPENSATION
): CompensationAdvice {
  const delta = Math.round((actualTempC - referenceTempC) * 10) / 10
  const minutes = calculateCompensatedMinutes(baseMinutes, actualTempC, referenceTempC, factors)
  const factor = factorForDelta(delta, factors)
  const direction = delta > 0 ? '缩短' : delta < 0 ? '延长' : '维持'
  const advice = delta === 0
    ? '实测温度等于配方基准，按原时间执行'
    : `实测温度${delta > 0 ? '偏高' : '偏低'} ${Math.abs(delta).toFixed(1)}°C，建议${direction}至 ${minutes.toFixed(2)} 分钟`
  return { minutes, factor: Math.round(factor * 1000) / 1000, delta, advice }
}

export function useTempCompensate(
  referenceTempC: Ref<number> = ref(20),
  factors: Ref<CompensationFactors> = ref({ ...DEFAULT_COMPENSATION })
) {
  const actualTempC = ref(referenceTempC.value)
  const advice = computed(() => getCompensationAdvice(10, actualTempC.value, referenceTempC.value, factors.value))

  function compensate(baseMinutes: number, tempC = actualTempC.value): number {
    return calculateCompensatedMinutes(baseMinutes, tempC, referenceTempC.value, factors.value)
  }

  function suggest(baseMinutes: number, tempC = actualTempC.value): CompensationAdvice {
    return getCompensationAdvice(baseMinutes, tempC, referenceTempC.value, factors.value)
  }

  return { referenceTempC, factors, actualTempC, advice, compensate, suggest }
}
