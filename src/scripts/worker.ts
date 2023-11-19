import {Compiler} from "./compiler";
import {tokenize} from "./tokenizer";
import {groupTokens, interpret} from "./interpreter";
import {BigNumber} from "bignumber.js";
import {default as Fraction} from "fraction.js";
import {Decimal} from "decimal.js";

onmessage = ({data}) => {
    if (data.type === "setOptions") {
        for (const opt of data.options) {
            const cl: any = (<any>{bignumber: BigNumber, fraction: Fraction, decimal: Decimal})[opt.type];
            cl.set(opt.data);
        }
        return;
    }
    try {
        const compiler = new Compiler(data.code, data.tool);
        const tokens = tokenize(data.code);
        const groups = groupTokens(data.code, tokens);
        const ast = interpret(data.code, groups);
        const response = compiler.compile(ast);
        for (let i = 0; i < response.length; i++) {
            const {output} = response[i];
            for (let j = 0; j < output.length; j++) {
                const k = output[j];
                if (typeof k !== "string") {
                    // @ts-ignore
                    const o: any = output[j] = {...output[j]};
                    delete o.constructor;
                }
            }
        }
        postMessage({id: data.id, response, success: true});
    } catch (e) {
        if (e instanceof Error) throw e;
        postMessage({id: data.id, response: e, success: false});
    }
};