const appReg = /bz-([A-Za-z]{1,50})-(android|ios)/;
const config = {
  options: {
    type: 1, // 账户系统类别，1：播种网帐号，2：灵灵帐号
    debug: false, // 是否开启 debug 模式
    debugType: 1, // 1: console.log, 2: alert 
  },
};

// 检查 jQuery 或 Zepto 是否存在
function checkLib() {
  if (typeof $ === 'undefined') {
    window.alert('请先加载 jQuery 或 Zepto');
    return false;
  }
  return true;
}

checkLib();

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

function setOptions(options) {
  config.options = options ? $.extend({}, config.options, options) : config.options;
}

function getOptions() {
  return config.options;
}

function logger() {
  const opts = getOptions();
  let fn = () => {};
  if (opts.debug) {
    if (opts.debugType === 2) {
      fn = (str) => { window.alert(str); };
    } else {
      fn = (str) => { console.log(str); };
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

  $.ajax({
    type: 'GET',
    url: tokenUrl,
    dataType: 'jsonp',
    jsonp: '__c',
    data: sendData,
    success(data) {
      if (data.error_code === 0) {
        log('换 cookie 成功，执行回调');
        typeof callback !== 'undefined' && callback();
      } else {
        log(`换 cookie 失败，错误信息： ${data.error_message}`);
        window.location.href = webLoginLink();
      }
    },
    error() {
      log('tokentocookie 接口请求错误');
    },
  });
}

function getToken(init) {
  const log = logger();
  let token;

  if (isAndroidApp()) {
    log('Android APP，获取 token');

    try {
      token = window.Crazy.getBZToken();
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
  } else { // 非 APP 直接跳转 Web 登录
    window.location.href = webLoginLink();
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
    getToken(callback);
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
    getToken(callback);
  }
}

export default {
  afterAppLogin,
  afterAllLogin,
  isApp,
  isAndroidApp,
  isIosApp,
  getLink,
};
