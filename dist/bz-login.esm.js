import ObjectAssign from 'object-assign';

Object.assign = ObjectAssign;

var appReg = /bz-([A-Za-z]{1,50})-(android|ios)/;
var config = {
  options: {
    type: 1, // 账户系统类别，1：播种网帐号，2：灵灵帐号
    debug: false, // 是否开启 debug 模式
    debugType: 1, // 1: console.log, 2: alert
  },
};

function getLink(prefix, productPrefix) {
  var host = window.location.host;
  var prodPrefix = productPrefix || prefix;

  if (host.indexOf('office') !== -1) {
    return ("//" + prefix + ".office.bzdev.net");
  } else if (host.indexOf('online') !== -1) {
    return ("//" + prefix + ".online.seedit.cc");
  }
  return ("//" + prodPrefix + ".bozhong.com");
}

var jsonp = function (options, callback) {
  var opts = Object.assign({
    params: {},
    url: '',
    prefix: 'callback',
  }, options);

  var callbackName = "jsonp_" + (Date.now());
  var headEl = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  var url = opts.url;
  var symbol = url.indexOf('?') !== -1 ? '&' : '?';
  var scriptUrl = (opts.url + symbol + opts.prefix) + "=" + callbackName;

  var params = [];
  Object.keys(opts.params).forEach(function (key) {
    var item = key + "=" + (encodeURIComponent(opts.params[key]));
    params.push(item);
  });

  if (params.length > 0) {
    scriptUrl += "&" + (params.join('&'));
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
  config.options = options ? Object.assign({}, config.options, options) : config.options;
}

function getOptions() {
  return config.options;
}

function logger() {
  var opts = getOptions();
  var fn = function () {};
  if (opts.debug) {
    if (opts.debugType === 2) {
      fn = function (str) { window.alert(str); };
    } else {
      fn = function (str) { console.log(str); };
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
  var androidReg = /bz-([A-Za-z]{1,50})-android/;
  return androidReg.test(ua());
}

function isIosApp() {
  var iosReg = /bz-([A-Za-z]{1,50})-ios/;
  return iosReg.test(ua());
}

function isWx() {
  var wxReg = /micromessenger/i;
  return wxReg.test(ua());
}

// 返回登录页面链接
function webLoginLink(url) {
  var link = url || window.location.href;
  return ((getLink('account')) + "/?redirect_uri=" + (encodeURIComponent(link)));
}

function token2Cookie(token, callback) {
  var log = logger();
  var matched = ua().match(appReg);
  var mark = matched ? matched[1] : ''; // APP 标识
  var accountAPI = getLink('account');
  var opts = getOptions();
  var sendData = {
    access_token: token,
  };
  var tokenUrl;

  if (typeof token === 'undefined' || token === null) {
    log('没有获取到 token');
    return;
  }

  log('token 换 cookie');

  if (opts.type === 2) {
    tokenUrl = accountAPI + "/restful/app/tokentocookie.jsonp";
    sendData.__p = mark;
  } else {
    tokenUrl = accountAPI + "/restful/bozhong/tokentocookie.jsonp";
  }

  jsonp({
    url: tokenUrl,
    params: sendData,
    prefix: '__c',
  }, function (data) {
    if (data.error_code === 0) {
      log('换 cookie 成功，执行回调');
      typeof callback !== 'undefined' && callback();
    } else {
      log(("换 cookie 失败，错误信息： " + (data.error_message)));
      window.location.href = webLoginLink();
    }
  });
}

function getAppToken(init) {
  var log = logger();
  var token;

  if (isAndroidApp()) {
    log('Android APP，获取 token');

    try {
      if (typeof window.Crazy !== 'undefined') {
        token = window.Crazy.getBZToken();
      } else {
        token = window.bzinner.getBZToken();
      }
    } catch (error) {
      log(("err: " + error));
    }

    log(("token: " + token));
    token2Cookie(token, init);
  } else if (isIosApp()) {
    log('iOS APP，获取 token');

    try {
      window.webkit.messageHandlers.getBZToken.postMessage(null);
    } catch (error) {
      log(("err: " + error));
    }

    window.getBZTokenResult = function fn(accessToken) {
      log(("token: " + accessToken));
      token2Cookie(accessToken, init);
    };
  } else { // 非 APP 直接跳转 Web 登录
    window.location.href = webLoginLink();
  }
}

function getToken(callback, options) {
  setOptions(options);
  var log = logger();
  var token;
  if (isAndroidApp()) {
    log('Android APP，获取 token');
    try {
      if (typeof window.Crazy !== 'undefined') {
        token = window.Crazy.getBZToken();
      } else {
        token = window.bzinner.getBZToken();
      }
    } catch (error) {
      log(("err: " + error));
    }
    callback(token);
  } else if (isIosApp()) {
    log('IOS APP，获取 token');
    try {
      window.webkit.messageHandlers.getBZToken.postMessage(null);
    } catch (error) {
      log(("err: " + error));
    }
    window.getBZTokenResult = function fn(accessToken) {
      log(("token: " + accessToken));
      callback(accessToken);
    };
  } else {
    callback('非客户端，获取不到token');
  }
}

// 根据 cookie 判断是否已经登录
function hasLogin() {
  var cookie = document.cookie;
  var opts = getOptions();

  if (opts.type === 2) {
    return /seedit_app_auth/.test(cookie);
  }
  return /seedit_auth/.test(cookie);
}

// 所有页面都强制登录
function afterAllLogin(callback, options) {
  setOptions(options);
  var log = logger();

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
  var log = logger();

  if (!isApp()) {
    log('不是 APP，直接执行回调');
    typeof callback !== 'undefined' && callback();
  } else {
    log('APP 内');
    getAppToken(callback);
  }
}

var index = {
  afterAppLogin: afterAppLogin,
  afterAllLogin: afterAllLogin,
  isApp: isApp,
  isAndroidApp: isAndroidApp,
  isIosApp: isIosApp,
  isWx: isWx,
  getLink: getLink,
  hasLogin: hasLogin,
  getToken: getToken,
};

export default index;
