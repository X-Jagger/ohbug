# Ohbug

> 前端监控客户端

## 简介

通过监听/主动捕获 `error` 以及性能信息，获取相关信息后执行特定操作(数据上传记录等)。

## 功能

### 错误捕获

可捕获的异常类型包括：

1. JavaScript执行错误
2. 资源加载错误
3. HTTP请求错误
4. 未catch处理的Promise错误

### 错误上报

上报流程可自定义，目前分为立即上报和页面卸载前上报，未来将支持 Vue、React 路由跳转后上报。

### 性能监控

todo...

## Todo
- [ ] 捕获websocket错误
- [ ] 设置采集率
- [ ] sourcemap定位压缩代码具体错误位置
- [ ] Vue、React 增加路由跳转后上报信息
- [ ] 页面性能监控
- [ ] 页面HTTP请求性能监控
- [ ] 页面资源加载性能监控

## 原理

- 通过 `window.addEventListener`，可捕获 `JavaScript` 执行错误，资源加载错误，未catch处理的Promise错误
- 通过改写 `XMLHttpRequest` / `fetch` 实现监听 `HTTP` 请求错误

## 使用

#### script mode

```html
<script src="./ohbug.js"></script>

<script>
  Ohbug.init({
    report(errorList) {
      // 上传错误至服务端
    }
  })
</script>
```

#### module mode

1.安装

```sh
npm install ohbug --save
```
如果想用 `yarn`
```sh
yarn add ohbug
```

2.在文件中添加

```javascript
import Ohbug from 'ohbug'

Ohbug.init({
  report(errorList) {
    // 上传错误至服务端
  }
})
```

## 主动捕获上报

针对一些特殊需求的错误 使用主动捕获(使用装饰器)

例如在 `react` 中

```javascript
import { caughtError } from 'ohbug';

class Test extends React.Component {
  @caughtError // success
  send() {
    // ...
  }
}
```

请注意箭头函数使用 `caughtError` 捕获不到错误信息，例如

```javascript
import { caughtError } from 'ohbug';

class Test extends React.Component {
  @caughtError // fail
  send = () => {
    // ...
  }
}
```

针对一些不能使用装饰器或自定义信息使用 `reportError`

```javascript
import { reportError } from 'ohbug';

class Test extends React.Component {
  send() {
    try {
      // ...
    } catch(e) {
      reportError(e)
    }
  }
}
```

```javascript
import { reportError } from 'ohbug';

class Test extends React.Component {
  hello() {
    reportError('hello')
  }
}
```

## 配置

使用方式
```javascript
const others = {
  id: window.sessionStorage.getItem('XXX_ID'),
  nick: window.sessionStorage.getItem('XXX_NICK'),
};
function report(data) {
  ajax('url', JSON.stringify(data))
}
Ohbug.init({
  report,
  others,
});
```

| key | description | type | default |
| :------: | :------: | :------: | :------: |
| report | 上传错误函数 | function | null |
| others | 自定义信息 | object | null |
| enabledDev | 开发环境下上传错误 (目前是判断当前 url 中是否含有 `127.0.0.1` / `localhost` 确定是否为本地) | boolean | false |
| maxError | 发送日志请求连续出错的最大次数 超过则不再发送请求 | number | 10 | 
| mode | 短信发送模式 ('immediately': 立即发送 'beforeunload': 页面注销前发送) | string | 'immediately' |
| delay | 错误处理间隔时间 | number | 2000 |
| ignore | 忽略指定错误 目前只支持忽略 HTTP 请求错误 | array | [] |

## 注意

### `mode` 属性
设置为 `immediately` 时，`delay` 时间内发生的错误将会统一收集并上报

设置为 `beforeunload` 时，会在卸载当前页面时上报，可能存在用户关闭或切换页面导致漏报问题。

常见的解决方案为发送同步 `ajax` 请求(会导致页面卡顿) 或 使用 `navigator.sendBeacon()` 异步上报(不支持 GET)，两种情况都存在弊端 实际生产环境视情况而定。
```javascript
function report(data) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/log", false); // false 表示同步
  xhr.send(data);
}
Ohbug.init({
  report,
});
```
```javascript
function report(data) {
  navigator.sendBeacon("/log", data); // 默认发送 POST 请求
}
Ohbug.init({
  report,
});
```

### `ignore` 属性
Ohbug 在捕获错误时会忽略 `ignore` 数组内的 url。

使用场景: 
1. 可能频繁出错或不需上报的api。
2. 由于上报请求完全自定义，一旦上报请求发生错误，Ohbug无法判断错误来源，会导致无限循环上报，此时将上报的 url 添加入 `ignore` 数组内，忽略上报请求的错误。

## 错误类型

| type | description |
| :------: | :------: |
| caughtError | 调用 caughtError 装饰器主动捕获的错误 |
| uncaughtError | 意料之外的错误 |
| resourceError | 资源加载错误 |
| grammarError | 语法错误 |
| promiseError | promise 错误 |
| ajaxError | ajax 错误 |
| fetchError | fetch 错误 |
| reportError | 主动上报的错误 |
