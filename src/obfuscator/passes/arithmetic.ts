import { Instruction } from "../../instruction.js";
import { BaseIrPass } from "./base.js";
import { Opcode } from "../../constant.js";

class ArithmeticDeformationPass extends BaseIrPass {
	readonly name = "ArithmeticDeformationPass";

	transform(ir: Instruction[]): Instruction[] {
		ir.forEach((instruction, index) => {
			if (instruction.opcode === Opcode.Add) {
				const a = ir[index - 1]
				const b = ir[index - 2];
				console.log(`Add: ${a.args[0].value} + ${b.args[0].value}`);
			}
		});
		return ir;
	}
}

export default ArithmeticDeformationPass;
export { ArithmeticDeformationPass };