import { IRModule } from "./module.js";
import { IRFunction } from "./value/constant/global/index.js";

class IRBuilder {
    private _module: IRModule;

    constructor(module: IRModule) {
        this._module = module;
    }

    get module(): IRModule {
        return this._module;
    }

    buildFunction(name: string, params: string[]): IRFunction {
        const fn = new IRFunction(name, params);
        this.module.addFunction(fn);
        return fn;
    }
    
}