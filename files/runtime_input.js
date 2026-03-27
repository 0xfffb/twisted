const time = window.Date();
const bytes = new window.TextEncoder().encode(time);
const digest = await window.crypto.subtle.digest("SHA-256", bytes);
const digestBytes = new window.Uint8Array(digest);
const fp32 =
	((digestBytes[0] << 24) |
		(digestBytes[1] << 16) |
		(digestBytes[2] << 8) |
		digestBytes[3]) >>> 0;
fp32