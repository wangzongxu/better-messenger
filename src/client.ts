import { Request, Response, STATUS, Task } from './transaction'
import { HAND_SHAKE, delay, isNative, noop, isInternalType, warn } from './utils'
import { Self, TaskId, MessageType, ObjMap, MessageListener } from './types/index'

enum STATE {
  notConnected,
  connecting,
  connected,
  closed,
}

type RequestInterceptor = (req: Request) => Request
type ResponseInterceptor = (data: Response) => Response

const defaultRequestInterceptor: RequestInterceptor = r => r
const defaultResponseInterceptor: ResponseInterceptor = r => r

interface ClientOption {
  self?: Self
  timeout?: number
  requestInterceptor?: RequestInterceptor
  responseInterceptor?: ResponseInterceptor
}

export default class Client {
  target: Self
  origin: string
  self: Self
  timeout: number
  requestInterceptor: RequestInterceptor
  responseInterceptor: ResponseInterceptor
  state: STATE
  tasks: ObjMap<TaskId, Task>

  private _msgListener: MessageListener
  private _connector: null | Promise<any>

  static NOT_CONNECTED = STATE.notConnected
  static CONNECTING = STATE.connecting
  static CONNECTED = STATE.connected
  static CLOSED = STATE.closed

  constructor (
    target: Self,
    origin: string = '*',
    option: ClientOption = {}
  ) {
    if (!isNative(target.postMessage)) {
      throw new TypeError('The first parameter must contain native `postMessage` method')
    }

    this.tasks = Object.create(null)
    this.state = STATE.closed
    this.target = target
    this.origin = origin
    this.self = option.self ?? self
    this.timeout = option.timeout ?? 5000
    this.requestInterceptor = option.requestInterceptor ?? defaultRequestInterceptor
    this.responseInterceptor = option.responseInterceptor ?? defaultResponseInterceptor
    this._msgListener = noop
    this._connector = null

    this.open()
  }

  /**
   * 连接Server
   * @return Promise 连接是否成功
   */
  async connect () {
    if (this.state === STATE.closed) {
      return Promise.reject('The client is closed and needs to be reopened')
    }

    if (this.state === STATE.notConnected) {
      this.state = STATE.connecting
      this._connector = new Promise((resolve, reject) => {
        const onConnected = () => {
          this.state = STATE.connected
          resolve()
        }

        const onError = (error: any) => {
          this.state = STATE.notConnected
          reject(error)
        }

        const request = new Request({ type: HAND_SHAKE })
        this._requestRetry(request)
          .then(onConnected, onError)
      })
    }

    return this._connector
  }

  /**
   * 发起请求
   * @param type 消息标识
   * @param data 发送数据
   * @return Promise 响应结果
   */
  async request (type: MessageType, data: any) {
    if (this.state === STATE.closed) {
      return Promise.reject('The client is closed and needs to be reopened')
    }

    if (typeof type !== 'string') {
      throw new TypeError('type must be a string')
    }

    if (this.state === STATE.notConnected) {
      await this.connect()
    }

    if (this.state === STATE.connecting) {
      await this._connector
    }

    const req = new Request({ type, data })
    return this._request(req)
  }

  /**
   * 开启Client
   */
  open () {
    if (this.state !== STATE.closed) {
      return
    }

    this.state = STATE.notConnected
    this._msgListener = this._receiver.bind(this)
    this.self.addEventListener('message', this._msgListener)
  }

  /**
   * 关闭Client
   */
  close () {
    if (this.state === STATE.closed) {
      return
    }

    this.self.removeEventListener('message', this._msgListener)
    this._msgListener = noop
    this._connector = null
    this.state = STATE.closed
    this.tasks = Object.create(null)
  }

  /**
   * 移除任务
   * @param id
   */
  removeTask (id: TaskId) {
    delete this.tasks[id]
  }

  /**
   * 接收响应
   */
  private async _receiver (e: MessageEvent) {
    if (!Response.isResponse(e.data)) return

    const { type, _id } = e.data
    const task = this.tasks[_id]

    if (!task) return

    let res = new Response(e.data)
    if (!isInternalType(type)) {
      try {
        res = (await this.responseInterceptor(res)) ?? res
      } catch (e) {
        return task.reject(e)
      }
    }

    if (!Response.isResponse(res)) {
      warn('The return value of responseInterceptor must be a valid response')
      return task.reject(res)
    }

    task.res = res
    if (res.status === STATUS.success) {
      task.resolve(res)
    } else {
      task.reject(res)
    }
  }

  /**
   * 发起请求
   * @param req 请求体
   * @param timeout 超时时间
   * @return Promise 响应结果
   */
  private async _request (req: Request, timeout = this.timeout) {
    if (!isInternalType(req.type)) {
      req = (await this.requestInterceptor(req)) ?? req
    }

    if (!Request.isRequest(req)) {
      warn('The return value of requestInterceptor must be a valid request')
      return Promise.reject(req)
    }

    return new Promise((fulfilled, rejected) => {
      const timer = setTimeout(() => {
        reject('timeout')
      }, timeout)

      const cleanup = () => {
        this.removeTask(req._id)
        clearTimeout(timer)
      }

      const resolve = (res: Response) => {
        fulfilled(res)
        cleanup()
      }

      const reject = (reason: any) => {
        rejected(reason)
        cleanup()
      }

      this.target.postMessage(req, this.origin)
      this.tasks[req._id] = new Task(req, null, resolve, reject)
    })
  }

  /**
   * 请求重试
   * @param req 请求体
   * @param timeout 超时时间
   * @param count 重试次数
   * @param interval 重试间隔
   * @return Promise 响应结果
   */
  private async _requestRetry (
    req: Request,
    timeout = 300,
    count: number = 5,
    interval = 300
  ) {
    for (let i = 0; i < count; i++) {
      const time = i * interval

      // 大于0是才进行异步延迟
      if (time > 0) {
        await delay(time)
      }

      try {
        return await this._request(req, timeout)
      } catch (e) {
        // 只取最后一次的失败原因
        if (i === count - 1) {
          return Promise.reject(e)
        }
      }
    }
  }
}
