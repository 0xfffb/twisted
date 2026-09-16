function joinChars(parts) {
  var out = "";
  var i;
  for (i = 0; i < parts.length; i++) {
    out += parts[i];
  }
  return out;
}

function getHashValue(str, cb) {
  var encoder = new window.TextEncoder();
  var data = encoder.encode(str);
  window.crypto.subtle.digest(joinChars(["S", "H", "A", "-", "2", "5", "6"]), data).then(function (hash) {
    var hashArray = window.Array.from(new window.Uint8Array(hash));
    var hashHex = "";
    var i;
    var byte;
    for (i = 0; i < hashArray.length; i++) {
      byte = hashArray[i];
      hashHex += byte.toString(16).padStart(2, "0");
    }
    cb(hashHex);
  });
}

function getCanvasFingerprint(cb) {
  var canvas = window.document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  ctx.fillText("twisted-fp", 2, 15);
  getHashValue(canvas.toDataURL(), cb);
}

function getWebGLFingerprint() {
  var canvas = window.document.createElement("canvas");
  var gl = canvas.getContext("webgl");
  var vendor = "";
  var renderer = "";
  var extDbg;
  var exts;
  var extStr;
  var i;
  if (gl) {
    extDbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (extDbg) {
      vendor = gl.getParameter(extDbg.UNMASKED_VENDOR_WEBGL);
      renderer = gl.getParameter(extDbg.UNMASKED_RENDERER_WEBGL);
      exts = gl.getSupportedExtensions();
      extStr = "";
      if (exts) {
        for (i = 0; i < exts.length; i++) {
          if (0 < i) {
            extStr += ",";
          }
          extStr += exts[i];
        }
      }
      return vendor + "|" + renderer + "|" + extStr;
    }
  }
  return "";
}

function getGpuFingerprint() {
  var canvas = window.document.createElement("canvas");
  var gl = canvas.getContext("webgl");
  var extDbg;
  var r;
  var r2;
  if (gl) {
    extDbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (extDbg) {
      r = gl.getParameter(extDbg.UNMASKED_RENDERER_WEBGL);
      if (r) {
        return r;
      }
    }
    r2 = gl.getParameter(gl.RENDERER);
    if (r2) {
      return r2;
    }
  }
  return "";
}

function getPluginListFingerprint() {
  var plugins = window.navigator.plugins;
  var s = "";
  var i;
  for (i = 0; i < plugins.length; i++) {
    if (0 < i) {
      s += ",";
    }
    s += plugins[i].name;
  }
  return s;
}

function getFontFingerprint() {
  var canvas = window.document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  var baseW;
  var fonts;
  var fonts2;
  var fonts3;
  var fonts4;
  var fonts5;
  var fonts6;
  var fonts7;
  var fonts8;
  var list;
  var hit;
  var j;
  var fname;
  var w;
  ctx.font = "72px monospace";
  baseW = ctx.measureText("mmmmmmmmmmlli").width;
  fonts = joinChars(["A", "r", "i", "a", "l"]);
  fonts2 = joinChars(["V", "e", "r", "d", "a", "n", "a"]);
  fonts3 = joinChars(["T", "i", "m", "e", "s", " ", "N", "e", "w", " ", "R", "o", "m", "a", "n"]);
  fonts4 = joinChars(["G", "e", "o", "r", "g", "i", "a"]);
  fonts5 = joinChars(["C", "o", "u", "r", "i", "e", "r", " ", "N", "e", "w"]);
  fonts6 = joinChars(["T", "r", "e", "b", "u", "c", "h", "e", "t", " ", "M", "S"]);
  fonts7 = joinChars(["C", "o", "m", "i", "c", " ", "S", "a", "n", "s", " ", "M", "S"]);
  fonts8 = joinChars(["A", "r", "i", "a", "l", " ", "B", "l", "a", "c", "k"]);
  list = [fonts, fonts2, fonts3, fonts4, fonts5, fonts6, fonts7, fonts8];
  hit = "";
  for (j = 0; j < list.length; j++) {
    fname = list[j];
    ctx.font = "72px " + fname + ", monospace";
    w = ctx.measureText("mmmmmmmmmmlli").width;
    if (w !== baseW) {
      if (hit === "") {
        hit = fname;
      } else {
        hit = hit + "," + fname;
      }
    }
  }
  return hit;
}

function getNetFingerprint() {
  var c = window.navigator.connection;
  if (c) {
    return c.effectiveType + "|" + c.downlink + "|" + c.rtt;
  }
  return "";
}

function getFingerprint(cb) {
  getCanvasFingerprint(function (canvasFp) {
    cb({
      ua: window.navigator.userAgent,
      lang: window.navigator.language,
      platform: window.navigator.platform,
      hc: window.navigator.hardwareConcurrency,
      tz: window.Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvasFp,
      webgl: getWebGLFingerprint(),
      gpu: getGpuFingerprint(),
      plugins: getPluginListFingerprint(),
      fonts: getFontFingerprint(),
      net: getNetFingerprint(),
    });
  });
}

function testDebuggerRunningTimeDectect() {
  var code = "debugger;";
  var t1 = window.performance.now();
  window.eval(code);
  var t2 = window.performance.now();
  return t2 - t1;
}

function dectectDebugger() {
  var debugMetrics = [];
  debugMetrics.push(testDebuggerRunningTimeDectect());
  debugMetrics.push(window.outerWidth - window.innerWidth);
  debugMetrics.push(window.onconsole === true);
  return debugMetrics;
}

function rsaEncrypt(plaintext) {
  return true;
}

function dectectHook() {
  var hooks = [];
  hooks.push(!(window.console.toString() === "[object console]"));
  hooks.push(!(window.eval.toString() === "function eval() { [native code] }"));
  hooks.push(!(window.eval.name === "eval"));
  hooks.push(window.eval.length === 0);
  return hooks;
}

function dectectCdp() {
  var err = new window.Error();
  window.Object.defineProperty(err, "stack", {
    get: function () {
      if (window.cdpDetected) {
        window.cdpDetected = window.cdpDetected + 1;
      } else {
        window.cdpDetected = 1;
      }
      return "detected";
    },
  });
  console.debug(err);
  return "";
}

function dectectAutomation() {
  var automation = [];
  automation.push(dectectCdp());
  automation.push(window.navigator.webdriver === true);
  automation.push(!(window.navigator.userAgent.indexOf("HeadlessChrome") >= 0));
  automation.push(!(window.navigator.userAgent.indexOf("Headless") >= 0));
  automation.push(window.outerWidth);
  automation.push(window.outerHeight);
  automation.push(window.screenX);
  automation.push(window.screenY);
  automation.push(window._Selenium_IDE_Anchor === true);
  automation.push(window.callPhantom === true);
  automation.push(window.__puppeteer_evaluation_script__ === true);
  automation.push(window.__playwright_evaluation_script__ === true);
  return automation;
}

function getSign(cb) {
  getFingerprint(function (fingerprint) {
    var payload = {
      fingerprint: fingerprint,
      debugger: dectectDebugger(),
      automation: dectectAutomation(),
      hook: dectectHook(),
    };
    var signString =
      window.JSON.stringify(payload) +
      "|" +
      window.Date.now() +
      "|" +
      window.Math.floor(window.Math.random() * 10000);
    console.log("signString: " + signString);
    getHashValue(signString, cb);
  });
}

function hookFetch() {
  var nativeFetch = window.fetch;
  window.Object.defineProperty(window.window, "fetch", {
    value: function (url, options) {
      return new Promise(function (resolve, reject) {
        getSign(function (sign) {
          if (!options) {
            options = {};
          }
          if (!options.headers) {
            options.headers = {};
          }
          options.headers["X-Twisted-Sign"] = sign;
          nativeFetch(url, options).then(resolve, reject);
        });
      });
    },
  });

  window.Object.defineProperty(window.fetch, "toString", {
    value: function () {
      return "function fetch() { [native code] }";
    },
  });
}

function hooks() {
  dectectCdp();
  hookFetch();
}

function init() {
  hooks();
}

init();
true;
