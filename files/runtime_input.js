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
const bytes = new window.TextEncoder().encode(payload);
const digest = await window.crypto.subtle.digest("SHA-256", bytes);
const hash = new window.DataView(digest).getUint32(0, false).toString(16);

const result = { fingerprint: fingerprint, hash: "0x" + hash,  };
window.JSON.stringify(result)