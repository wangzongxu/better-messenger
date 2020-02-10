import { warn } from './utils'
import { Request, Response, STATUS } from './transaction'

export default class ResponseParam {
  sent: boolean

  constructor (
    private readonly _request: Request,
    public event: MessageEvent
  ) {
    this._request = _request
    this.sent = false
    this.event = event
  }

  /**
   * 响应客户端消息
   * @param isSuccess 是否成功标识
   * @param data 相应数据
   */
  response (isSuccess: boolean, data: any) {
    if (this.sent) {
      warn('The request has been answered')
      return
    }
    if (this.event.source) {
      const { type, _id } = this._request
      const status = isSuccess ? STATUS.success : STATUS.failure
      const res = new Response({ type, data, id: _id, status })

      // @ts-ignore
      this.event.source.postMessage(res, '*')
      this.sent = true
    }
  }
}
