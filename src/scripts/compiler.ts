import {Statement} from "./interpreter";
import {BigNumber} from "bignumber.js";
import {default as Fraction} from "fraction.js";
import {Decimal} from "decimal.js";
import {CallFunctionToken, FloatToken, GroupToken, IntegerToken, Token, WordToken} from "./tokenizer";
import {throwError} from "./error";
import {MathTool, MathToolNumber, MathTools, MathToolType} from "./number_tools";

export type Variables<T> = Record<string, T>;

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
    functions: Record<string, { arguments: string[], code: Token[] }> = {};
    code: string;
    tool: MathTool<MathToolNumber<T>>;
    class: any;

    constructor(code: string, tool: T) {
        this.code = code;
        this.tool = MathTools[tool];
        this.class = {bignumber: BigNumber, fraction: Fraction, decimal: Decimal}[tool];
    };

    compile(statements: Statement[], variables: Variables<N> = {}) {
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
                result.push({
                    type: "set_variable",
                    input: statement.input,
                    output: [statement.name.value, "is set to", res],
                    time: performance.now() - s
                });
                variables[statement.name.value] = res;
                continue;
            }
            if (statement.type === "set_function") {
                result.push({
                    type: "set_function",
                    input: statement.input,
                    output: [`${statement.name.value}(${statement.arguments.join(", ")})`, "is set to", statement.valueInput],
                    time: performance.now() - s
                });
                this.functions[statement.name.value] = {
                    arguments: statement.arguments,
                    code: statement.value
                };
            }
        }
        return result;
    };

    executeExpression(index: number, expression: Token[], variables: Variables<N>) {
        if (expression.length === 0) throwError(this.code, index, "Empty expression.", 2);
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
        if (!(name in variables)) {
            throwError(this.code, token.index, "Undefined variable.", token.value.length);
        }
        return variables[name];
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
        const processedArgs = [];
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.length === 0) {
                if (i !== 0) {
                    const a = args[i - 1];
                    throwError(this.code, a[a.length - 1].index, "Unexpected end of the call argument.");
                }
            }
            processedArgs[i] = this.executeExpression(arg[0].index, arg, variables);
        }
        const name = token.name.value;
        const builtIn = this.tool.functions[name];
        if (builtIn) {
            if (builtIn.arguments !== Infinity && builtIn.arguments !== processedArgs.length) {
                throwError(this.code, token.index, "Expected " + builtIn.arguments + ", got " + processedArgs.length, token.value.length);
            }
            return builtIn.run(processedArgs);
        }
        if (name === "exit") {
            throwError(this.code, token.index, "Exited the program.", token.value.length);
        }
        const func = this.functions[name];
        if (!func) throwError(this.code, token.name.index, "Undefined function.", token.name.value.length);
        if (func.arguments.length !== processedArgs.length) {
            throwError(this.code, token.index, "Expected " + func.arguments.length + ", got " + processedArgs.length, token.value.length);
        }
        const vars = {...variables};
        for (let i = 0; i < processedArgs.length; i++) {
            vars[func.arguments[i]] = processedArgs[i];
        }
        return this.executeExpression(token.index, func.code, vars);
    };
}