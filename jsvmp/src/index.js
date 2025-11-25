import VM from './vm/vm.js'

(function main() {
    const vm = new VM()
    const code = [
        0x00, 0x01,   // Push 1
        0x00, 0x02,   // Push 2
        0x02      // Add
      ];
    const result = vm.execute(code)
    console.log(result)
})();