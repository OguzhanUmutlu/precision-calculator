import {interpret, Statement} from "./interpreter";
import {BigNumber} from "bignumber.js";
import {default as Fraction} from "fraction.js";
import {Decimal} from "decimal.js";
import {CallFunctionToken, FloatToken, GroupToken, IntegerToken, Token, WordToken} from "./tokenizer";
import {throwError} from "./error";
import {MathTool, MathToolFunction, MathToolNumber, MathTools, MathToolType} from "./number_tools";

export type NumberVariable<N> = {
    type: "number", value: N, constant: boolean
};
export type BuiltInFunctionVariable<N> = {
    type: "function", arguments: number, run: MathToolFunction<N>["run"], constant: boolean, special: true
};
export type FunctionVariable = {
    type: "function", arguments: string[], code: Token[], constant: boolean, special: false
};
export type AnyVariable<N> = NumberVariable<N> | BuiltInFunctionVariable<N> | FunctionVariable;
export type Variables<N> = Record<string, AnyVariable<N>>;
export type Scope<N> = {
    parent?: Scope<N>,
    variables: Variables<N>
};

export type CompileResult<N> = {
    type: Statement["type"],
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
    "~": {
        p: 2,
        a: "left",
    },
};

function isTrue(req: MathToolNumber<MathToolType>) {
    if (req instanceof BigNumber) return !req.isZero();
    if (req instanceof Decimal) return !req.isZero();
    return !req.equals(0);
}

export class Runner<T extends MathToolType = MathToolType, N extends MathToolNumber<T> = MathToolNumber<T>> {
    variables: Variables<N> = {};
    code: string;
    tool: MathTool<N>;
    class: any;
    strictMode: boolean;
    type: T;
    result: CompileResult<N>[] = [];

    constructor(code: string, type: T, strictMode: boolean) {
        this.code = code;
        this.strictMode = strictMode;
        this.tool = <MathTool<N>>MathTools[type];
        this.class = {bignumber: BigNumber, fraction: Fraction, decimal: Decimal}[type];
        this.type = type;

        for (const name in this.tool.functions) {
            const fn = this.tool.functions[name];
            this.variables[name] = {
                type: "function",
                constant: false,
                special: true,
                arguments: fn.arguments,
                run: fn.run
            };
        }

        for (const name in this.tool.constants) {
            this.variables[name] = {
                type: "number",
                value: this.tool.constants[name],
                constant: true
            }
        }
    };

    findVariable(scope: Scope<N>, name: string) {
        let parent = scope;
        for (; ;) {
            const vr = parent.variables[name];
            if (vr) return {scope: parent, variable: vr};
            if (!parent.parent) return null;
            parent = parent.parent;
        }
    };

    compile(statements: Statement[], parent: Scope<N>): CompileResult<N> | null {
        const scope: Scope<N> = {
            parent, variables: {}
        };
        let lastResult: CompileResult<N> | null = null;
        let lastIf = false;
        const breakResult: CompileResult<N> = {
            type: "break",
            input: "break",
            output: [new this.class("0")],
            time: 0
        };
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            const s = Date.now();
            if (statement.type === "break") {
                lastResult = breakResult;
                break;
            }
            if (statement.type === "return") {
                const res = this.executeExpression(
                    statement.value[0].index,
                    statement.value, scope
                );
                lastResult = {
                    type: "inline_execution",
                    input: statement.input,
                    output: [res],
                    time: Date.now() - s
                };
                break;
            }
            if (statement.type === "inline_execution") {
                const res = this.executeExpression(
                    statement.value[0].index,
                    statement.value, scope
                );
                const first = statement.value[0];
                if (statement.value.length > 1 || !(first.type === "group" && first.opener.value === "{")) {
                    this.result.push(lastResult = {
                        type: "inline_execution",
                        input: statement.input,
                        output: [res],
                        time: Date.now() - s
                    });
                }
                continue;
            }
            if (statement.type === "set_variable") {
                if (this.strictMode && statement.name.value.length !== 1) {
                    throwError(this.code, statement.name.index, "In strict mode, variable names can't have more than one character.", statement.name.value.length);
                }
                const existing = this.findVariable(scope, statement.name.value);
                if (existing && existing.variable.constant) {
                    if (statement.name.value === "π") {
                        throwError(this.code, statement.name.index, "π ≠ " + statement.valueInput, statement.name.value.length);
                    }
                    throwError(this.code, statement.name.index, "Cannot redeclare constants.", statement.name.value.length);
                }
                if (existing && existing.scope === scope && statement.constant) {
                    throwError(this.code, statement.name.index, "Cannot redeclare a variable as a constant.", statement.name.value.length);
                }
                const res = this.executeExpression(
                    statement.name.index + statement.name.value.length,
                    statement.value, scope
                );
                lastResult = {
                    type: "set_variable",
                    input: statement.input,
                    output: [statement.name.value, "is set to", res],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/
                if (existing && !statement.new) {
                    Object.assign(existing.variable, {
                        type: "number", value: res, constant: false
                    });
                } else {
                    scope.variables[statement.name.value] = {
                        type: "number", value: res, constant: statement.constant
                    };
                }
                continue;
            }
            if (statement.type === "set_function") {
                lastResult = {
                    type: "set_function",
                    input: statement.input,
                    output: [`${statement.name.value}(${statement.arguments.join(", ")})`, "is set to", statement.valueInput],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/
                const existing = this.findVariable(scope, statement.name.value);
                if (existing && existing.variable.constant) {
                    throwError(this.code, statement.name.index, "Cannot redeclare constants.", statement.name.value.length);
                }
                const fn: FunctionVariable = {
                    type: "function",
                    arguments: statement.arguments,
                    code: statement.value,
                    constant: false,
                    special: false
                };
                if (existing) {
                    Object.assign(existing.variable, fn);
                } else {
                    scope.variables[statement.name.value] = fn;
                }
                continue;
            }
            if (statement.type === "repeat_until") {
                lastResult = {
                    type: "repeat_until",
                    input: statement.input,
                    output: [`a repeat loop will continue until`, statement.valueRequirement],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/

                for (; ;) {
                    const req = this.executeExpression(statement.repeatToken.index, statement.requirement, scope);
                    if (isTrue(req)) break;
                    const res = this.compile(statement.scope, scope);
                    if (res && res.type === "break") {
                        break;
                    }
                }
                continue;
            }
            if (statement.type === "loop") {
                lastResult = {
                    type: "loop",
                    input: statement.input,
                    output: ["loop"],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/

                for (; ;) {
                    const res = this.compile(statement.scope, scope);
                    if (res && res.type === "break") {
                        break;
                    }
                }
                continue;
            }
            if (statement.type === "if") {
                lastResult = {
                    type: "if",
                    input: statement.input,
                    output: [`the code will be executed if`, statement.valueRequirement],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/

                const req = this.executeExpression(statement.ifToken.index, statement.requirement, scope);
                const st = isTrue(req);
                lastIf = st;
                if (st) {
                    const res = this.compile(statement.scope, scope);
                    if (res && res.type === "break") {
                        lastResult = res;
                        break;
                    }
                }
            }
            if (statement.type === "repeat_times") {
                lastResult = {
                    type: "repeat_times",
                    input: statement.input,
                    output: [`a repeat loop will continue`, statement.valueAmount, `times`],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/

                const r = this.executeExpression(statement.repeatToken.index, statement.amount, scope);
                const amount = parseFloat("toFixed" in r ? r.toFixed() : r.toString());
                let breaks = false;
                for (let i = 0; i < amount; i++) {
                    const res = this.compile(statement.scope, scope);
                    if (res && res.type === "break") {
                        breaks = true;
                        break;
                    }
                }
                if (breaks) break;
                continue;
            }
            if (statement.type === "repeat_times_with") {
                lastResult = {
                    type: "repeat_times_with",
                    input: statement.input,
                    output: [`a repeat loop will continue`, statement.valueAmount, `times`],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/

                const r = this.executeExpression(statement.repeatToken.index, statement.amount, scope);
                const amount = parseFloat("toFixed" in r ? r.toFixed() : r.toString());
                let breaks = false;
                for (let i = 0; i < amount; i++) {
                    const res = this.compile(statement.scope, {
                        parent: scope,
                        variables: {i: {type: "number", value: new this.class(i + 1), constant: true}}
                    });
                    if (res && res.type === "break") {
                        breaks = true;
                        break;
                    }
                }
                if (breaks) break;
                continue;
            }
            if (statement.type === "else") {
                lastResult = {
                    type: "else",
                    input: statement.input,
                    output: [`the code will be executed if the last if succeeded`],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/
                if (!lastIf) {
                    const res = this.compile(statement.scope, scope);
                    if (res && res.type === "break") {
                        lastResult = res;
                        break;
                    }
                }
            }
            if (statement.type === "elseif") {
                lastResult = {
                    type: "elseif",
                    input: statement.input,
                    output: [`the code will be executed if the last if succeeded and if`, statement.valueRequirement],
                    time: Date.now() - s
                };
                /*this.result.push(lastResult);*/
                if (!lastIf) {
                    const req = this.executeExpression(statement.ifToken.index, statement.requirement, scope);
                    const s = isTrue(req);
                    lastIf = s;
                    if (s) {
                        const res = this.compile(statement.scope, scope);
                        if (res && res.type === "break") {
                            lastResult = res;
                            break;
                        }
                    }
                }
            }
            if (statement.type === "print") {
                lastResult = {
                    type: "print",
                    input: statement.input,
                    output: [statement.text],
                    time: Date.now() - s
                };
                this.result.push(lastResult);
            }
            if (statement.type === "throw") {
                throwError(this.code, statement.throwToken.index, statement.text, statement.endIndex - statement.throwToken.index);
            }
        }
        return lastResult;
    };

    executeExpression(index: number, expression: Token[], scope: Scope<N>) {
        if (expression.length === 0) throwError(this.code, index, "Empty expression.", 2);
        expression = expression.filter(i => i.value !== "\n");
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
                        const vr = this.findVariable(scope, back.value);
                        if (vr && vr.variable.type === "function") {
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
        }
        if (expression[0].type === "operator" && (expression[0].value === "-" || expression[0].value === "+")) {
            expression.splice(0, 0, {
                type: "integer", value: "0", index: expression[0].index
            });
        }
        if (expression.length === 2 && expression[1].type === "operator" && expression[1].value === "!") {
            return this.tool.functions.fac.run([<N>this.expr(expression[0], scope)]);
        }
        if (expression.length === 1) return <N>this.expr(expression[0], scope);
        for (let i = 1; i < expression.length; i += 2) {
            const op = expression[i];
            const token = expression[i + 1];
            if (op.type !== "operator") {
                expression.splice(i, 0, {type: "operator", index: op.index, value: "*"});
                i -= 2;
                continue;
                //throwError(this.code, op.index, "Expected an operator.", op.value.length);
                //break;
            }
            if (!token) {
                throwError(this.code, op.index, "Expected an expression after the operator.", op.value.length);
            }
            if (token.type === "operator") {
                throwError(this.code, token.index, "Unexpected operator.", token.value.length);
                break;
            }
        }
        const sy = this.makeShun(expression.map(i => this.expr(i, scope)));
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

    expr(token: Token, scope: Scope<N>): N | string {
        switch (token.type) {
            case "symbol":
            case "operator":
                return token.value;
            case "integer":
            case "float":
                return this.exprInteger(token);
            case "word":
                return this.exprWord(token, scope);
            case "group":
                return this.exprGroup(token, scope);
            case "call_function":
                return <N>this.exprCallFunction(token, scope);
        }
    };

    exprInteger(token: IntegerToken | FloatToken) {
        return new (this.class)(token.value);
    };

    exprWord(token: WordToken, scope: Scope<N>) {
        const name = token.value;
        const vr = this.findVariable(scope, name);
        if (!vr) {
            throwError(this.code, token.index, "Undefined variable.", token.value.length);
            throw "";
        }
        if (vr.variable.type === "function") {
            throwError(this.code, token.index, "Cannot use a function as a variable.", token.value.length);
            throw "";
        }
        return vr.variable.value;
    };

    exprGroup(token: GroupToken, scope: Scope<N>): N {
        if (token.opener.value === "{") {
            const last = this.compile(interpret(this.code, token.children), scope);
            if (!last || last.type !== "inline_execution") return new this.class("0");
            // this prevents printing out stuff when the last expression was an inline expression
            // this.result.splice(this.result.length - 1, 1);
            return <N>last.output[0];
        }
        return this.executeExpression(token.index, token.children, scope);
    };

    exprCallFunction(token: CallFunctionToken, scope: Scope<N>) {
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
                const vr = this.findVariable(scope, arg[0].value);
                if (vr && vr.variable.type === "function") {
                    processedArgs[i] = vr.variable;
                    continue;
                }
            }
            processedArgs[i] = {
                type: "number",
                value: <N>this.executeExpression(arg[0].index, arg, scope),
                constant: false
            };
        }
        const name = token.name.value;
        if (name === "exit") {
            throwError(this.code, token.index, "Exited the program.", token.value.length);
        }
        const func = this.findVariable(scope, name);
        if (!func) {
            throwError(this.code, token.name.index, "Undefined function.", token.name.value.length);
            throw "";
        }
        if (func.variable.type === "number") {
            throwError(this.code, token.name.index, "Cannot use a numeric variable as a function.", token.name.value.length);
            throw "";
        }
        if (func.variable.special) {
            if (func.variable.arguments !== Infinity && processedArgs.length !== func.variable.arguments) {
                throwError(this.code, token.index, "Expected " + func.variable.arguments + " arguments, got " + processedArgs.length, token.value.length);
            }
            const bArgs: N[] = [];
            for (const a of processedArgs) {
                if (a.type !== "number") {
                    throwError(this.code, token.name.index, "Expected the number arguments for the built-in function: " + name, token.name.value.length);
                    throw "";
                }
                bArgs.push(a.value);
            }
            return func.variable.run(bArgs);
        }
        if (func.variable.arguments.length !== processedArgs.length) {
            throwError(this.code, token.index, "Expected " + func.variable.arguments.length + " arguments, got " + processedArgs.length, token.value.length);
        }
        const vars: Variables<N> = {};
        for (let i = 0; i < processedArgs.length; i++) {
            vars[func.variable.arguments[i]] = processedArgs[i];
        }
        return this.executeExpression(token.index, func.variable.code, {
            parent: scope,
            variables: vars
        });
    };
}