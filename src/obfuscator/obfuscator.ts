/**
 * IR 混淆器：按顺序串联多个 IrPass。
 */
import type { Instruction } from "../instruction.js";
import type { IrPass } from "./passes/base.js";

class Obfuscator {
	constructor(private readonly passes: IrPass[]) {}

	obfuscate(ir: Instruction[]): Instruction[] {
		return this.passes.reduce((acc, pass) => {
			console.log(`🔨 Obfuscator pass: ${pass.name}`);
			return pass.transform(acc);
		}, ir);
	}
}

export default Obfuscator;
export { Obfuscator };
