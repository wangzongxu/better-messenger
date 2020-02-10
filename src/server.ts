import ResponseParam from './response-param'
import { Request } from './transaction'
import { Self, MessageType, MessageListener } from './types/index'
import { HAND_SHAKE, WILDCARD, noop, filter, isInternalType, isNative } from './utils'

enum STATE {
  open,
  closed
}

type Next = (error?: any) => Promise<any>
type HandlerFn = (req: Request, res: ResponseParam, next: Next) => Promise<any>
type ErrorHandler = (err: any, req: Request, res: ResponseParam) => void

class Handler {
  constructor (
    public type: MessageType,
    public fn: HandlerFn
  ) {
    this.type = type
    this.fn = fn
  }
}

interface ServerOption {
  self?: Self,
  errorHandler?: ErrorHandler
}

const defaultErrorHandler: ErrorHandler = (err, req, res) => {
  if (!res.sent) {
    res.response(false, err)
  }
}

export default class Server {
  self: Self
  state: STATE
  handlers: Handler[]
  errorHandler: ErrorHandler

  private _msgListener: MessageListener

  static OPEN = STATE.open
  static CLOSED = STATE.closed

  constructor (option: ServerOption = {}) {
    this.self = option.self ?? self
    this.errorHandler = option.errorHandler ?? defaultErrorHandler
    this.state = STATE.closed
    this.handlers = []
    this._msgListener = noop

    if (!isNative(this.self.postMessage)) {
      throw new TypeError('The first parameter must contain native `postMessage` method')
    }

    this.open()
    this._listenInternalType()
  }

  /**
   * 开启Server
   */
  open () {
    if (this.state === STATE.open) {
      return
    }

    this._msgListener = this._receiver.bind(this)
    this.self.addEventListener('message', this._msgListener)
    this.state = STATE.open
  }

  /**
   * 关闭Server
   */
  close () {
    if (this.state === STATE.closed) {
      return
    }

    this.self.removeEventListener('message', this._msgListener)
    this._msgListener = noop
    this.state = STATE.closed
  }

  /**
   * 监听事件
   * @param type 事件类型
   * @param handler 处理器
   */
  listen (type: MessageType, handler?: HandlerFn) {
    if (handler) {
      this.handlers.push(new Handler(type, handler))
    } else if (typeof type === 'function') {
      this.handlers.push(new Handler(WILDCARD, type))
    }
  }

  /**
   * 监听事件监听
   * @param type 事件类型
   * @param handler? 处理器
   */
  cancel (type: MessageType, handler?: HandlerFn) {
    if (typeof type === 'function') {
      handler = type
      type = WILDCARD
    }

    if (type) {
      this.handlers = handler
        ? filter(this.handlers, item => item.fn !== handler)
        : filter(this.handlers, item => item.type !== type)
    }
  }

  /**
   * 接收消息
   */
  async _receiver (e: MessageEvent) {
    if (!Request.isRequest(e.data)) return

    const { type, data, _id } = e.data
    const req = new Request({ type, data, id: _id })
    const res = new ResponseParam(req, e)

    const handlers = filter(this.handlers, (item) => (
      isInternalType(type)
        ? item.type === type
        : item.type === type || item.type === WILDCARD
    ))

    let index = 0
    const next = async (error?: any) => {
      if (typeof error !== 'undefined') {
        this.errorHandler(error, req, res)
        return
      }

      const handler = handlers[index++]
      if (handler) {
        try {
          return await handler.fn(req, res, next)
        } catch (e) {
          this.errorHandler(e, req, res)
        }
      }
    }
    next()
  }

  /**
   * 监听内部事件
   */
  _listenInternalType () {
    this.listen(HAND_SHAKE, async (data, res) => {
      res.response(true, null)
    })
  }
}
