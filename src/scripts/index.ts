import {CompileResult} from "./compiler";
import {AnyMathToolNumber, MathToolType} from "./number_tools";
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
    mkOptMeta("Package type", "packageType", "bignumber", "select", null, null, null, {
        Number: "bignumber",
        Decimal: "decimal",
        Fraction: "fraction"
    }),
    mkOptMeta("Show input", "showInput", "true", "checkbox", null, null, null),

    mkOptMeta("Decimal places", "bnDecimalPlaces", 100, "number", "bignumber", "DECIMAL_PLACES", parseInt),
    mkOptMeta("Pow precision", "bnPowPrecision", 100, "number", "bignumber", "POW_PRECISION", parseInt),
    mkOptMeta("Crypto", "bnCrypto", "false", "checkbox", "bignumber", "CRYPTO", Boolean),

    mkOptMeta("Precision", "decPrecision", 20, "number", "decimal", "precision", parseInt),
    mkOptMeta("Exp negative", "decExpNeg", -7, "number", "decimal", "toExpNeg", parseInt),
    mkOptMeta("Exp positive", "decExpPos", 21, "number", "decimal", "toExpPos", parseInt),
    //mkOptMeta("Min E", "decMinE", -9000000000000000, "number", "decimal", "minE", parseInt),
    //mkOptMeta("Max E", "decMaxE", 9000000000000000, "number", "decimal", "maxE", parseInt),
    mkOptMeta("Crypto", "decCrypto", "false", "checkbox", "decimal", "crypto", Boolean)
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
let packageType = localStorage.getItem(".packageType") ?? "bignumber";
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
    results.innerHTML = `<div>Loading...&nbsp;<div class="btn" onclick="panic()">Terminate</div>&nbsp;<span id="counter">0</span></div>`;
    clearInterval(runInterval);
    if (isRunning) {
        createWorker();
    }
    isRunning = true;
    let count = 0;
    const counter = <HTMLSpanElement>document.getElementById("counter");
    runInterval = window.setInterval(() => { // I used window because of TS
        count++;
        counter.innerHTML = count + "s passed";
        if (count === 5) {
            panicTerminate();
            alert("Calculation timed out.");
        }
    }, 1000);
    const res = await runWorker(code, <MathToolType>packageType);
    clearInterval(runInterval);
    isRunning = false;
    results.innerHTML = ``;
    if (res.success) {
        for (const r of res.response) {
            for (let i = 0; i < r.output.length; i++) {
                const out = r.output[i];
                if (typeof out === "object") {
                    const tool: any = {bignumber: BigNumber, fraction: Fraction, decimal: Decimal}[packageType];
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
        for (const t in trChecks) {
            const v = trChecks[t][0].hidden();
            trChecks[t][1].hidden = v;
            trChecks[t][2].hidden = v;
        }
    });

    tr2.appendChild(td);
}

function updateOptions() {
    for (const meta of optionsMeta) {
        meta.change(options[meta.id]);
    }
}

createWorker();