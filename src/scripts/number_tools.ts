import {default as Fraction} from "fraction.js";
import {BigNumber} from "bignumber.js";
import {Decimal} from "decimal.js";
import {PI} from "./symbols/pi";
import {E} from "./symbols/e";
import {getInput} from "./worker";
import {Runner} from "./runner";
import {CallFunctionToken} from "./tokenizer";
import Complex from "complex.js";

export type AnyMathToolNumber = BigNumber | Fraction | Decimal;
export type MathToolType = "bignumber" | "fraction" | "decimal" | "complex";
export type BasicOperators = string | "+" | "-" | "*" | "/" | "%" | "^" | "<" | ">" | "<=" | ">=";
export type MathToolNumber<T> = T extends "bignumber" ? BigNumber
    : (T extends "fraction" ? Fraction
        : (T extends "decimal" ? Decimal : Complex));
export type MathToolFunction<T> = {
    arguments: number,
    argumentData?: ("function" | "number")[],
    run(input: (T | CallFunctionToken)[], runner: Runner): T | Promise<T>;
};
export type MathTool<T> = {
    basic(a: T, op: BasicOperators, b: T): T;
    constants: Record<string, T>
    functions: Record<string, MathToolFunction<T>>
};

const bigZero = new BigNumber("0");
const bigOne = new BigNumber("1");
const bigThree = new BigNumber("3");
const bigNegativeOne = new BigNumber("-1");
const bigOneThird = bigOne.dividedBy(bigThree);
const bigPi = new BigNumber(PI);
const bigE = new BigNumber(E);
const bigInf = new BigNumber("Infinity");

const fractionZero = new Fraction("0");
const fractionOne = new Fraction("1");
const fractionPi = new Fraction(PI.substring(0, 309));
const fractionE = new Fraction(E.substring(0, 309));

const decimalZero = new Decimal("0");
const decimalOne = new Decimal("1");
const decimalPi = new Decimal(PI);
const decimalE = new Decimal(E);
const decimalInf = new Decimal("Infinity");

const complexThree = new Complex(3);
const complexOneThird = Complex.ONE.div(complexThree);
const complexLog10 = new Complex(10).log();

const bigFac: Record<number, BigNumber> = {};
const fracFac: Record<number, Fraction> = {};
const decFac: Record<number, Decimal> = {};
const comFac: Record<number, Complex> = {};

function complexMod(a: Complex, b: Complex) {
    // z mod w = z - w * floor(z / w)
    return a.sub(b.mul(a.div(b).floor(0)));
}

function fnMacro(fn: string, arg = 1) {
    return {
        arguments: arg, run(input: any) {
            return input[0][fn](...input.slice(1));
        }
    };
}

export const MathTools: { [T in MathToolType]: MathTool<MathToolNumber<T>> } = {
    bignumber: {
        basic(a, op, b) {
            switch (op) {
                case "+":
                    return a.plus(b);
                case "-":
                    return a.minus(b);
                case "*":
                    return a.times(b);
                case "/":
                    return a.dividedBy(b);
                case "%":
                    return a.mod(b);
                case "^":
                    return a.pow(b);
                case ">":
                    return a.isGreaterThan(b) ? bigOne : bigZero;
                case "<":
                    return a.isLessThan(b) ? bigOne : bigZero;
                case ">=":
                    return a.isGreaterThanOrEqualTo(b) ? bigOne : bigZero;
                case "<=":
                    return a.isLessThanOrEqualTo(b) ? bigOne : bigZero;
                case "==":
                    return a.isEqualTo(b) ? bigOne : bigZero;
                case "~=":
                    return a.isEqualTo(b) ? bigZero : bigOne;
                default:
                    throw new Error("Assumption failed.");
            }
        },
        constants: {
            "π": bigPi,
            "e": bigE,
            "∞": bigInf
        },
        functions: {
            input: {
                arguments: 0, async run() {
                    return new BigNumber(await getInput());
                }
            },
            mod: fnMacro("mod", 2),
            fac: {
                arguments: 1, run(input: [BigNumber]) {
                    const num = parseInt(input[0].toFixed());
                    if (bigFac[num]) return bigFac[num];
                    let product = new BigNumber(1);
                    for (let i = 2; i <= num; i++) {
                        bigFac[i] = product = product.times(i);
                    }
                    return product;
                }
            },
            abs: fnMacro("abs"),
            round: fnMacro("integerValue"),
            ceil: {
                arguments: 1, run(input: [BigNumber]) {
                    return input[0].integerValue(BigNumber.ROUND_CEIL);
                }
            },
            floor: {
                arguments: 1, run(input: [BigNumber]) {
                    return input[0].integerValue(BigNumber.ROUND_FLOOR);
                }
            },
            isFinite: {
                arguments: 1, run(input: [BigNumber]) {
                    return input[0].isFinite() ? bigOne : bigZero;
                }
            },
            isNaN: {
                arguments: 1, run(input: [BigNumber]) {
                    return input[0].isNaN() ? bigOne : bigZero;
                }
            },
            sign: {
                arguments: 1, run(input: [BigNumber]) {
                    return input[0].isPositive() ? bigOne : bigNegativeOne;
                }
            },
            sqrt: fnMacro("sqrt"),
            cbrt: {
                arguments: 1, run(input: [BigNumber]) {
                    return input[0].pow(bigOneThird);
                }
            },
            min: {
                arguments: Infinity, run(input: [BigNumber]) {
                    return BigNumber.min(...input);
                }
            },
            max: {
                arguments: Infinity, run(input: [BigNumber]) {
                    return BigNumber.max(...input);
                }
            },
            random: {
                arguments: 0, run() {
                    return BigNumber.random();
                }
            },
            sum: {
                arguments: Infinity, run(input: [BigNumber]) {
                    return BigNumber.sum(...input);
                }
            }
        }
    },
    fraction: {
        basic(a, op, b) {
            switch (op) {
                case "+":
                    return a.add(b);
                case "-":
                    return a.sub(b);
                case "*":
                    return a.mul(b);
                case "/":
                    return a.div(b);
                case "%":
                    return a.mod(b);
                case "^":
                    return a.pow(b);
                case ">": // 1
                    return a.compare(b) === 1 ? fractionOne : fractionZero;
                case "<": // -1
                    return a.compare(b) === -1 ? fractionOne : fractionZero;
                case ">=": // 0, 1
                    return a.compare(b) > -1 ? fractionOne : fractionZero;
                case "<=": // -1, 0
                    return a.compare(b) < 1 ? fractionOne : fractionZero;
                case "==":
                    return a.equals(b) ? fractionOne : fractionZero;
                case "~=":
                    return a.equals(b) ? fractionZero : fractionOne;
                default:
                    throw new Error("Assumption failed.");
            }
        },
        constants: {
            "π": fractionPi,
            "e": fractionE
        },
        functions: {
            input: {
                arguments: 0, async run() {
                    return new Fraction(await getInput());
                }
            },
            mod: fnMacro("mod", 2),
            fac: {
                arguments: 1, run(input: [Fraction]) {
                    const num = parseInt(input[0].toString());
                    if (fracFac[num]) return fracFac[num];
                    let product = new Fraction(1);
                    for (let i = 2; i <= num; i++) {
                        fracFac[i] = product = product.mul(i);
                    }
                    return product;
                }
            },
            gcd: fnMacro("gcd", 2),
            lcm: fnMacro("lcm", 2),
            ceil: fnMacro("ceil"),
            floor: fnMacro("floor"),
            round: fnMacro("round"),
            inverse: fnMacro("inverse")
        }
    },
    decimal: {
        basic(a, op, b) {
            switch (op) {
                case "+":
                    return a.plus(b);
                case "-":
                    return a.minus(b);
                case "*":
                    return a.times(b);
                case "/":
                    return a.dividedBy(b);
                case "%":
                    return a.mod(b);
                case "^":
                    return a.pow(b);
                case ">":
                    return a.greaterThan(b) ? decimalOne : decimalZero;
                case "<":
                    return a.lessThan(b) ? decimalOne : decimalZero;
                case ">=":
                    return a.greaterThanOrEqualTo(b) ? decimalOne : decimalZero;
                case "<=":
                    return a.lessThanOrEqualTo(b) ? decimalOne : decimalZero;
                case "==":
                    return a.equals(b) ? decimalOne : decimalZero;
                case "~=":
                    return a.equals(b) ? decimalZero : decimalOne;
                default:
                    throw new Error("Assumption failed.");
            }
        },
        constants: {
            "π": decimalPi,
            "e": decimalE,
            "∞": decimalInf
        },
        functions: {
            input: {
                arguments: 0, async run() {
                    return new Decimal(await getInput());
                }
            },
            mod: fnMacro("mod", 2),
            fac: {
                arguments: 1, run(input: [Decimal]) {
                    const num = parseInt(input[0].toFixed());
                    if (decFac[num]) return decFac[num];
                    let product = new Decimal(1);
                    for (let i = 2; i <= num; i++) {
                        decFac[i] = product = product.times(i);
                    }
                    return product;
                }
            },
            abs: fnMacro("abs"),
            ceil: fnMacro("ceil"),
            floor: fnMacro("floor"),
            clamp: fnMacro("clamp", 3),
            sqrt: fnMacro("sqrt"),
            cbrt: fnMacro("cbrt"),
            isFinite: {
                arguments: 1, run(input: [Decimal]) {
                    return input[0].isFinite() ? decimalOne : decimalZero;
                }
            },
            isNaN: {
                arguments: 1, run(input: [Decimal]) {
                    return input[0].isNaN() ? decimalOne : decimalZero;
                }
            },
            isInt: {
                arguments: 1, run(input: [Decimal]) {
                    return input[0].isInt() ? decimalOne : decimalZero;
                }
            },
            exp: fnMacro("exp"),
            ln: fnMacro("ln"),
            log: {
                arguments: 1, run(input: [Decimal]) {
                    return input[0].log(10);
                }
            },
            hypot: {
                arguments: Infinity, run(input: [Decimal]) {
                    return Decimal.hypot(...input);
                }
            },
            max: {
                arguments: Infinity, run(input: [Decimal]) {
                    return Decimal.max(...input);
                }
            },
            min: {
                arguments: Infinity, run(input: [Decimal]) {
                    return Decimal.min(...input);
                }
            },
            random: {
                arguments: 0, run() {
                    return Decimal.random();
                }
            },
            sin: fnMacro("sin"),
            cos: fnMacro("cos"),
            tan: fnMacro("tan"),
            asin: fnMacro("asin"),
            acos: fnMacro("acos"),
            atan: fnMacro("atan"),
            sinh: fnMacro("sinh"),
            cosh: fnMacro("cosh"),
            tanh: fnMacro("tanh"),
            asinh: fnMacro("asinh"),
            acosh: fnMacro("acosh"),
            atanh: fnMacro("atanh")
        }
    },
    complex: {
        basic(a, op, b) {
            let _a, _b;
            switch (op) {
                case "+":
                    return a.add(b);
                case "-":
                    return a.sub(b);
                case "*":
                    return a.mul(b);
                case "/":
                    return a.div(b);
                case "%":
                    return complexMod(a, b);
                case "^":
                    return a.pow(b);
                case ">":
                    _a = a.abs();
                    _b = b.abs();
                    return _a > _b ? Complex.ONE : Complex.ZERO;
                case "<":
                    _a = a.abs();
                    _b = b.abs();
                    return _a < _b ? Complex.ONE : Complex.ZERO;
                case ">=":
                    _a = a.abs();
                    _b = b.abs();
                    return _a >= _b ? Complex.ONE : Complex.ZERO;
                case "<=":
                    _a = a.abs();
                    _b = b.abs();
                    return _a <= _b ? Complex.ONE : Complex.ZERO;
                case "==":
                    return a.equals(b) ? Complex.ONE : Complex.ZERO;
                case "~=":
                    return a.equals(b) ? Complex.ZERO : Complex.ONE;
                default:
                    throw new Error("Assumption failed.");
            }
        },
        constants: {
            "π": Complex.PI,
            "e": Complex.E,
            "∞": Complex.INFINITY,
            "i": Complex.I
        },
        functions: {
            input: {
                arguments: 0, async run() {
                    return new Complex(await getInput());
                }
            },
            mod: {
                arguments: 2, run(input: [Complex, Complex]) {
                    return complexMod(input[0], input[1]);
                }
            },
            fac: {
                arguments: 1, run(input: [Complex]) {
                    const num = parseInt(input[0].toString());
                    if (comFac[num]) return comFac[num];
                    let product = Complex.ONE;
                    for (let i = 2; i <= num; i++) {
                        comFac[i] = product = product.mul(i);
                    }
                    return product;
                }
            },
            conjugate: fnMacro("conjugate"),
            Re: {
                arguments: 1, run(input: [Complex]) {
                    return new Complex(input[0].re);
                }
            },
            Im: {
                arguments: 1, run(input: [Complex]) {
                    return new Complex(input[0].im);
                }
            },
            abs: {
                arguments: 1, run(input: [Complex]) {
                    return new Complex(input[0].abs());
                }
            },
            arg: {
                arguments: 1, run(input: [Complex]) {
                    return new Complex(input[0].arg());
                }
            },
            floor: {
                arguments: 1, run(input: [Complex]) {
                    return input[0].floor(0);
                }
            },
            round: {
                arguments: 1, run(input: [Complex]) {
                    return input[0].round(0);
                }
            },
            ceil: {
                arguments: 1, run(input: [Complex]) {
                    return input[0].ceil(0);
                }
            },
            sqrt: fnMacro("sqrt"),
            cbrt: {
                arguments: 1, run(input: [Complex]) {
                    return input[0].pow(complexOneThird);
                }
            },
            exp: fnMacro("exp"),
            inverse: fnMacro("inverse"),
            ln: fnMacro("log"),
            log: {
                arguments: 1, run(input: [Complex]) {
                    return input[0].log().div(complexLog10);
                }
            },
            isFinite: fnMacro("isFinite"),
            isNaN: fnMacro("isNaN"),
            isReal: {
                arguments: 1, run(input: [Complex]) {
                    return input[0].im === 0 ? Complex.ONE : Complex.ZERO;
                }
            },
            sin: fnMacro("sin"),
            cos: fnMacro("cos"),
            tan: fnMacro("tan"),
            asin: fnMacro("asin"),
            acos: fnMacro("acos"),
            atan: fnMacro("atan"),
            sinh: fnMacro("sinh"),
            cosh: fnMacro("cosh"),
            tanh: fnMacro("tanh"),
            asinh: fnMacro("asinh"),
            acosh: fnMacro("acosh"),
            atanh: fnMacro("atanh")
        }
    }
};