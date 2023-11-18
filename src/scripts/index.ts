// syntax:
// x = ...
// f(x, y, z) = ...
// sin(10 + 5 + f(10 + 5))
// it should show the result of the computation before the lines like this:
// *10* 1) x = 10
// *50* 2) y = x + 40

import {tokenize} from "./tokenizer";
import {groupTokens, interpret} from "./interpreter";
import {Compiler} from "./compiler";

const btn = <HTMLButtonElement>document.getElementById("run");
const textarea = <HTMLTextAreaElement>document.querySelector("textarea");
let code = localStorage.getItem(".code") ?? "";
textarea.value = code;

btn.addEventListener("click", onRun);

function onRun() {
    const tokens = tokenize(code);
    const groups = groupTokens(code, tokens);
    const ast = interpret(code, groups);
    new Compiler(code, "bignumber").compile(ast);
}

setInterval(() => {
    if (textarea.value === code) return;
    code = textarea.value;
    localStorage.setItem(".code", code);
});

onRun();