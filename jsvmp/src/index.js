import VM from './vm/vm.js'
import { toDecimalBytecode } from './utils/bytecode.js'

(function main() {
    const vm = new VM()
    // const code = [
    //     0x00, 0x01,     // Push 1
    //     0x00, 0x02,     // Push 2
    //     0x02,           // Add
    //     0x08, 0x00,     // LocalStore 0
    //     0x09, 0x00,     // LocalLoad 0
    //     0x00, 0x03,     // Push 3
    //     0x02,           // Add
    //     0x08, 0x01,     // LocalStore 1
    //     0x00, 0x04,     // Push 4
    //     0x00, 0x05,     // Push 5
    //     0x02,           // Add
    //     0x09, 0x01,     // LocalLoad 1
    //     0x02,           // Add
    // ]

    const code = [ 0, 10, 0, 20, 2 ]
    const hexBytecode = [ '0x00', '0x0a', '0x00', '0x14', '0x02' ]

    const bytecode = toDecimalBytecode(hexBytecode)
    const result = vm.execute(bytecode)
    console.log(result)
})()