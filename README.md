# callc
Helper utility for checking for dead code. Run against a file containing utility functions and then check a code base for usage of those utility functions.

*warning* This function will produce false positives due to name collisions. While searching for `myutils.max` hits on `Math.max` will count. It shouldn't be impossible or maybe even that difficult to fix this but it isn't happening at this point in time.

# installation
```
npm install -g callc
```

# usage

```bash
callc path/to/src/folder/containing/functionDeclarations.js
```
will output a json array containing function names declared in specified file.

```bash
callc -s path/to/src/folder path/to/src/folder/containing/functionDeclarations.js
```
will output a json object containing function names as keys and values as objects with filenames and the number of calls per file.

```bash
callc -cps path/to/src/folder path/to/src/folder/containing/functionDeclarations.js
```
will output a prettified json object containing function names as keys and values as total number of calls.

```bash
callc --help
```
for other combinations.
