import type { Instruction } from "../../instruction.js";
import { ArgKind, createArg, createInstruction } from "../../instruction.js";
import { Opcode } from "../../constant.js";
import { BaseIrPass } from "./base.js";

function isLoadSlot(arg: Instruction["args"][0]): arg is { kind: ArgKind; value: number } {
	return arg != null && (arg.kind === ArgKind.Variable || arg.kind === ArgKind.Parameter);
}

function randT(): number {
	return (Math.random() * 0x1_0000) | 0;
}

function randBool(): boolean {
	return Math.random() < 0.5;
}

/** Load+Load+Add：A+B = (A-t)+(B+t) 或 (A+t)+(B-t)，两种 7 指令序列随机 */
function expandLoadLoadAdd(
	ua: { kind: ArgKind; value: number },
	ub: { kind: ArgKind; value: number },
	t: number,
	alt: boolean,
): Instruction[] {
	const sa = ua.value as number;
	const sb = ub.value as number;
	if (!alt) {
		return [
			createInstruction(Opcode.Load, [createArg(ua.kind, sa)]),
			createInstruction(Opcode.Push, [createArg(ArgKind.Number, t)]),
			createInstruction(Opcode.Sub, []),
			createInstruction(Opcode.Load, [createArg(ub.kind, sb)]),
			createInstruction(Opcode.Push, [createArg(ArgKind.Number, t)]),
			createInstruction(Opcode.Add, []),
			createInstruction(Opcode.Add, []),
		];
	}
	return [
		createInstruction(Opcode.Load, [createArg(ua.kind, sa)]),
		createInstruction(Opcode.Push, [createArg(ArgKind.Number, t)]),
		createInstruction(Opcode.Add, []),
		createInstruction(Opcode.Load, [createArg(ub.kind, sb)]),
		createInstruction(Opcode.Push, [createArg(ArgKind.Number, t)]),
		createInstruction(Opcode.Sub, []),
		createInstruction(Opcode.Add, []),
	];
}

/** Load+Load+Sub：A-B = (A+t)-(B+t) 或 (A-t)-(B-t)，两种 7 指令序列随机 */
function expandLoadLoadSub(
	ua: { kind: ArgKind; value: number },
	ub: { kind: ArgKind; value: number },
	t: number,
	alt: boolean,
): Instruction[] {
	const sa = ua.value as number;
	const sb = ub.value as number;
	if (!alt) {
		return [
			createInstruction(Opcode.Load, [createArg(ua.kind, sa)]),
			createInstruction(Opcode.Push, [createArg(ArgKind.Number, t)]),
			createInstruction(Opcode.Add, []),
			createInstruction(Opcode.Load, [createArg(ub.kind, sb)]),
			createInstruction(Opcode.Push, [createArg(ArgKind.Number, t)]),
			createInstruction(Opcode.Add, []),
			createInstruction(Opcode.Sub, []),
		];
	}
	return [
		createInstruction(Opcode.Load, [createArg(ua.kind, sa)]),
		createInstruction(Opcode.Push, [createArg(ArgKind.Number, t)]),
		createInstruction(Opcode.Sub, []),
		createInstruction(Opcode.Load, [createArg(ub.kind, sb)]),
		createInstruction(Opcode.Push, [createArg(ArgKind.Number, t)]),
		createInstruction(Opcode.Sub, []),
		createInstruction(Opcode.Sub, []),
	];
}

/**
 * 算术恒等变形（ opcode 序列与常量拆分均随机化）：
 * - Push 双常量 + Add/Sub：两种加减号相反的常量拆分随机
 * - Load 双槽 + Add/Sub：两种等价展开随机，并 bumpDynAddr
 */
class ArithmeticDeformationPass extends BaseIrPass {
	readonly name = "ArithmeticDeformationPass";

	transform(ir: Instruction[]): Instruction[] {
		const out = this.cloneIr(ir);

		for (let i = 0; i < out.length - 2; i++) {
			const p0 = out[i]!;
			const p1 = out[i + 1]!;
			const op = out[i + 2]!;
			if (p0.opcode !== Opcode.Push || p1.opcode !== Opcode.Push) continue;
			if (op.opcode !== Opcode.Add && op.opcode !== Opcode.Sub) continue;
			const u = p0.args[0];
			const v = p1.args[0];
			if (u?.kind !== ArgKind.Number || v?.kind !== ArgKind.Number) continue;
			const x = u.value as number;
			const y = v.value as number;
			if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
			const t = randT();
			if (op.opcode === Opcode.Add) {
				if (randBool()) {
					u.value = x - t;
					v.value = y + t;
				} else {
					u.value = x + t;
					v.value = y - t;
				}
			} else {
				if (randBool()) {
					u.value = x + t;
					v.value = y + t;
				} else {
					u.value = x - t;
					v.value = y - t;
				}
			}
			i += 2;
		}

		const hits: { i: number; sub: boolean }[] = [];
		for (let i = 0; i < out.length - 2; i++) {
			const p0 = out[i]!;
			const p1 = out[i + 1]!;
			const op = out[i + 2]!;
			if (p0.opcode !== Opcode.Load || p1.opcode !== Opcode.Load) continue;
			if (op.opcode !== Opcode.Add && op.opcode !== Opcode.Sub) continue;
			const ua = p0.args[0];
			const ub = p1.args[0];
			if (!isLoadSlot(ua) || !isLoadSlot(ub)) continue;
			hits.push({ i, sub: op.opcode === Opcode.Sub });
		}
		hits.sort((a, b) => b.i - a.i);

		for (const { i, sub } of hits) {
			const ua = out[i]!.args[0]!;
			const ub = out[i + 1]!.args[0]!;
			const t = randT();
			const alt = randBool();
			const rep = sub ? expandLoadLoadSub(ua, ub, t, alt) : expandLoadLoadAdd(ua, ub, t, alt);
			out.splice(i, 3, ...rep);
			this.bumpDynAddr(out, i + 3, 4);
		}

		return out;
	}
}

export default ArithmeticDeformationPass;
export { ArithmeticDeformationPass };
