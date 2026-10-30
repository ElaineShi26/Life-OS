import { signal } from '@preact/signals'

/** 周计划页当前看的是第几周：0 = 本周，-1 = 上周，1 = 下周 */
export const weekOffset = signal(0)
