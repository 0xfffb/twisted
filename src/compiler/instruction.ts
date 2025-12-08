import { OPCODE } from "../constant.js";

interface Arg {
    type: number;
    value: any;
}

interface Instruction {
    opcode: OPCODE;
    args: Arg[];
    tags: string[];
}

function createInstruction(opcode: OPCODE, args: Arg[], tags: string[]): Instruction {
    return {
        opcode,
        args,
        tags,
    };
}

export { Instruction, Arg, createInstruction };