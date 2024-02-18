import {Runner} from "./runner";
import {tokenize} from "./tokenizer";
import {groupTokens, interpret} from "./interpreter";
import {BigNumber} from "bignumber.js";
import {default as Fraction} from "fraction.js";
import {Decimal} from "decimal.js";
import {ERR_RED} from "./error";
import Complex from "complex.js";

export function getInput() {
    postMessage("input");
    // @ts-ignore
    return new Promise<number>(r => self.input = r);
}

const compilerOptions = {
    strictMode: false
};

onmessage = async ({data}) => {
    // @ts-ignore
    if (data.type === "input") return self.input(data.value);
    if (data.type === "setOptions") {
        for (const opt of data.options) {
            if (opt.type === null) {
                Object.assign(compilerOptions, opt.data);
                continue;
            }
            const cl: any = (<any>{
                bignumber: BigNumber,
                fraction: Fraction,
                decimal: Decimal,
                complex: Complex
            })[opt.type];
            if (!("set" in cl)) continue;
            cl.set(opt.data);
        }
        return;
    }
    try {
        const compiler = new Runner(data.code, data.tool, compilerOptions.strictMode);
        const tokens = tokenize(data.code);
        const groups = groupTokens(data.code, tokens, compilerOptions.strictMode);
        const ast = interpret(data.code, groups);
        await compiler.compile(ast, {
            variables: compiler.variables
        });
        const response = compiler.result;
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
        if (e instanceof Error) {
            console.error(e);
            e = [`<span style="color: ${ERR_RED}">JavaScript: ${e.toString()}</span>`];
        }
        postMessage({id: data.id, response: e, success: false});
    }
};