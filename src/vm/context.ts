import { Frame } from "./frame.js";

class Context {
	private frames: Frame[];
	public frame: Frame

	constructor() {
		this.frames = [];
		this.frame = new Frame();
	}

	public pushFrame(frame: Frame) {
		this.frames.push(frame);
		this.frame = frame;
	}

	public popFrame() {
		if (this.frames.length <= 1) {
			throw new Error("🤖 Cannot pop global frame");
		}
		this.frames.pop();
		this.frame = this.frames[this.frames.length - 1];
	}
}

export { Context };
