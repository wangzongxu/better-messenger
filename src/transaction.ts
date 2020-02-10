import { TaskId } from './types/index'

let uid = 0

enum STATUS {
  success = 'success',
  failure = 'failure'
}

enum TRANS_TYPE {
  request = 'transaction_request',
  response = 'transaction_response',
}

abstract class Transaction {
  protected constructor (
    public _transType: TRANS_TYPE,
    public _id: TaskId = uid++,
    public type: string,
    public data: any = null
  ) {
    this._id = _id
    this.type = type
    this.data = data
    this._transType = _transType
  }
}

interface RequestOption {
  type?: string,
  data?: any,
  id?: number,
}

class Request extends Transaction {
  constructor ({ type, data, id }: RequestOption) {
    super(TRANS_TYPE.request, id, <string>type, data)
  }

  static isRequest (req: any) {
    return req._transType === TRANS_TYPE.request
  }
}

interface ResponseOptions extends RequestOption {
  status?: STATUS,
}

class Response extends Transaction {
  status: STATUS

  constructor ({ type, data, id, status }: ResponseOptions) {
    super(TRANS_TYPE.response, id, <string>type, data)
    this.status = status ?? STATUS.success
  }

  static isResponse (res: any) {
    return res._transType === TRANS_TYPE.response
  }
}

class Task {
  constructor (
    public req: Request,
    public res: Response | null,
    public resolve: (res: Response) => void,
    public reject: (reason: any) => void
  ) {
    this.req = req
    this.res = res
    this.resolve = resolve
    this.reject = reject
  }
}

export {
  STATUS,
  Task,
  Request,
  Response
}
