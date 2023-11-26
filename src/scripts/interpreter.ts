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
export type RepeatTimesStatement = {
    type: "repeat_times",
    amount: Token[],
    scope: Statement[],
    valueAmount: string,
    input: string,
    repeatToken: Token,
    timesToken: Token
};
export type RepeatTimesWithStatement = {
    type: "repeat_times_with",
    amount: Token[],
    variable: string,
    scope: Statement[],
    valueAmount: string,
    input: string,
    repeatToken: Token,
    timesToken: Token,
    withToken: Token
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
    | ThrowStatement
    | RepeatTimesStatement
    | RepeatTimesWithStatement;

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
                if (next1.type === "operator") {
                    const next2 = tokens[i + 2];
                    if (next1.value === next2.value && (next1.value === "+" || next1.value === "-")) {
                        i += 2;
                        statements.push({
                            type: "set_variable",
                            name: token,
                            value: [
                                {type: "word", index: token.index, value: token.value},
                                next1,
                                {type: "integer", index: token.index, value: "1"}
                            ],
                            input: token.value + " = " + token.value + " + 1",
                            new: false,
                            constant: false
                        });
                        continue;
                    }
                    if (next2.value === "=") {
                        i += 3;
                        const [nI, collects] = findEOL(i, tokens);
                        i = nI;
                        if (collects.length < 1) {
                            throwError(code, token.index, "Expected an expression for the variable declaration statement.");
                        }
                        const fs = collects[0];
                        const ls = collects[collects.length - 1];
                        statements.push({
                            type: "set_variable",
                            name: token,
                            value: [
                                {type: "word", index: token.index, value: token.value},
                                next1,
                                {
                                    type: "group",
                                    value: "",
                                    children: collects,
                                    index: token.index,
                                    opener: {type: "symbol", value: "(", index: token.index},
                                    closer: {type: "symbol", value: ")", index: token.index}
                                }
                            ],
                            input: token.value + " = " + token.value + " * (" + code.substring(fs.index, ls.index + ls.value.length) + ")",
                            new: false,
                            constant: false
                        });
                        continue;
                    }
                }
                if (((token.value === "let" || token.value === "const") && next1.type === "word") || next1.value === "=") {
                    // let x = 10 + 20
                    // const x = 10 + 20
                    // x = 10 + 20
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
                    // return x + y
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
                    // if x == y {}
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
                    if (last.type !== "group") {
                        throwError(code, last.index, "Expected a curly brace scope for the if statement.")
                    }
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
                    // { 2 + 2 }
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
                    // else if x == y {}
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
                    if (last.type !== "group") {
                        throwError(code, last.index, "Expected a curly brace scope for the else-if statement.")
                    }
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
                    // print some text
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
                    // throw some text
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
                if (token.value === "repeat") {
                    i++;
                    const find = findToken(i, tokens, token => token.type === "group" && token.opener.value === "{");
                    if (!find) {
                        throwError(code, token.index, "Expected a scope for the repeat statement inside curly brackets.", next1.index + next1.value.length - token.index);
                        throw "";
                    }
                    const [nI, collects] = find;
                    i = nI;
                    const ls2 = collects[collects.length - 2];
                    const ls3 = collects[collects.length - 3];
                    const ls4 = collects[collects.length - 4];
                    if (next1.value === "until") {
                        // repeat until a == b {}
                        collects.splice(0, 1);
                        if (collects.length < 2) {
                            throwError(code, token.index, "A repeat-until statement has to have a requirement expression.", next1.index + next1.value.length - token.index);
                        }
                        const last = <GroupToken>collects.splice(-1, 1)[0];
                        if (last.type !== "group") {
                            throwError(code, last.index, "Expected a curly brace scope for the repeat-until statement.")
                        }
                        const last2 = <Token>collects.at(-1);
                        statements.push({
                            type: "repeat_until",
                            requirement: collects,
                            scope: interpret(code, last.children),
                            valueRequirement: code.substring(collects[0].index, last2.index + last2.value.length),
                            input: code.substring(token.index, last.index + last.value.length),
                            repeatToken: token
                        });
                    } else if (ls2 && ls2.type === "word" && ls2.value === "times") {
                        // repeat a + b + c times {}
                        collects.splice(collects.length - 2, 1);
                        if (collects.length < 2) {
                            throwError(code, token.index, "Repeat-times statement has to have an amount expression given to it.", next1.index + next1.value.length - token.index);
                        }
                        const last = <GroupToken>collects.splice(-1, 1)[0];
                        if (last.type !== "group") {
                            throwError(code, last.index, "Expected a curly brace scope for the repeat-times statement.")
                        }
                        const last2 = <Token>collects.at(-1);
                        statements.push({
                            type: "repeat_times",
                            amount: collects,
                            scope: interpret(code, last.children),
                            valueAmount: code.substring(collects[0].index, last2.index + last2.value.length),
                            input: code.substring(token.index, last.index + last.value.length),
                            repeatToken: token,
                            timesToken: ls2
                        });
                    } else if (ls4 && ls4.value === "times" && ls3.value === "with" && ls2.type === "word") {
                        // repeat a + b + c times with i {}
                        // where 'i' is going from 1 to (a + b + c)
                        collects.splice(collects.length - 4, 3);
                        if (collects.length < 2) {
                            throwError(code, token.index, "Repeat-times statement has to have an amount expression given to it.", next1.index + next1.value.length - token.index);
                        }
                        const last = <GroupToken>collects.splice(-1, 1)[0];
                        if (last.type !== "group") {
                            throwError(code, last.index, "Expected a curly brace scope for the repeat-times statement.")
                        }
                        const last2 = <Token>collects.at(-1);
                        statements.push({
                            type: "repeat_times_with",
                            amount: collects,
                            variable: ls2.value,
                            scope: interpret(code, last.children),
                            valueAmount: code.substring(collects[0].index, last2.index + last2.value.length),
                            input: code.substring(token.index, last.index + last.value.length),
                            repeatToken: token,
                            timesToken: ls4,
                            withToken: ls3
                        });
                    } else {
                        throwError(code, token.index, "Invalid repeat statement.", token.value.length);
                    }
                    continue;
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