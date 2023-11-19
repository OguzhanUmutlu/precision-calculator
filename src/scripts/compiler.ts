import {Statement} from "./interpreter";
import {BigNumber} from "bignumber.js";
import {default as Fraction} from "fraction.js";
import {Decimal} from "decimal.js";
import {CallFunctionToken, FloatToken, GroupToken, IntegerToken, Token, WordToken} from "./tokenizer";
import {throwError} from "./error";
import {MathTool, MathToolNumber, MathTools, MathToolType} from "./number_tools";

export type NumberVariable<T> = {
    type: "number", value: T
};
export type FunctionVariable = {
    type: "function", arguments: string[], code: Token[]
};
export type AnyVariable<T> = NumberVariable<T> | FunctionVariable;
export type Variables<T> = Record<string, AnyVariable<T>>;

export type CompileResult<N> = {
    type: "inline_execution" | "set_variable" | "set_function",
    input: string,
    output: (N | string)[],
    time: number
};

const operators: Record<string, { p: number, a: "right" | "left" }> = {
    "^": {
        p: 4,
        a: "right",
    },
    "*": {
        p: 3,
        a: "left",
    },
    "/": {
        p: 3,
        a: "left",
    },
    "+": {
        p: 2,
        a: "left",
    },
    "-": {
        p: 2,
        a: "left",
    },
};

export class Compiler<T extends MathToolType = MathToolType, N extends MathToolNumber<T> = MathToolNumber<T>> {
    variables: Variables<N> = {};
    code: string;
    tool: MathTool<MathToolNumber<T>>;
    class: any;
    strictMode: boolean;

    constructor(code: string, tool: T, strictMode: boolean) {
        this.code = code;
        this.strictMode = strictMode;
        this.tool = MathTools[tool];
        this.class = {bignumber: BigNumber, fraction: Fraction, decimal: Decimal}[tool];
    };

    compile(statements: Statement[], variables: Variables<N> = this.variables) {
        const result: CompileResult<N>[] = [];
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            const s = performance.now();
            if (statement.type === "inline_execution") {
                const res = this.executeExpression(
                    statement.value[0].index,
                    statement.value, variables
                );
                result.push({
                    type: "inline_execution",
                    input: statement.input,
                    output: [res],
                    time: performance.now() - s
                });
                continue;
            }
            if (statement.type === "set_variable") {
                const res = this.executeExpression(
                    statement.name.index + statement.name.value.length,
                    statement.value, variables
                );
                if (this.strictMode && statement.name.value.length !== 1) {
                    throwError(this.code, statement.name.index, "In strict mode, variable names can't have more than one character.", statement.name.value.length);
                }
                result.push({
                    type: "set_variable",
                    input: statement.input,
                    output: [statement.name.value, "is set to", res],
                    time: performance.now() - s
                });
                variables[statement.name.value] = {
                    type: "number", value: res
                };
                continue;
            }
            if (statement.type === "set_function") {
                result.push({
                    type: "set_function",
                    input: statement.input,
                    output: [`${statement.name.value}(${statement.arguments.join(", ")})`, "is set to", statement.valueInput],
                    time: performance.now() - s
                });
                variables[statement.name.value] = {
                    type: "function", arguments: statement.arguments, code: statement.value
                };
            }
        }
        return result;
    };

    executeExpression(index: number, expression: Token[], variables: Variables<N>) {
        if (expression.length === 0) throwError(this.code, index, "Empty expression.", 2);
        if (this.strictMode) {
            const newExp: Token[] = [];
            for (const exp of expression) {
                if (exp.type === "word") {
                    for (let i = 0; i < exp.value.length; i++) {
                        newExp.push({type: "word", index: exp.index + i, value: exp.value[i]});
                    }
                    continue;
                }
                if (exp.type === "group") {
                    const back = newExp[newExp.length - 1];
                    if (back && back.type === "word") {
                        const vr = variables[back.value];
                        if (vr && vr.type === "function") {
                            newExp.splice(newExp.length - 1, 1, {
                                type: "call_function", value: back.value + exp.value, index: back.index,
                                name: back, opener: exp.opener, closer: exp.closer, arguments: exp
                            });
                            continue;
                        }
                    }
                }
                newExp.push(exp);
            }
            console.log(newExp);
        }
        if (expression.length === 1) return <N>this.expr(expression[0], variables);
        for (let i = 1; i < expression.length; i += 2) {
            const op = expression[i];
            const token = expression[i + 1];
            if (op.type !== "operator") {
                throwError(this.code, op.index, "Expected an operator.", op.value.length);
                break;
            }
            if (!token) {
                throwError(this.code, op.index, "Expected an expression after the operator.", op.value.length);
            }
            if (token.type === "operator") {
                throwError(this.code, token.index, "Unexpected operator.", token.value.length);
                break;
            }
        }
        const sy = this.makeShun(expression.map(i => this.expr(i, variables)));
        return this.evaluateSY(sy);
    };

    makeShun(tokens: (N | string)[]): (N | string)[] {
        const stack: (N | string)[] = [];
        const output: (N | string)[] = [];

        for (let token of tokens) {
            if (token instanceof this.class) {
                output.push(token);
                continue;
            }
            const o1 = token;
            let o2 = stack.at(-1);
            while (
                o2 !== undefined &&
                (operators[<string>o2].p > operators[<string>o1].p ||
                    (operators[<string>o2].p === operators[<string>o1].p &&
                        operators[<string>o1].a === "left"))
                ) {
                output.push(<(N | string)>stack.pop());
                o2 = stack.at(-1);
            }
            stack.push(o1);
        }

        while (stack.length !== 0) {
            output.push(<(N | string)>stack.pop());
        }

        return output;
    };

    evaluateSY(tokens: (N | string)[]) {
        const stack: (N | string)[] = [];

        for (let token of tokens) {
            if (token instanceof this.class) {
                stack.push(token);
                continue;
            }

            const right = <N>stack.pop();
            const left = <N>stack.pop();

            stack.push(<N>this.tool.basic(left, <string>token, right));
        }

        return <N>stack.pop();
    };

    expr(token: Token, variables: Variables<N>): N | string {
        switch (token.type) {
            case "symbol":
            case "operator":
                return token.value;
            case "integer":
            case "float":
                return this.exprInteger(token);
            case "word":
                return this.exprWord(token, variables);
            case "group":
                return this.exprGroup(token, variables);
            case "call_function":
                return <N>this.exprCallFunction(token, variables);
        }
    };

    exprInteger(token: IntegerToken | FloatToken) {
        return new (this.class)(token.value);
    };

    exprWord(token: WordToken, variables: Variables<N>) {
        const name = token.value;
        const vr = variables[name];
        if (!vr) {
            throwError(this.code, token.index, "Undefined variable.", token.value.length);
        }
        if (vr.type === "function") {
            throwError(this.code, token.index, "Cannot use a function as a variable.", token.value.length);
            throw "";
        }
        return vr.value;
    };

    exprGroup(token: GroupToken, variables: Variables<N>) {
        return this.executeExpression(token.index, token.children, variables);
    };

    exprCallFunction(token: CallFunctionToken, variables: Variables<N>) {
        const args: Token[][] = [[]];
        let j = 0;
        for (let i = 0; i < token.arguments.children.length; i++) {
            const t = token.arguments.children[i];
            if (t.value === ",") {
                if (args[j].length === 0) throwError(this.code, t.index, "Unexpected comma.");
                args.push([]);
                j++;
                continue;
            }
            args[j].push(t);
        }
        if (args[args.length - 1].length === 0) args.splice(args.length - 1, 1);
        const processedArgs: AnyVariable<N>[] = [];
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.length === 0) {
                if (i !== 0) {
                    const a = args[i - 1];
                    throwError(this.code, a[a.length - 1].index, "Unexpected end of the call argument.");
                }
            }
            if (arg.length === 1 && arg[0].type === "word") {
                const vr = variables[arg[0].value];
                if (vr && vr.type === "function") {
                    processedArgs[i] = vr;
                    continue;
                }
            }
            processedArgs[i] = {
                type: "number",
                value: this.executeExpression(arg[0].index, arg, variables)
            };
        }
        const name = token.name.value;
        const builtIn = this.tool.functions[name];
        if (builtIn) {
            if (builtIn.arguments !== Infinity && builtIn.arguments !== processedArgs.length) {
                throwError(this.code, token.index, "Expected " + builtIn.arguments + ", got " + processedArgs.length, token.value.length);
            }
            const numbers: N[] = [];
            for (let i = 0; i < processedArgs.length; i++) {
                const arg = processedArgs[i];
                if (arg.type === "function") {
                    throwError(this.code, token.index, "Functions cannot be used as arguments for built-in functions.", token.value.length);
                    throw "";
                }
                numbers.push(arg.value);
            }
            return builtIn.run(numbers);
        }
        if (name === "exit") {
            throwError(this.code, token.index, "Exited the program.", token.value.length);
        }
        const func = variables[name];
        if (!func) {
            throwError(this.code, token.name.index, "Undefined function.", token.name.value.length);
        }
        if (func.type === "number") {
            throwError(this.code, token.name.index, "Cannot use a numeric variable as a function.", token.name.value.length);
            throw "";
        }
        if (func.arguments.length !== processedArgs.length) {
            throwError(this.code, token.index, "Expected " + func.arguments.length + ", got " + processedArgs.length, token.value.length);
        }
        const vars = {...this.variables};
        for (let i = 0; i < processedArgs.length; i++) {
            vars[func.arguments[i]] = processedArgs[i];
        }
        return this.executeExpression(token.index, func.code, vars);
    };
}