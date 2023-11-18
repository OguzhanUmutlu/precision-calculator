import {default as Fraction} from "fraction.js";
import {BigNumber} from "bignumber.js";
import {Decimal} from "decimal.js";

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
    functions: Record<string, MathToolFunction<T>>
};

const bigZero = new BigNumber("0");
const bigOne = new BigNumber("1");
const bigThree = new BigNumber("3");
const bigNegativeOne = new BigNumber("-1");
const bigOneThird = bigOne.dividedBy(bigThree);

const fractionZero = new Fraction("0");
const fractionOne = new Fraction("1");

const decimalZero = new Decimal("0");
const decimalOne = new Decimal("1");

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
                default:
                    throw new Error("Assumption failed.");
            }
        },
        functions: {
            abs: {
                arguments: 1,
                run(input) {
                    return input[0].abs();
                }
            },
            round: {
                arguments: 1,
                run(input) {
                    return input[0].integerValue();
                }
            },
            ceil: {
                arguments: 1,
                run(input) {
                    return input[0].integerValue(BigNumber.ROUND_CEIL);
                }
            },
            floor: {
                arguments: 1,
                run(input) {
                    return input[0].integerValue(BigNumber.ROUND_FLOOR);
                }
            },
            isFinite: {
                arguments: 1,
                run(input) {
                    return input[0].isFinite() ? bigOne : bigZero;
                }
            },
            isNaN: {
                arguments: 1,
                run(input) {
                    return input[0].isNaN() ? bigOne : bigZero;
                }
            },
            sign: {
                arguments: 1,
                run(input) {
                    return input[0].isPositive() ? bigOne : bigNegativeOne;
                }
            },
            sqrt: {
                arguments: 1,
                run(input) {
                    return input[0].sqrt();
                }
            },
            cbrt: {
                arguments: 1,
                run(input) {
                    return input[0].pow(bigOneThird);
                }
            },
            min: {
                arguments: Infinity,
                run(input) {
                    return BigNumber.min(...input);
                }
            },
            max: {
                arguments: Infinity,
                run(input) {
                    return BigNumber.max(...input);
                }
            },
            random: {
                arguments: 0,
                run(_) {
                    return BigNumber.random();
                }
            },
            sum: {
                arguments: Infinity,
                run(input) {
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
                default:
                    throw new Error("Assumption failed.");
            }
        },
        functions: {
            gcd: {
                arguments: 2,
                run(input) {
                    return input[0].gcd(input[1]);
                }
            },
            lcm: {
                arguments: 2,
                run(input) {
                    return input[0].lcm(input[1]);
                }
            },
            ceil: {
                arguments: 1,
                run(input) {
                    return input[0].ceil();
                }
            },
            floor: {
                arguments: 1,
                run(input) {
                    return input[0].floor();
                }
            },
            round: {
                arguments: 1,
                run(input) {
                    return input[0].round();
                }
            },
            inverse: {
                arguments: 1,
                run(input) {
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
                default:
                    throw new Error("Assumption failed.");
            }
        },
        functions: {}
    },
};