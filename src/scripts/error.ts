export const ERR_BLUE = "#2f89ff";
export const ERR_RED = "#ff2424";

/**
 * @throws Error
 * @param code
 * @param index
 * @param error
 * @param length
 */
export function throwError(code: string, index: number, error: string, length = 1): any {
    const lines = code.split("\n");
    let line = 0;
    let key = 0;
    for (let i = 0; i <= index; i++) {
        key++;
        if (code[i] === "\n") {
            line++;
            key = 0;
        }
    }
    const res = [];
    for (let i = -2; i <= 2; i++) {
        const l = line + i;
        if (!(l in lines)) continue;
        if (i === 0) {
            const a = lines[l].substring(0, key - 1); // the text before the error part
            const b = lines[l].substring(key - 1, key - 1 + length) ?? ""; // the error part
            const c = lines[l].substring(key - 1 + length); // the text after the error part
            console.log(
                "%c> %c" + (l + 1) + " | " + a +
                "%c" + b +
                "%c" + c,
                "color: " + ERR_RED,
                "color: " + ERR_BLUE,
                "color: " + ERR_RED,
                "color: " + ERR_BLUE
            );
            res.push([`<span style="color: ${ERR_RED}">>&nbsp;</span>` +
            `<span style="color: ${ERR_BLUE}">${l + 1}&nbsp;|&nbsp;</span>` +
            `<span style="color: ${ERR_BLUE}">`, [a], `</span>` +
            `<span style="color: ${ERR_RED}">`, [b], `</span>` +
            `<span style="color: ${ERR_BLUE}">`, [c], `</span>`]);
            //console.log("%c" + " ".repeat(key + l.toString().length + 4) + "^".repeat(length), "color: " + red);
        } else {
            console.log("%c  " + (l + 1) + " | " + lines[l], "color: " + ERR_BLUE);
            res.push([`<span style="color: ${ERR_BLUE}">&nbsp;&nbsp;${l + 1}&nbsp;|&nbsp;`, [lines[l]], `</span>`]);
        }
    }
    res.push(``, [`<span style="color: ${ERR_RED}">Error: `, [error], `</span>`]);
    console.error(error);
    throw res;
}