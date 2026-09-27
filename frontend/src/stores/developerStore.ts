import { defineStore } from 'pinia'
import { db, plain } from '../utils/db'
import type { Developer } from '../types/developer'
import { remainingRolls } from '../utils/ratio'
import { isValidFactor } from '../hooks/useTempCompensate'

type NewDeveloper = Omit<Developer, 'id' | 'schemaRev'>

export const useDeveloperStore = defineStore('developer', {
  state: () => ({
    developers: [] as Developer[],
    loading: false
  }),
  getters: {
    activeDevelopers: (state) => state.developers.filter((developer) => developer.state !== '报废'),
    availableRolls(): number {
      return this.activeDevelopers.reduce(
        (sum, developer) => sum + remainingRolls(developer.maxRolls, developer.usedRolls),
        0
      )
    },
    developerById: (state) => (id?: number) =>
      id === undefined ? undefined : state.developers.find((developer) => developer.id === id)
  },
  actions: {
    async load(): Promise<void> {
      this.loading = true
      try {
        this.developers = await db.developers.orderBy('id').reverse().toArray()
      } finally {
        this.loading = false
      }
    },
    async addDeveloper(payload: NewDeveloper): Promise<number> {
      if (payload.warmFactor !== undefined && !isValidFactor(payload.warmFactor)) {
        throw new Error('升温系数必须是大于 0 的数字')
      }
      if (payload.coolFactor !== undefined && !isValidFactor(payload.coolFactor)) {
        throw new Error('降温系数必须是大于 0 的数字')
      }
      const next = { ...payload, schemaRev: 3 }
      const id = await db.developers.add(plain(next))
      await this.load()
      return id
    },
    async incrementUsed(id: number): Promise<void> {
      const developer = await db.developers.get(id)
      if (!developer) return
      const usedRolls = developer.usedRolls + 1
      await db.developers.update(id, plain({ usedRolls }))
      await this.load()
    },
    async scrap(id: number): Promise<void> {
      await db.developers.update(id, plain({ state: '报废' }))
      await this.load()
    }
  }
})
