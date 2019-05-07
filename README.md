# bz-login
播种网登录模块

## 打包

```shell
npm run build
```

## 安装
```shell
npm install https://github.com/BozhongFE/bz-login#v0.2.1
```

## 接口

### afterAllLogin(callback[, options])

在所有浏览器访问页面时强制登录，登录完成才执行回调。

**Arguments**

- `callback` (Function)：登录后的回调函数
- `options` (Object)
  - `type` (number)：APP 帐号系统类别，1 为播种网帐号系统，2 为灵灵帐号系统。**Default:** 1 
  - `debug` (boolean)：是否开启 debug 模式。**Default:** false
  - `debugType` (number)：debug 模式输出信息的方式，1 为 `console.log`， 2 为 `alert`。**Default:** 1

**Example**

```javascript
var bzLogin = require('bz-login');
bzLogin.afterAllLogin(function () {
  console.log('登录成功');
}, {
  type: 1,
  debug: true,
  debugType: 1
});
```

### afterAppLogin(callback[, options])
参数同 `afterAllLogin`。  
在 APP 内访问页面时强制登录并在登录后执行回调。  
在非 APP 浏览器访问时，不做处理，直接执行回调。

### isApp() 
判断是否是播种网出品的 APP

### isAndroidApp()
判断是否是播种网出品的 APP 的 Android 版本

### isIosApp()
判断是否是播种网出品的 APP 的 iOS 版本

### isWx()
判断是否是微信内


### hasLogin()
通过 cookie 判断用户是否登录

### getLink(prefix[, productPrefix])

根据访问页面链接，获取对应环境的子域名。

**Arguments**

- `prefix` (string)：域名前缀
- `productPrefix` (string)：线上域名前缀，线上环境与测试环境域名不同的时候可用

**Returns**

  (string)：返回一个子域名

**Example**

```javascript
var link = bzLogin.getLink('api', 'prod-api');
// 线上环境的 link： prod-api.bozhong.com
// office 和 online 环境的 link： api.office.bzdev.net 和 api.online.seedit.cc
```
