# betterMessenger

🤗为基于iframe的微前端提供更好通信方式的工具。

## 🤔Motivation

iframe作为微前端解决方案之一，其实现方式在于一个页面中嵌入多个iframe业务模块，
但是各个模块之间势必会有通信，以往我们使用```postMessage```来传递消息，如果一个消息我们需要对方模块响应，
可能是这样的：

```js
// user-info.js
const userId = 1
iframe.contentWindow.postMessage({
  type: 'GET_USER_NAME',
  id: userId
}, '*')

window.addEventListener('message', function(e) {
  if (e.data.type === 'RESPONSE_USER_NAME') {
    console.log('获取到用户名：', e.data.name)
  }
})

// user-name.js
window.addEventListener('message', function(e) {
  if (e.data.type === 'GET_USER_NAME') {
    const userName = getUserName(e.data.id)
    e.source.postMessage({
      type: 'RESPONSE_USER_NAME',
      name: userName
    }, '*')
  }
})
```

可以看到在```main```页面，发送消息和接收消息的代码是分开的，上边只有一个消息类型，所以发送和接收可以写到一个文件中，
但是应用变得复杂，消息类型也会随之增加，这时候就要将接收文件单独存放：

```js
// listen-message.js
import { handleUserName } from 'user-name.js'
import { handleAge } from 'user-age.js'
import { handleAvatar } from 'user-avatar.js'

window.addEventListener('message', function(e) {
  const data = e.data
  switch (e.data.type) {
    case 'GET_USER_NAME':
      handleUserName(data)
      break
    case 'GET_USER_AGE':
      handleUserAge(data)
      break
    case 'GET_USER_AVATAR':
      handleUserAvatar(data)
      break
  }
})
```

可以看到当消息类型变多之后```lesson-message.js```文件会越来越大，难以维护。
并且我们并不知道对方什么时候传来消息，假如对方错误地发送多次，则会导致我们多次调用方法，从而出现问题。

## 📦Install

```bash
npm install -S better-messenger
```

## 🌈Usage

使用```betterMessage```可以把发送和接收写到一起，并且每次请求只有一个对应的响应，就像接口请求一样：

```js
// user-name.js
import { Client } from 'better-messenger.js'

const client = new Client(iframe.contentWindow, '*')
const userId = 1

client.request('GET_USER_NAME', userId)
  .then(res => {
    console.log('获取到用户名：', res.data)
  }).catch(err => {
    console.log('获取失败：', err)
  })


// user-info.js
import { Server } from 'better-messenger.js'

const server = new Server()

server.listen('GET_USER_NAME', function(req, res) {
  const userName = getUserName(req.data)

  // 响应消息
  if (userName) {
    res.response(true, userName)
  } else {
    res.response(false, '未找到该用户')
  }
})
```
## 📖Options

- Client

option | description | type
--|--|--
self | 指定用于监听```message```事件的对象，默认为```self``` | ```interface { postMessage(): void }```
timeout | 超过指定时间后没有响应，则认为消息发送失败，默认时间```5000```(ms) | number
requestInterceptor | 拦截并处理请求 | ```(req: Request) => Request```
responseInterceptor | 拦截并处理响应 | ```(res: Response) => Response```

- Server

option | description | type
--|--|--
self | 指定用于监听```message```事件的对象，默认为```self``` | ```interface { postMessage(): void }```
errorHandler | 统一错误处理 | ```(err: any, req: Request, res: ResponseParam) => void```
