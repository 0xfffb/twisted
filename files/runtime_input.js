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
window.JSON.stringify({ fingerprint, hash: "0x" + fallbackHash(payload) })