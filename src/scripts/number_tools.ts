import {default as Fraction} from "fraction.js";
import {BigNumber} from "bignumber.js";
import {Decimal} from "decimal.js";
import {PI} from "./symbols/pi";
import {E} from "./symbols/e";

export type AnyMathToolNumber = BigNumber | Fraction | Decimal;
export type MathToolType = "bignumber" | "fraction" | "decimal";
export type BasicOperators = string | "+" | "-" | "*" | "/" | "%" | "^" | "<" | ">" | "<=" | ">=";
export type MathToolNumber<T> = T extends "bignumber" ? BigNumber : (T extends "fraction" ? Fraction : Decimal);
export type MathToolFunction<T> = {
    arguments: number,
    run(input: T[]): T;
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
const fractionPi = new Fraction(PI);
const fractionE = new Fraction(E);

const decimalZero = new Decimal("0");
const decimalOne = new Decimal("1");
const decimalPi = new Decimal(PI);
const decimalE = new Decimal(E);
const decimalInf = new Decimal("Infinity");

const bigFac: Record<number, BigNumber> = {};
const fracFac: Record<number, Fraction> = {};
const decFac: Record<number, Decimal> = {};

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
                case "!=":
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
            fac: {
                arguments: 1, run(input) {
                    const num = parseInt(input[0].toFixed());
                    if (bigFac[num]) return bigFac[num];
                    let product = new BigNumber(1);
                    for (let i = 2; i <= num; i++) {
                        product = product.times(i);
                    }
                    bigFac[num] = product;
                    return product;
                }
            },
            abs: {
                arguments: 1, run(input) {
                    return input[0].abs();
                }
            },
            round: {
                arguments: 1, run(input) {
                    return input[0].integerValue();
                }
            },
            ceil: {
                arguments: 1, run(input) {
                    return input[0].integerValue(BigNumber.ROUND_CEIL);
                }
            },
            floor: {
                arguments: 1, run(input) {
                    return input[0].integerValue(BigNumber.ROUND_FLOOR);
                }
            },
            isFinite: {
                arguments: 1, run(input) {
                    return input[0].isFinite() ? bigOne : bigZero;
                }
            },
            isNaN: {
                arguments: 1, run(input) {
                    return input[0].isNaN() ? bigOne : bigZero;
                }
            },
            sign: {
                arguments: 1, run(input) {
                    return input[0].isPositive() ? bigOne : bigNegativeOne;
                }
            },
            sqrt: {
                arguments: 1, run(input) {
                    return input[0].sqrt();
                }
            },
            cbrt: {
                arguments: 1, run(input) {
                    return input[0].pow(bigOneThird);
                }
            },
            min: {
                arguments: Infinity, run(input) {
                    return BigNumber.min(...input);
                }
            },
            max: {
                arguments: Infinity, run(input) {
                    return BigNumber.max(...input);
                }
            },
            random: {
                arguments: 0, run() {
                    return BigNumber.random();
                }
            },
            sum: {
                arguments: Infinity, run(input) {
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
                case "!=":
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
            fac: {
                arguments: 1, run(input) {
                    const num = parseInt(input[0].toString());
                    if (fracFac[num]) return fracFac[num];
                    let product = new Fraction(1);
                    for (let i = 2; i <= num; i++) {
                        product = product.mul(i);
                    }
                    fracFac[num] = product;
                    return product;
                }
            },
            gcd: {
                arguments: 2, run(input) {
                    return input[0].gcd(input[1]);
                }
            },
            lcm: {
                arguments: 2, run(input) {
                    return input[0].lcm(input[1]);
                }
            },
            ceil: {
                arguments: 1, run(input) {
                    return input[0].ceil();
                }
            },
            floor: {
                arguments: 1, run(input) {
                    return input[0].floor();
                }
            },
            round: {
                arguments: 1, run(input) {
                    return input[0].round();
                }
            },
            inverse: {
                arguments: 1, run(input) {
                    return input[0].inverse();
                }
            }
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
                case "!=":
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
            fac: {
                arguments: 1, run(input) {
                    const num = parseInt(input[0].toFixed());
                    if (decFac[num]) return decFac[num];
                    let product = new Decimal(1);
                    for (let i = 2; i <= num; i++) {
                        product = product.times(i);
                    }
                    decFac[num] = product;
                    return product;
                }
            },
            abs: {
                arguments: 1, run(input) {
                    return input[0].abs();
                }
            },
            ceil: {
                arguments: 1, run(input) {
                    return input[0].ceil();
                }
            },
            floor: {
                arguments: 1, run(input) {
                    return input[0].floor();
                }
            },
            clamp: {
                arguments: 2, run(input) {
                    return input[0].clamp(input[1], input[2]);
                }
            },
            sqrt: {
                arguments: 1, run(input) {
                    return input[0].sqrt();
                }
            },
            cbrt: {
                arguments: 1, run(input) {
                    return input[0].cbrt();
                }
            },
            isFinite: {
                arguments: 1, run(input) {
                    return input[0].isFinite() ? decimalOne : decimalZero;
                }
            },
            isNaN: {
                arguments: 1, run(input) {
                    return input[0].isNaN() ? decimalOne : decimalZero;
                }
            },
            isInt: {
                arguments: 1, run(input) {
                    return input[0].isInt() ? decimalOne : decimalZero;
                }
            },
            exp: {
                arguments: 1, run(input) {
                    return input[0].exp();
                }
            },
            ln: {
                arguments: 1, run(input) {
                    return input[0].ln();
                }
            },
            hypot: {
                arguments: Infinity, run(input) {
                    return Decimal.hypot(...input);
                }
            },
            max: {
                arguments: Infinity, run(input) {
                    return Decimal.max(...input);
                }
            },
            min: {
                arguments: Infinity, run(input) {
                    return Decimal.min(...input);
                }
            },
            random: {
                arguments: 0, run() {
                    return Decimal.random();
                }
            },
            sin: {
                arguments: 1, run(input) {
                    return input[0].sin();
                }
            },
            cos: {
                arguments: 1, run(input) {
                    return input[0].cos();
                }
            },
            tan: {
                arguments: 1, run(input) {
                    return input[0].tan();
                }
            },
            asin: {
                arguments: 1, run(input) {
                    return input[0].asin();
                }
            },
            acos: {
                arguments: 1, run(input) {
                    return input[0].acos();
                }
            },
            atan: {
                arguments: 1, run(input) {
                    return input[0].atan();
                }
            },
            sinh: {
                arguments: 1, run(input) {
                    return input[0].sinh();
                }
            },
            cosh: {
                arguments: 1, run(input) {
                    return input[0].cosh();
                }
            },
            tanh: {
                arguments: 1, run(input) {
                    return input[0].tanh();
                }
            },
            asinh: {
                arguments: 1, run(input) {
                    return input[0].asinh();
                }
            },
            acosh: {
                arguments: 1, run(input) {
                    return input[0].acosh();
                }
            },
            atanh: {
                arguments: 1, run(input) {
                    return input[0].atanh();
                }
            }
        }
    },
};