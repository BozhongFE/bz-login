import ObjectAssign from 'object-assign';

Object.assign = ObjectAssign;

const appReg = /bz-([A-Za-z]{1,50})-(android|ios)/;
const config = {
  options: {
    type: 1, // 账户系统类别，1：播种网帐号，2：灵灵帐号
    debug: false, // 是否开启 debug 模式
    debugType: 1, // 1: console.log, 2: alert
  },
};

function getLink(prefix, productPrefix) {
  const host = window.location.host;
  const prodPrefix = productPrefix || prefix;

  if (host.indexOf('office') !== -1) {
    return `//${prefix}.office.bzdev.net`;
  } else if (host.indexOf('online') !== -1) {
    return `//${prefix}.online.seedit.cc`;
  }
  return `//${prodPrefix}.bozhong.com`;
}

const jsonp = (options, callback) => {
  const opts = Object.assign(
    {
      params: {},
      url: '',
      prefix: 'callback',
    },
    options
  );

  const callbackName = `jsonp_${Date.now()}`;
  const headEl = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  const url = opts.url;
  const symbol = url.indexOf('?') !== -1 ? '&' : '?';
  let scriptUrl = `${opts.url + symbol + opts.prefix}=${callbackName}`;

  const params = [];
  Object.keys(opts.params).forEach((key) => {
    const item = `${key}=${encodeURIComponent(opts.params[key])}`;
    params.push(item);
  });

  if (params.length > 0) {
    scriptUrl += `&${params.join('&')}`;
  }

  script.src = scriptUrl;
  headEl.appendChild(script);

  window[callbackName] = function success(json) {
    typeof callback === 'function' && callback(json);
    headEl.removeChild(script);
    window[callbackName] = null;
  };
};

function setOptions(options) {
  config.options = options
    ? Object.assign({}, config.options, options)
    : config.options;
}

function getOptions() {
  return config.options;
}

function logger() {
  const opts = getOptions();
  let fn = () => {};
  if (opts.debug) {
    if (opts.debugType === 2) {
      fn = (str) => {
        window.alert(str);
      };
    } else {
      fn = (str) => {
        console.log(str);
      };
    }
  }
  return fn;
}

function ua() {
  return window.navigator.userAgent;
}

function isApp() {
  return appReg.test(ua());
}

function isAndroidApp() {
  const androidReg = /bz-([A-Za-z]{1,50})-android/;
  return androidReg.test(ua());
}

function isIosApp() {
  const iosReg = /bz-([A-Za-z]{1,50})-ios/;
  return iosReg.test(ua());
}

function isWx() {
  const wxReg = /micromessenger/i;
  return wxReg.test(ua());
}

// 返回登录页面链接
function webLoginLink(url) {
  const link = url || window.location.href;
  return `${getLink('account')}/?redirect_uri=${encodeURIComponent(link)}`;
}

function token2Cookie(token, callback) {
  const log = logger();
  const matched = ua().match(appReg);
  const mark = matched ? matched[1] : ''; // APP 标识
  const accountAPI = getLink('account');
  const opts = getOptions();
  const sendData = {
    access_token: token,
  };
  let tokenUrl;

  if (typeof token === 'undefined' || token === null) {
    log('没有获取到 token');
    return;
  }

  log('token 换 cookie');

  if (opts.type === 2) {
    tokenUrl = `${accountAPI}/restful/app/tokentocookie.jsonp`;
    sendData.__p = mark;
  } else {
    tokenUrl = `${accountAPI}/restful/bozhong/tokentocookie.jsonp`;
  }

  jsonp(
    {
      url: tokenUrl,
      params: sendData,
      prefix: '__c',
    },
    (data) => {
      if (data.error_code === 0) {
        log('换 cookie 成功，执行回调');
        typeof callback !== 'undefined' && callback(data);
      } else {
        log(`换 cookie 失败，错误信息： ${data.error_message}`);
        window.location.href = webLoginLink();
      }
    }
  );
}

function getAppToken(init) {
  const log = logger();
  let token;

  if (isAndroidApp()) {
    log('Android APP，获取 token');

    try {
      if (typeof window.Crazy !== 'undefined') {
        token = window.Crazy.getBZToken();
      } else {
        token = window.bzinner.getBZToken();
      }
    } catch (error) {
      log(`err: ${error}`);
    }

    log(`token: ${token}`);
    token2Cookie(token, init);
  } else if (isIosApp()) {
    log('iOS APP，获取 token');

    try {
      window.webkit.messageHandlers.getBZToken.postMessage(null);
    } catch (error) {
      log(`err: ${error}`);
    }

    window.getBZTokenResult = function fn(accessToken) {
      log(`token: ${accessToken}`);
      token2Cookie(accessToken, init);
    };
  } else {
    // 非 APP 直接跳转 Web 登录
    window.location.href = webLoginLink();
  }
}

function getToken(callback, options, type) {
  setOptions(options);
  const log = logger();
  let token;
  if (isAndroidApp()) {
    log('Android APP，获取 token');
    try {
      if (typeof window.bzinner !== 'undefined') {
        token = window.bzinner.getBZToken();
      } else if (typeof window.Crazy !== 'undefined') {
        token = window.Crazy.getBZToken();
      } else {
        token = window[type].getBZToken();
      }
    } catch (error) {
      log(`err: ${error}`);
    }
    callback(token);
  } else if (isIosApp()) {
    log('IOS APP，获取 token');
    try {
      window.webkit.messageHandlers.getBZToken.postMessage(null);
    } catch (error) {
      log(`err: ${error}`);
    }
    window.getBZTokenResult = function fn(accessToken) {
      log(`token: ${accessToken}`);
      callback(accessToken);
    };
  } else {
    callback('非客户端，获取不到token');
  }
}

// 根据 cookie 判断是否已经登录
function hasLogin() {
  const cookie = document.cookie;
  const opts = getOptions();

  if (opts.type === 2) {
    return /seedit_app_auth/.test(cookie);
  }
  return /seedit_auth/.test(cookie);
}

// 所有页面都强制登录
function afterAllLogin(callback, options) {
  setOptions(options);
  const log = logger();

  if (!isApp()) {
    log('不是 APP');
    if (hasLogin()) {
      log('有 cookie，直接执行回调');
      typeof callback !== 'undefined' && callback();
    } else {
      log('没 cookie，跳转到登录页面');
      window.location.href = webLoginLink();
    }
  } else {
    log('APP 内');
    getAppToken(callback);
  }
}

// APP 内强制登录，APP 外不要求登录
function afterAppLogin(callback, options) {
  setOptions(options);
  const log = logger();

  if (!isApp()) {
    log('不是 APP，直接执行回调');
    typeof callback !== 'undefined' && callback();
  } else {
    log('APP 内');
    getAppToken(callback);
  }
}

export default {
  afterAppLogin,
  afterAllLogin,
  isApp,
  isAndroidApp,
  isIosApp,
  isWx,
  getLink,
  hasLogin,
  getToken,
};
