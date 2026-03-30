const canvas = window.document.createElement("canvas");
const ctx = canvas.getContext("2d");
ctx.fillText("twisted-fp", 2, 15);
const canvasFp = canvas.toDataURL();

const fingerprint = {
	ua: window.navigator.userAgent,
	lang: window.navigator.language,
	platform: window.navigator.platform,
	hc: window.navigator.hardwareConcurrency,
	tz: window.Intl.DateTimeFormat().resolvedOptions().timeZone,
	canvas: canvasFp,
};

const payload = window.JSON.stringify(fingerprint);
function fallbackHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}


async function getHashValue(str) {
  const encoder = new window.TextEncoder();
  const data = encoder.encode(str);
  const hash = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = window.Array.from(new window.Uint8Array(hash));
  let hashHex = ''
  for (let i = 0; i < hashArray.length; i++) {
    const byte = hashArray[i];
    hashHex += byte.toString(16).padStart(2, "0");
  }
  return hashHex;
}
// function hookFetch() {
//     const nativeFetch = window.fetch;
//     window.fetch = function(url, options) {
//         let headers = options.headers;
//         if (headers) {
//             headers["X-Twisted-FP"] = fallbackHash(payload);
//         } else {
//             headers = {
//                 "X-Twisted-FP": fallbackHash(payload),
//             }
//         }
//         options.headers = headers;
//         return nativeFetch(url, options);
//     }
// }


const response = await window.fetch("http://127.0.0.1:5500/");

window.JSON.stringify({ fingerprint, hash: "0x" + await getHashValue(payload) })


// const ob = {a: 1, b: 2, c: 3};
// ob.a = 10;
// window.JSON.stringify(ob);
