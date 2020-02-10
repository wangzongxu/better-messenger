export type Self = Window
export type MessageType = string
export type Noop = () => void
export type MessageEventListener = (e: MessageEvent) => void
export type MessageListener = Noop | MessageEventListener
export type TaskId = number
export type ObjMap<K, V> = { [K: number]: V }
