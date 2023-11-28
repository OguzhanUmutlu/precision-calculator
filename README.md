# precision-calculator

Precision calculator on web

# Examples

## Pi Approximation

Precision: 500

```
pi = 3

repeat 6 times {
  pi += sin(pi)
}

pi
```

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

First of all the disadvantage of this is, it limits the variables,
the function names and the argument names to have a single character.

Note: In order for `xsin(x)` to work, you should separate the first x like:
`x sin(x)`

Note: In order to use pi, you can use the symbol `π`. (Should pop up at
the top as a copyable text)

The advantage is that it adds syntactic features like these:

- `xy` is interpreted as `x * y`
- `x (y)` is interpreted as `x * (y)` unless x is a function
- `x (y)` is interpreted as `x(y)` if x is a function
- `xyz(t)` is interpreted as `x * y * z * (t)` unless z is a function
- `xyz(t)` is interpreted as `x * y * z(t)` if z is a function
- `(x) (y)` is interpreted as `(x) * (y)`

# Non-math features:

# Print and throw

You can print/throw text.

Throwing stops the program and sends an error. (exit() is a better way imo)

Example:

```
print Hello, world!

throw this will stop everything and only this will be shown!

print hello
```

# Let/const definitions

You can use let/const for defining variables.

Just using `x = 10` works but this will override the parent scope's(if exists)
variable. If you want to define a variable in the current scope you should use
let or const.

Basically the difference is that const variables are constants, therefore they
are not overrideable.

Example:

```
x = 10

let x = 20

const y = 30

y = 50 // throws an error
```

# Uninstructed scopes

You can create uninstructed scopes that always run without a condition by just
using two curly braces.

Example:

```
i = 10

{
  let i = 20
  i     # prints out 20
}

i     # prints out 10 because let was used instead of normal `i = 20`
```

They can also be used in functions:

```
f(x) = {
  x = x + 5
  x
}

f(10)  # prints out 15
```

# If statements

If an expression is not equal to 0, it will execute your code. Can also be
chained with else-if and else statements:

```
x = 15

if x == 10 {
  print x is 10
} else if x == 15 {
  print x is 15    # in this case, this part will run
} else {
  print x is not valid
}
```

# Repeat until statements

A loop will continue until the given expression is equal to 0.

The logic: Check if the requirement is 0, if yes run the scope and start
from the beginning, unless exit the loop

```
x = 0

repeat until x == 10 {
  x # prints every integer from 0 to 9
  x = x + 1  # yes i know. x can't be x + 1. this is code. don't sue me.
}
```

# Break keyword

You can basically break out of loops with it.

# Loop statements

A loop will continue until the `break` keyword is used.

```
x = 0

loop {
  x # prints every integer from 0 to 9
  x = x + 1
  if x == 10 { break }
}
```

# Return keyword

Escapes out of the current scope.

```
x = 10

if x == 10 {
  return 0
  print hi   # won't happen
}

{
  return 0
  print hi   # won't happen
}

return 0
print hi   # won't happen
```