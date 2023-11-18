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
    for (let i = -2; i <= 2; i++) {
        const l = line + i;
        if (!(l in lines)) continue;
        if (i === 0) {
            // red, blue, red, blue
            console.log(
                "%c> %c" + (l + 1) + " | " + lines[l].substring(0, key - 1) +
                "%c" + (lines[l].substring(key - 1, key - 1 + length) ?? "") +
                "%c" + lines[l].substring(key - 1 + length),
                "color: red",
                "color: blue",
                "color: red",
                "color: blue"
            );
            //console.log("%c" + " ".repeat(key + l.toString().length + 4) + "^".repeat(length), "color: red");
        } else {
            console.log("%c  " + (l + 1) + " | " + lines[l], "color: blue");
        }
    }
    throw new Error("\n" + error);
}