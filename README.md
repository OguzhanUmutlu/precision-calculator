# precision-calculator

Precision calculator on web

# Usage

You can start using it on https://oguzhanumutlu.github.io/precision-calculator/

# Calculating expressions

You can just type in a processable math expression and press the `=` button
or press `Ctrl+Enter` to calculate it.

Examples:

- `2 + 2`
- `2 + 5 * 7`
- `2 ^ 4 + 5`
- `x + 10`
- `f(x + 5) - 7`

# Defining variables

You can define variables with the usual math syntax `x = y`

Examples:

- `x = 10`
- `x = y + 10 * 7 + (y ^ 10)`

# Defining functions

You can define functions with again, the usual math syntax `f(x, y, z) = x + y + z`

Examples:

- `f(x) = x + 1`
- `f(x, y) = x + y`

You can also use functions as arguments:

Examples:

- `f(g, x) = g(x)`
- `f(g) = g(x)` Note that x has to be defined anywhere outside the function.

# Strict Expression Mode

If you enable strict expression mode you can get a language that is closer
to math.

First of all the disadvantage of this is, it limits the variables and 
argument names to have a single character.

The advantage is that it adds more syntax like these:
- `xy` is interpreted as `x * y`
- `x (y)` is interpreted as `x * (y)` unless x is a function
- `(x) (y)` is interpreted as `(x) * (y)`