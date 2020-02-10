import { MessageType } from './types/index'

export const WILDCARD = '*'
export const HAND_SHAKE = '__HAND_SHAKE__'

export function isInternalType (type: MessageType) {
  return [
    HAND_SHAKE
  ].indexOf(type) > -1
}

export function isNative (fn: Function): boolean {
  return /\[native code\]/.test(fn.toString())
}

export function delay (timeout: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

export function filter<T> (
  arr: T[],
  match: (item: T) => boolean
) {
  const result: T[] = []
  return arr.reduce((result, item) => {
    if (match(item)) result.push(item)
    return result
  }, result)
}

export function noop () {}

export function warn (...log: any[]) {
  if (process.env.NODE_ENV === 'development') {
    const print = console.warn ?? console.log
    print(...log)
  }
}
