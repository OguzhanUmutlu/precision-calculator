import {Token} from "./tokenizer";
import {throwError} from "./error";

const Brackets: Record<string, string> = {
    "(": ")",
    //"[": "]",
    //"{": "}"
};

export type SetVariableStatement = {
    type: "set_variable", name: Token, value: Token[], input: string
};
export type SetFunctionStatement = {
    type: "set_function", name: Token, arguments: string[], value: Token[], input: string, valueInput: string
};
export type InlineExecutionStatement = {
    type: "inline_execution", value: Token[], input: string
};

export type Statement = SetVariableStatement | SetFunctionStatement | InlineExecutionStatement;

export function groupTokens(code: string, tokens: Token[], strictMode: boolean) {
    const program: any = {type: "group", value: "", children: []};
    let parent: any = program;
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === "symbol") {
            const closer = Brackets[token.value];
            if (closer) {
                parent = {
                    type: "group",
                    index: token.index,
                    value: "",
                    children: [],
                    parent,
                    opener: token,
                    closer
                };
                continue;
            } else if (token.value === parent.closer) {
                const p = parent;
                p.value = code.substring(p.opener.index, token.index + token.value.length);
                parent = p.parent;
                delete p.parent;
                p.closer = token;
                const back = parent.children[parent.children.length - 1];
                if (!strictMode && back && back.type === "word") {
                    parent.children.splice(parent.children.length - 1, 1, {
                        type: "call_function", value: back.value + p.value, index: back.index,
                        name: back, opener: p.opener, closer: token, arguments: p
                    });
                    continue;
                }
                parent.children.push(p);
                continue;
            }
        }
        parent.children.push(token);
    }
    if (program !== parent) {
        throwError(code, parent.index, "Unfinished bracket.");
    }
    return program.children;
}

function findEOL(index: number, tokens: Token[]): [number, Token[]] { // EOL = End of the line
    let backslash = false;
    const collects: Token[] = [];
    for (; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.value === "\n" || token.value === ";") {
            if (backslash) continue;
            return [index, collects];
        }
        if (token.value === "\\") {
            backslash = !backslash;
            continue;
        }
        backslash = false;
        collects.push(token);
    }
    return [index - 1, collects]; // end of the file
}

export function interpret(code: string, tokens: Token[]) {
    const statements: Statement[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const next1 = tokens[i + 1];
        if (token.type === "word") {
            if (next1) {
                if (next1.value === "=") {
                    i += 2;
                    const [nI, collects] = findEOL(i, tokens);
                    i = nI;
                    const nt = tokens[i];
                    statements.push({
                        type: "set_variable",
                        name: token,
                        value: collects,
                        input: code.substring(token.index, nt.index + nt.value.length)
                    });
                    continue;
                }
            }
        }
        if (token.type === "call_function") {
            if (next1 && next1.type === "symbol" && next1.value === "=") {
                i += 2;
                const [nI, collects] = findEOL(i, tokens);
                i = nI;
                if (collects.length === 0) throwError(code, next1.index, "Expected an expression after the equals sign.");
                const argumentList: string[] = [];
                for (let j = 0; j < token.arguments.children.length; j++) {
                    const arg = token.arguments.children[j];
                    if (j % 2 === 0) {
                        if (arg.type !== "word") throwError(code, arg.index, "Expected a variable name for the function parameter.", arg.value.length);
                        argumentList.push(arg.value);
                    } else if (arg.value !== ",") throwError(code, arg.index, "Expected a comma between the parameters of the function.", arg.value.length);
                }
                const nt = tokens[i - 1];
                statements.push({
                    type: "set_function",
                    name: token.name,
                    arguments: argumentList,
                    value: collects,
                    valueInput: code.substring(collects[0].index, nt.index + nt.value.length),
                    input: code.substring(token.index, nt.index + nt.value.length)
                });
                continue;
            }
        }
        if (token.type === "call_function" || token.type === "integer" || token.type === "float" || token.type === "word" || token.type === "group") {
            const [nI, collects] = findEOL(i, tokens);
            i = nI;
            const nt = tokens[i];
            statements.push({
                type: "inline_execution",
                value: collects,
                input: code.substring(token.index, nt.index + nt.value.length)
            });
            continue;
        }
        if (token.value === "\n" || token.value === ";") continue;
        if (token.type === "symbol") {
            throwError(code, token.index, "Unexpected symbol.");
            continue;
        }
        if (token.type === "operator") {
            throwError(code, token.index, "Unexpected symbol.");
        }
    }
    return statements;
}