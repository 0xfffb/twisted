import { HyperionAssembler } from "./assembler/index.js";
import { HyperionCompiler } from "./compiler/index.js";
import VM from "./vm/vm.js";
import { JSDOM } from "jsdom";
import { transformSync } from "@babel/core";

async function main() {
	const code = `
function joinChars(parts) {
    let out = "";
    for (let i = 0; i < parts.length; i++) {
        out += parts[i];
    }
    return out;
}

function getHashValue(str) {
  const encoder = new window.TextEncoder();
  const data = encoder.encode(str);
  const hash = window.crypto.subtle.digest(joinChars(["S", "H", "A", "-", "2", "5", "6"]), data);
  const hashArray = window.Array.from(new window.Uint8Array(hash));
  let hashHex = "";
  for (let i = 0; i < hashArray.length; i++) {
      const byte = hashArray[i];
      hashHex += byte.toString(16).padStart(2, "0");
  }
  return hashHex;
}

function getCanvasFingerprint() {
    const canvas = window.document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.fillText("twisted-fp", 2, 15);
    const canvasFp = canvas.toDataURL();
    return getHashValue(canvasFp);
}

function getWebGLFingerprint() {
    const canvas = window.document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    let vendor = "";
    let renderer = "";
    if (gl) {
      const extDbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (extDbg) {
        vendor = gl.getParameter(extDbg.UNMASKED_VENDOR_WEBGL);
        renderer = gl.getParameter(extDbg.UNMASKED_RENDERER_WEBGL);
        const exts = gl.getSupportedExtensions();
        let extStr = "";

        if (exts) {
            for (let i = 0; i < exts.length; i++) {
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
    // 2) 回退 WebGL
    const canvas = window.document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) {
      const extDbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (extDbg) {
        const r = gl.getParameter(extDbg.UNMASKED_RENDERER_WEBGL);
        if (r) {
          return r;
        }
      }
      const r2 = gl.getParameter(gl.RENDERER);
      if (r2) {
        return r2;
      }
    }
    return "";
}

function getPluginListFingerprint() {
    const plugins = window.navigator.plugins;
    let s = "";
    for (let i = 0; i < plugins.length; i++) {
        if (0 < i) {
            s += ",";
        }
        s += plugins[i].name;
    }
    return s;
}

function getFontFingerprint() {
    const canvas = window.document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = "72px monospace";
    const baseW = ctx.measureText("mmmmmmmmmmlli").width;
    const fonts = joinChars(["A", "r", "i", "a", "l"]);
    const fonts2 = joinChars(["V", "e", "r", "d", "a", "n", "a"]);
    const fonts3 = joinChars(["T", "i", "m", "e", "s", " ", "N", "e", "w", " ", "R", "o", "m", "a", "n"]);
    const fonts4 = joinChars(["G", "e", "o", "r", "g", "i", "a"]);
    const fonts5 = joinChars(["C", "o", "u", "r", "i", "e", "r", " ", "N", "e", "w"]);
    const fonts6 = joinChars(["T", "r", "e", "b", "u", "c", "h", "e", "t", " ", "M", "S"]);
    const fonts7 = joinChars(["C", "o", "m", "i", "c", " ", "S", "a", "n", "s", " ", "M", "S"]);
    const fonts8 = joinChars(["A", "r", "i", "a", "l", " ", "B", "l", "a", "c", "k"]);
    const list = [fonts, fonts2, fonts3, fonts4, fonts5, fonts6, fonts7, fonts8];
    let hit = "";
    for (let j = 0; j < list.length; j++) {
        const fname = list[j];
        ctx.font = "72px " + fname + ", monospace";
        const w = ctx.measureText("mmmmmmmmmmlli").width;
        if (w === baseW) {
        } else {
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
    const c = window.navigator.connection;
    if (c) {
      const et = c.effectiveType;
      const dl = c.downlink;
      const rtt = c.rtt;
      return et + "|" + dl + "|" + rtt;
    }
    return ""
}

function getFingerprint() {
    return {
        ua: window.navigator.userAgent,
        lang: window.navigator.language,
        platform: window.navigator.platform,
        hc: window.navigator.hardwareConcurrency,
        tz: window.Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: getCanvasFingerprint(),
        webgl: getWebGLFingerprint(),
        gpu: getGpuFingerprint(),
        plugins: getPluginListFingerprint(),
        fonts: getFontFingerprint(),
        net: getNetFingerprint(),
    };
}

async function testDebuggerRunningTimeDectect() {
    const code = "debugger;"
    const t1 = window.performance.now();
    // const blob = new window.Blob([code], { type: 'application/javascript' });
    // await new window.Worker(window.URL.createObjectURL(blob));
    window.eval(code);
    const t2 = window.performance.now();
    return t2 - t1;
}

async function dectectDebugger() {
    let debugMetrics = []
    debugMetrics.push(await testDebuggerRunningTimeDectect());
    debugMetrics.push(window.outerWidth - window.innerWidth);
    debugMetrics.push((window.onconsole === true));
    return debugMetrics;
}


async function rsaEncrypt(plaintext) {
    return true;
}

function dectectHook() {
  const hooks = []
  hooks.push(!(window.console.toString() === "[object console]"))
  hooks.push(!(window.eval.toString() === "function eval() { [native code] }"))
  hooks.push(!(window.eval.name === "eval"))
  hooks.push((window.eval.length === 0))
  return hooks;
}

function dectectCdp() {
  // 2025.5.9 chrome 提交补丁修复
  const err = new window.Error();
  window.Object.defineProperty(err, "stack", {
    get: function() {
      if (window.cdpDetected) {
        window.cdpDetected = window.cdpDetected + 1
      } else {
        window.cdpDetected = 1
      }
      return "detected";
    }
  });
  console.debug(err);
  return "";
}


function dectectAutomation() {
  const automation = []
  automation.push(dectectCdp())
  automation.push((window.navigator.webdriver === true))
  automation.push(!(window.navigator.userAgent.includes("HeadlessChrome")))
  automation.push(!(window.navigator.userAgent.includes("Headless")))

  // 窗口
  automation.push(window.outerWidth)
  automation.push(window.outerHeight)
  automation.push(window.screenX)
  automation.push(window.screenY)

  // 自动化工具 环境
  automation.push((window._Selenium_IDE_Anchor === true))
  automation.push((window.callPhantom === true))
  automation.push((window.__puppeteer_evaluation_script__ === true))
  automation.push((window.__playwright_evaluation_script__ === true))
  return automation;
}
async function getSign() {
    let payload = {
        fingerprint: getFingerprint(),
        debugger: await dectectDebugger(),
        automation: dectectAutomation(),
        hook: dectectHook(),
    }
    const signString = window.JSON.stringify(payload) + "|" + window.Date.now() + "|" + window.Math.floor(window.Math.random() * 10000);
    console.log("signString: " + signString)

    return getHashValue(signString);
}

function hookFetch() {
    const nativeFetch = window.fetch;
    window.Object.defineProperty(window.window, "fetch", {
      value: function(url, options) {
          if (!options) {
            options = {};
          }
          let headers = options.headers;
          if (!headers) {
            headers = {};
          }
          headers["X-Twisted-Sign"] = getSign();
          options.headers = headers;
          return nativeFetch(url, options);
      }
    });

    window.Object.defineProperty(window.fetch, "toString", {
      value: function() {
        return "function fetch() { [native code] }"
      }
    });
}


function hooks() {
  dectectCdp()
  hookFetch();
}

function init() {
  hooks()
}

init()
true
	`;


	const es5Code = transformSync(code, {
		babelrc: false,
		configFile: false,
		comments: false,
		compact: false,
		presets: [
		  [
			"@babel/preset-env",
			{
			  targets: { ie: "11" },
			  modules: false,
			  bugfixes: true
			}
		  ]
		]
	  });
	


	if (!es5Code?.code) {
		throw new Error("HyperionBuilder: Babel 降级失败，未生成代码");
	}

	console.log("es5Code: ", es5Code.code);
	const compiler = new HyperionCompiler(es5Code.code);
	const json = compiler.compile();
	console.log(json);

	console.log(compiler.dump());
	const assembler = new HyperionAssembler();
	const bundle = assembler.assemble(json);
	console.log(bundle);

	const dom = new JSDOM();
	const vm = new VM(bundle.bytecode, bundle.meta, [dom.window, dom.window.console]);
	const result = await vm.execute();
	console.log(result);
}


void main();
