function getFingerprint() {
    const canvas = window.document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.fillText("twisted-fp", 2, 15);
    const canvasFp = canvas.toDataURL();
    return {
        ua: window.navigator.userAgent,
        lang: window.navigator.language,
        platform: window.navigator.platform,
        hc: window.navigator.hardwareConcurrency,
        tz: window.Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: canvasFp,
    };
}

function getHashValue(str) {
    const encoder = new window.TextEncoder();
    const data = encoder.encode(str);
    const hash = window.crypto.subtle.digest("SHA-256", data);
    const hashArray = window.Array.from(new window.Uint8Array(hash));
    let hashHex = "";
    for (let i = 0; i < hashArray.length; i++) {
        const byte = hashArray[i];
        hashHex += byte.toString(16).padStart(2, "0");
    }
    return hashHex;
}

/**
 * hookFetch 接收原生 fetch 和 payload 作为参数，
 * 内部函数表达式通过闭包捕获这两个局部变量。
 */
function hookFetch() {
    const nativeFetch = window.fetch;
    window.fetch = function(url, options) {
        if (!options) {
            options = {};
        }
        let headers = options.headers;
        const payload = window.JSON.stringify(getFingerprint());
        payload += new window.Date().toISOString();
        const hash = getHashValue(payload);
        if (headers) {
            headers["X-Twisted-FP"] = hash;
        } else {
            headers = {
                "X-Twisted-FP": hash,
            };
        }
        options.headers = headers;
        return nativeFetch(url, options);
    };
}

const fingerprint = getFingerprint();
const payload = window.JSON.stringify(fingerprint);
hookFetch();
true
