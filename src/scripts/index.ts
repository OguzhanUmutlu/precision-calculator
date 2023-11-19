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

const btn = <HTMLButtonElement>document.querySelector(".compute");
const textarea = <HTMLTextAreaElement>document.querySelector("textarea");
const results = <HTMLDivElement>document.querySelector(".results");
let code = localStorage.getItem(".code") ?? "";
textarea.value = code;
textarea.rows = Math.min(code.split("\n").length, 20);

btn.addEventListener("click", onRun);

function onRun() {
    results.innerHTML = "";
    try {
        const tokens = tokenize(code);
        const groups = groupTokens(code, tokens);
        const ast = interpret(code, groups);
        const result = new Compiler(code, "bignumber").compile(ast);
        for (const res of result) {
            const div = document.createElement("div");
            div.innerHTML = `
<table style="margin-right: 30px">
    <tr>
        <td>Input</td>
        <td><code>${res.input}</code></td>
    </tr>
</table>
Output: <code>${res.output.join(" ")}</code>`;
            results.appendChild(div);
        }
    } catch (e) {
        const div = document.createElement("div");
        div.innerHTML = `
<table style="margin-right: 30px;width: 100%">
    <tr>
        <td>Error</td>
        <td><code>${(<string[]>e).join("<br>")}</code></td>
    </tr>
</table>`;
        results.appendChild(div);
    }
}

textarea.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "Enter") {
        onRun();
        e.preventDefault();
    }
})

setInterval(() => {
    if (textarea.value === code) return;
    code = textarea.value;
    textarea.rows = Math.min(code.split("\n").length, 20);
    localStorage.setItem(".code", code);
});

onRun();