import {GroupToken, Token} from "./tokenizer";
import {throwError} from "./error";

const Brackets: Record<string, string> = {
    "(": ")",
    //"[": "]",
    "{": "}"
};

export type SetVariableStatement = {
    type: "set_variable",
    name: Token,
    value: Token[],
    input: string,
    new: boolean,
    constant: boolean
};
export type SetFunctionStatement = {
    type: "set_function",
    name: Token,
    arguments: string[],
    value: Token[],
    input: string,
    valueInput: string
};
export type InlineExecutionStatement = {
    type: "inline_execution",
    value: Token[],
    input: string
};
export type RepeatUntilStatement = {
    type: "repeat_until",
    requirement: Token[],
    scope: Statement[],
    input: string,
    valueRequirement: string,
    repeatToken: Token
};
export type LoopStatement = {
    type: "loop",
    scope: Statement[],
    input: string,
    loopToken: Token
};
export type ReturnStatement = {
    type: "return",
    value: Token[],
    input: string,
    returnToken: Token
};
export type BreakStatement = {
    type: "break",
    input: string,
    breakToken: Token
};
export type IfStatement = {
    type: "if",
    requirement: Token[],
    scope: Statement[],
    input: string,
    valueRequirement: string,
    ifToken: Token
};
export type ElseStatement = {
    type: "else",
    scope: Statement[],
    input: string,
    elseToken: Token
};
export type ElseIfStatement = {
    type: "elseif",
    requirement: Token[],
    scope: Statement[],
    valueRequirement: string,
    input: string,
    elseToken: Token,
    ifToken: Token
};
export type PrintStatement = {
    type: "print",
    text: string,
    input: string,
    printToken: Token
};
export type ThrowStatement = {
    type: "throw",
    text: string,
    endIndex: number,
    input: string,
    throwToken: Token
};

export type Statement = SetVariableStatement
    | SetFunctionStatement
    | InlineExecutionStatement
    | RepeatUntilStatement
    | LoopStatement
    | ReturnStatement
    | BreakStatement
    | IfStatement
    | ElseStatement
    | ElseIfStatement
    | PrintStatement
    | ThrowStatement;

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
                if (p.opener.value === "(" && !strictMode && back && back.type === "word") {
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

function findToken(index: number, tokens: Token[], finder: (token: Token) => boolean): [number, Token[]] | null { // EOL = End of the line
    const collects: Token[] = [];
    for (; index < tokens.length; index++) {
        const token = tokens[index];
        collects.push(token);
        if (finder(token)) {
            return [index, collects];
        }
    }
    return null; // no match
}

export function interpret(code: string, tokens: Token[]) {
    const statements: Statement[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const next1 = tokens[i + 1];
        if (token.type === "word") {
            if (next1) {
                if ((token.value === "let" || token.value === "const" && next1.type === "word") || next1.value === "=") {
                    let name = token;
                    if (next1.type === "word") {
                        const next2 = tokens[i + 2];
                        if (next2.value !== "=") {
                            throwError(code, next1.index, "Expected an equals sign after the variable name.", next1.value.length);
                        }
                        name = next1;
                        i++;
                    }
                    i += 2;
                    const [nI, collects] = findEOL(i, tokens);
                    i = nI;
                    const nt = tokens[i];
                    if (collects.length < 1) {
                        throwError(code, token.index, "Expected an expression for the variable declaration statement.");
                    }
                    statements.push({
                        type: "set_variable",
                        name: name,
                        value: collects,
                        input: code.substring(token.index, nt.index + nt.value.length),
                        new: next1.type === "word",
                        constant: next1.type === "word" && token.value === "const"
                    });
                    continue;
                }
                if (token.value === "return") {
                    i++;
                    const [nI, collects] = findEOL(i, tokens);
                    i = nI;
                    const nt = tokens[i];
                    if (collects.length < 1) {
                        throwError(code, token.index, "Expected an expression for the return statement.", token.value.length);
                    }
                    statements.push({
                        type: "return",
                        value: collects,
                        input: code.substring(token.index, nt.index + nt.value.length),
                        returnToken: token
                    });
                    continue;
                }
                if (token.value === "if") {
                    i++;
                    const find = findToken(i, tokens, token => token.type === "group" && token.opener.value === "{");
                    if (!find) {
                        throwError(code, token.index, "Expected a scope for the if statement inside curly brackets.", token.value.length);
                        throw "";
                    }
                    const [nI, collects] = find;
                    i = nI;
                    if (collects.length < 2) {
                        throwError(code, token.index, "An if statement has to have a requirement expression.", token.value.length);
                    }
                    const last = <GroupToken>collects.splice(-1, 1)[0];
                    const last2 = <Token>collects.at(-1);
                    statements.push({
                        type: "if",
                        requirement: collects,
                        scope: interpret(code, last.children),
                        valueRequirement: code.substring(collects[0].index, last2.index + last2.value.length),
                        input: code.substring(token.index, last.index + last.value.length),
                        ifToken: token
                    });
                    continue;
                }
                if (token.value === "else" && next1 && next1.type === "group" && next1.opener.value === "{") {
                    i++;
                    const lastSt = statements[statements.length - 1];
                    if (!lastSt || (lastSt.type !== "if" && lastSt.type !== "elseif")) {
                        throwError(code, token.index, "Expected an if statement before an else statement.", token.value.length)
                    }
                    statements.push({
                        type: "else",
                        scope: interpret(code, next1.children),
                        input: code.substring(token.index, next1.index + next1.value.length),
                        elseToken: token
                    });
                    continue;
                }
                if (token.value === "else" && next1.type === "word" && next1.value === "if") {
                    i += 2;
                    const find = findToken(i, tokens, token => token.type === "group" && token.opener.value === "{");
                    if (!find) {
                        throwError(code, token.index, "Expected a scope for the else-if statement inside curly brackets.", token.value.length);
                        throw "";
                    }
                    const [nI, collects] = find;
                    i = nI;
                    if (collects.length < 2) {
                        throwError(code, token.index, "An else-if statement has to have a requirement expression.", token.value.length);
                    }
                    const lastSt = statements[statements.length - 1];
                    if (!lastSt || (lastSt.type !== "if" && lastSt.type !== "elseif")) {
                        throwError(code, token.index, "Expected an if statement before an else-if statement.", token.value.length)
                    }
                    const last = <GroupToken>collects.splice(-1, 1)[0];
                    const last2 = <Token>collects.at(-1);
                    statements.push({
                        type: "elseif",
                        requirement: collects,
                        scope: interpret(code, last.children),
                        valueRequirement: code.substring(collects[0].index, last2.index + last2.value.length),
                        input: code.substring(token.index, last.index + last.value.length),
                        elseToken: token,
                        ifToken: next1
                    });
                    continue;
                }
                if (token.value === "print") {
                    i++;
                    const [nI, collects] = findEOL(i, tokens);
                    if (collects.length > 0) {
                        i = nI;
                        const last = collects[collects.length - 1];
                        const text = code.substring(collects[0].index, last.index + last.value.length);
                        statements.push({
                            type: "print",
                            text,
                            input: code.substring(token.index, next1.index + next1.value.length),
                            printToken: token
                        });
                        continue;
                    } else i--;
                }
                if (token.value === "throw") {
                    i++;
                    const [nI, collects] = findEOL(i, tokens);
                    if (collects.length > 0) {
                        i = nI;
                        const last = collects[collects.length - 1];
                        const text = code.substring(collects[0].index, last.index + last.value.length);
                        statements.push({
                            type: "throw",
                            text,
                            endIndex: i,
                            input: code.substring(token.index, next1.index + next1.value.length),
                            throwToken: token
                        });
                        continue;
                    } else i--;
                }
            }
            if (token.value === "break") {
                statements.push({
                    type: "break",
                    input: token.value,
                    breakToken: token
                });
                continue;
            }
            if (token.value === "repeat" && next1 && next1.value === "until") {
                i += 2;
                const find = findToken(i, tokens, token => token.type === "group" && token.opener.value === "{");
                if (!find) {
                    throwError(code, token.index, "Expected a scope for the 'repeat until' statement inside curly brackets.", next1.index + next1.value.length - token.index);
                    throw "";
                }
                const [nI, collects] = find;
                i = nI;
                if (collects.length < 2) {
                    throwError(code, token.index, "A 'repeat until' statement has to have a requirement expression.", next1.index + next1.value.length - token.index);
                }
                const last = <GroupToken>collects.splice(-1, 1)[0];
                const last2 = <Token>collects.at(-1);
                statements.push({
                    type: "repeat_until",
                    requirement: collects,
                    scope: interpret(code, last.children),
                    valueRequirement: code.substring(collects[0].index, last2.index + last2.value.length),
                    input: code.substring(token.index, last.index + last.value.length),
                    repeatToken: token
                });
                continue;
            }
            if (token.value === "loop" && next1.type === "group" && next1.opener.value === "{") {
                i++;
                statements.push({
                    type: "loop",
                    scope: interpret(code, next1.children),
                    input: code.substring(token.index, next1.index + next1.value.length),
                    loopToken: token
                });
                continue;
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