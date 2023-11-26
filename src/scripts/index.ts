import {CompileResult} from "./runner";
import {AnyMathToolNumber, MathTools, MathToolType} from "./number_tools";
import {BigNumber} from "bignumber.js";
import {default as Fraction} from "fraction.js";
import {Decimal} from "decimal.js";

type WorkerResponse<T> = {
    response: CompileResult<T>[], success: true
} | {
    response: string[], success: false
};

const btn = <HTMLButtonElement>document.querySelector(".compute");
const textarea = <HTMLTextAreaElement>document.querySelector("textarea");
const results = <HTMLDivElement>document.querySelector(".results");
const optionsTable = <HTMLTableElement>document.querySelector(".options-table");
const shortcutsDiv = <HTMLDivElement>document.querySelector(".shortcuts");
const githubIcons = document.querySelectorAll<HTMLDivElement>(".github-icon");
const designPerfOpt = localStorage.getItem(".design-perf") === "1";
const designPerfBtn = <HTMLButtonElement>document.querySelector(".design-performance");
if (designPerfOpt) {
    const link = <HTMLLinkElement>document.querySelector("link[rel=stylesheet]");
    link.href = "./src/style-less.css";
}
designPerfBtn.addEventListener("click", () => {
    localStorage.setItem(".design-perf", designPerfOpt ? "0" : "1");
    location.reload();
});

function mkOptMeta(label: any, id: any, def: any, input: string, type: any, k: any, cb: any, extra?: any) {
    return {
        label, id, def, input, extra, cb, hidden: () => type && options.packageType !== type,
        change(v: any) {
            if (!cb) return;
            worker.postMessage({
                type: "setOptions",
                options: [{
                    type,
                    data: {[k]: v}
                }]
            });
        }
    }
}

const optionsMeta = [
    mkOptMeta("Package type", "packageType", "decimal", "select", null, null, null, {
        Decimal: "decimal",
        Number: "bignumber",
        Fraction: "fraction"
    }),
    mkOptMeta("Show input", "showInput", "true", "checkbox", null, null, null),
    mkOptMeta("Strict mode", "strictMode", "false", "checkbox", null, "strictMode", (a: any) => a),

    mkOptMeta("Decimal places", "bnDecimalPlaces", 100, "number", "bignumber", "DECIMAL_PLACES", parseInt),
    mkOptMeta("Pow precision", "bnPowPrecision", 100, "number", "bignumber", "POW_PRECISION", parseInt),
    mkOptMeta("Crypto", "bnCrypto", "false", "checkbox", "bignumber", "CRYPTO", (a: any) => a),

    mkOptMeta("Precision", "decPrecision", 20, "number", "decimal", "precision", parseInt),
    mkOptMeta("Exp negative", "decExpNeg", -7, "number", "decimal", "toExpNeg", parseInt),
    mkOptMeta("Exp positive", "decExpPos", 21, "number", "decimal", "toExpPos", parseInt),
    //mkOptMeta("Min E", "decMinE", -9000000000000000, "number", "decimal", "minE", parseInt),
    //mkOptMeta("Max E", "decMaxE", 9000000000000000, "number", "decimal", "maxE", parseInt),
    mkOptMeta("Crypto", "decCrypto", "false", "checkbox", "decimal", "crypto", (a: any) => a)
];

const options: Record<string, string> = {};

let worker: Worker;

let workerHandlers: Record<number, Function> = {};
let workerHandlerId = 0;

function createWorker() {
    workerHandlers = {};
    if (worker) worker.terminate();
    worker = new Worker(
        new URL("./worker.ts", import.meta.url), {type: "module"}
    );
    worker.addEventListener("message", ({data}) => {
        const handler = workerHandlers[data.id];
        if (handler) {
            delete data.id;
            handler(data);
        }
    });
    updateOptions();
}

async function runWorker(code: string, type: MathToolType): Promise<WorkerResponse<AnyMathToolNumber>> {
    const id = ++workerHandlerId;
    worker.postMessage({id, code, tool: type});
    return await new Promise(r => workerHandlers[id] = r);
}

let code = localStorage.getItem(".code") ?? "";
textarea.value = code;
textarea.rows = Math.min(code.split("\n").length + 1, 20);

btn.addEventListener("click", onRun);

Object.defineProperty(window, "panic", {
    get: () => panicTerminate
});

function panicTerminate() {
    createWorker();
    clearInterval(runInterval);
    results.innerHTML = "";
}

let isRunning = false;
let runInterval = -1;

async function onRun() {
    results.innerHTML = `<div>Loading...&nbsp;<span id="counter"></span>&nbsp;<span class="btn" onclick="panic()">Terminate</span></div>`;
    clearInterval(runInterval);
    if (isRunning) {
        createWorker();
    }
    isRunning = true;
    let count = 0;
    const counter = <HTMLSpanElement>document.getElementById("counter");
    runInterval = window.setInterval(() => { // I used "window" because of TS
        count++;
        counter.innerHTML = count + "s passed";
        if (count === 60) {
            panicTerminate();
            alert("Calculation timed out.");
        }
    }, 1000);
    const res = await runWorker(code, <MathToolType>options.packageType);
    clearInterval(runInterval);
    isRunning = false;
    results.innerHTML = ``;
    if (res.success) {
        for (const r of res.response) {
            for (let i = 0; i < r.output.length; i++) {
                const out = r.output[i];
                if (typeof out === "object") {
                    const tool: any = {bignumber: BigNumber, fraction: Fraction, decimal: Decimal}[options.packageType];
                    const n = new tool("0");
                    for (const j in out) n[j] = (<any>out)[j];
                    r.output[i] = n;
                }
            }
            const div = document.createElement("div");
            div.innerHTML = `
${options.showInput ? `
<table style="width: 100%">
    <tr>
        <td>Input</td>
        <td><code>${r.input}</code></td>
    </tr>
</table>
<br>
` : ""}
<div style="display: flex">
    <div style="text-align: center">
        Output:<br><div style="font-size: 13px; translate: 0 -3px">(in ${r.time.toFixed(3)}ms)</div>
    </div>
    <code style="max-width: calc(100% - 100px)">${r.output.map(i => i.toString()).join(" ")}</code>
</div>`;
            results.appendChild(div);
        }
    } else {
        const div = document.createElement("div");
        div.innerHTML = `
<table style="margin-right: 30px;width: 100%">
    <tr>
        <td>Error</td>
        <td><code>${res.response.join("<br>")}</code></td>
    </tr>
</table>`;
        results.appendChild(div);
    }
}

addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "Enter") {
        onRun().then(r => r);
        e.preventDefault();
    }
})

setInterval(() => {
    if (textarea.value === code) return;
    code = textarea.value;
    textarea.rows = Math.min(code.split("\n").length + 1, 20);
    localStorage.setItem(".code", code);
});

const tr1 = document.createElement("tr");
optionsTable.appendChild(tr1);
const tr2 = document.createElement("tr");
optionsTable.appendChild(tr2);

const trChecks: Record<string, any> = {};

for (const meta of optionsMeta) {
    const td = document.createElement("td");
    let v = (meta.cb ?? ((r: any) => r))(localStorage.getItem(".options." + meta.id) ?? meta.def);
    if (meta.input === "checkbox") v = v === "true";
    else if (meta.input === "number") v = parseFloat(v);
    options[meta.id] = v;
    td.hidden = meta.hidden();
    td.innerText = meta.label;
    trChecks[meta.id] = [meta, td];
    tr1.appendChild(td);
}

for (const meta of optionsMeta) {
    const td = document.createElement("td");
    td.hidden = meta.hidden();
    trChecks[meta.id][2] = td;
    const alr = options[meta.id];

    let cb: any;
    switch (meta.input) {
        case "checkbox":
            cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = alr;
            td.appendChild(cb);
            break;
        case "number":
            cb = document.createElement("input");
            cb.type = "number";
            cb.value = alr;
            td.appendChild(cb);
            break;
        case "select":
            cb = document.createElement("select");
            for (const k in meta.extra) {
                const opt = document.createElement("option");
                opt.innerText = k;
                opt.value = meta.extra[k];
                cb.appendChild(opt);
            }
            cb.value = alr;
            td.appendChild(cb);
            break;
        default:
            throw "invalid meta";
    }

    cb.addEventListener("change", () => {
        let v = cb.type === "checkbox" ? cb.checked : cb.value;
        if (meta.cb) v = meta.cb(v);
        options[meta.id] = v;
        localStorage.setItem(".options." + meta.id, v);
        meta.change(v);
        if (meta.id === "packageType") {
            for (const t in trChecks) {
                const v = trChecks[t][0].hidden();
                trChecks[t][1].hidden = v;
                trChecks[t][2].hidden = v;
            }
            updateOptions();
        }
    });

    tr2.appendChild(td);
}

function addShortcut(html: string, copy = html) {
    const el = document.createElement("div");
    el.innerHTML = html;
    el.addEventListener("click", () => {
        const cursorPosition = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPosition);
        const textAfterCursor = textarea.value.substring(cursorPosition);
        textarea.value = textBeforeCursor + copy + textAfterCursor;
        const newPosition = cursorPosition + copy.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
    });
    shortcutsDiv.appendChild(el);
}

const fastVariables = ["x", "y", "z", "t", "w", "u"];

function updateOptions() {
    for (const meta of optionsMeta) {
        meta.change(options[meta.id]);
    }
    shortcutsDiv.innerHTML = "";
    const tool = MathTools[<MathToolType>options.packageType];
    for (const name in tool.constants) {
        addShortcut(name, name);
    }
    for (const name in tool.functions) {
        let text = name + "(";
        const amount = tool.functions[name].arguments;
        if (amount === Infinity) {
            text += `x<sub>1</sub>, x<sub>2</sub>, ...`;
        } else if (amount <= fastVariables.length) {
            text += fastVariables.slice(0, amount).join(", ");
        } else {
            for (let i = 1; i <= amount; i++) {
                text += `x<sub>${i}</sub>`;
                if (i !== amount) text += `, `;
            }
        }
        addShortcut(text + ")", name + "(" + (amount === 0 ? ")" : ""))
    }
}

for (const el of githubIcons) {
    el.addEventListener("click", () => {
        open("https://github.com/OguzhanUmutlu/precision-calculator", "_blank");
    });
}

let githubVisibility = true;

setInterval(() => {
    const vis = scrollY < 50;
    if (vis === githubVisibility) return;
    githubVisibility = vis;
    const m = vis ? 1 / 10 : 10;
    for (const el of githubIcons) {
        const s = el.style.translate.split(" ");
        el.style.translate = `${parseFloat(s[0].slice(0, -2)) * m}px ${parseFloat(s[1].slice(0, -2)) * m}px`;
    }
});

createWorker();