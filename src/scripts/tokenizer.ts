export type BaseToken<T extends string> = { type: T, value: string, index: number }
export type SymbolToken = BaseToken<"symbol">;
export type OperatorToken = BaseToken<"operator">;
export type IntegerToken = BaseToken<"integer">;
export type FloatToken = BaseToken<"float">;
export type WordToken = BaseToken<"word">;
export type GroupToken = BaseToken<"group"> & {
    children: Token[], opener: Token, closer: Token
};
export type CallFunctionToken = BaseToken<"call_function"> & { // I know this is not a really a token.
    name: Token, opener: Token, closer: Token, arguments: GroupToken
};
export type Token =
    SymbolToken
    | OperatorToken
    | IntegerToken
    | FloatToken
    | WordToken
    | GroupToken
    | CallFunctionToken;

const Operators = [
    "+", "-", "*", "/", "%", "^", ">", "<", "~", "!"
];
const Operators2 = [">=", "<=", "==", "~="];
const Symbols = [
    "+", "-", "*", "/", "^", "=",
    "(", ")", "[", "]", "{", "}",
    ".", ",", "\n", ";", "\\"
];
const Ignores: string[] = [" "];
const Digits: string[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const AllExceptDigits: string[] = [
    ...Operators,
    ...Symbols,
    ...Ignores,
    //...Digits,
    "#"
];

export function tokenize(code: string) {
    const tokens: Token[] = [];
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (Ignores.includes(char)) continue;
        let f = false;
        for (const op of Operators2) {
            if (code.substring(i, i + op.length) === op) {
                f = true;
                tokens.push({type: "operator", index: i, value: op});
                i += op.length - 1;
                break;
            }
        }
        if (f) continue;
        if (Operators.includes(char)) {
            let last;
            const token: OperatorToken = {type: "operator", index: i, value: char};
            if (char === "!" && (last = tokens.splice(-1, 1))) {
                const par: SymbolToken = {type: "symbol", value: "(", index: i};
                tokens.push({
                    type: "group",
                    index: i,
                    children: [last[0], token],
                    value: last[0].value + "!",
                    opener: par,
                    closer: par
                });
                continue;
            }
            tokens.push(token);
            continue;
        }
        if (Symbols.includes(char)) {
            tokens.push({type: "symbol", index: i, value: char});
            continue;
        }
        if (Digits.includes(char)) {
            let integer = char;
            const start = i;
            i++;
            for (; i < code.length; i++) {
                const char1 = code[i];
                if (!Digits.includes(char1)) {
                    i--;
                    break;
                }
                integer += char1;
            }
            const l = tokens.length;
            const bf = tokens[l - 1];
            if (bf && bf.value === ".") {
                const befBf = tokens[l - 2];
                if (befBf && befBf.type === "integer") {
                    tokens.splice(l - 2, 2, {
                        type: "float", index: befBf.index, value: befBf.value + "." + integer,
                    });
                    continue;
                } else {
                    tokens.splice(l - 1, 1, {
                        type: "float", index: bf.index, value: "0." + integer,
                    });
                    continue;
                }
            }
            tokens.push({type: "integer", index: start, value: integer});
            continue;
        }
        if (char === "#") {
            for (; i < code.length; i++) {
                if (code[i] === "\n") break;
            }
            i--;
            continue;
        }
        let word = char;
        const start = i;
        i++;
        for (; i < code.length; i++) {
            const char1 = code[i];
            if (AllExceptDigits.includes(char1)) {
                i--;
                break;
            }
            word += char1;
        }
        tokens.push({type: "word", index: start, value: word});
    }
    return tokens;
}