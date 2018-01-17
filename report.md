
I'm having a variety of issues and am, at this point, entirely unclear as to what might be going one. 

The first part of what follows relates to `@std/esm` version 0.19.3 and then there is some weirdness relating to 0.19.5.

Below is a condensed version of what I've been trying. The code runs fine, as do the unit tests; my issue is with getting code coverage.

My `"test"` entry in the `"scripts"` section of `package.json` is this:
```bash
nyc --reporter=lcov --reporter=text-lcov --require=@std/esm mocha
```
For now, I just have a single test file where I've tried both of the following approaches:

`test/index-test.js`:
```js
const CFG = require( '../index' );
```
`../index.js`:
```js
require = require( '@std/esm' )( module, { esm: 'js', cjs: true } );
module.exports = require( './src/cfg' ).default;
```
which gives the following result:
```bash
> nyc --reporter=lcov --reporter=text-lcov --require=@std/esm mocha

Transformation error for ../index.js ; return original code
istanbul.createInstrumenter is not a function


  cfg
    ✓ graph troublesome code (45ms)


  1 passing (50ms)
```


and I've also tried this:

`test/index-test.js`:
```js
const CFG = require( '../src/cfg' );
```
`../src/cfg.js`:
```js
import AST from './ast';
import create_new_cfg from './leader';
// ...snip

export default class CFG
{
    // ... etc
}
```

with the following result:

```bash
> nyc --reporter=lcov --reporter=text-lcov --require=@std/esm mocha

Transformation error for ./src/cfg.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/ast.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/leader.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/dump.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/types.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/manager.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/utils.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/dot.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/block.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/edges.js ; return original code
istanbul.createInstrumenter is not a function
Transformation error for ./src/visitors.js ; return original code
istanbul.createInstrumenter is not a function


  cfg
    ✓ graph troublesome code (49ms)


  1 passing (53ms)
```
Clearly, the code runs fine and the tests pass. It's just the coverage that fails. I tried something similar using `istanbul` and `mocha` with roughly the same results.

I have tried this with and without
```json
    "@std/esm": {
        "esm": "js",
        "cjs": true
    }
```
in `package.json` but that doesn't seem to make any difference.

After I wrote the above, I decided to make sure that I was using the latest version. I wasn't, so I upgraded from version 0.19.3 to 0.19.5 in the hopes that it would fix the issue. However, not only did all my code stop working, now my tests obivously fail, but somehow a bunch of information is being dumped to the screen. I'm pretty sure that it's from `@std/esm` since it goes away  if I revert back to 0.19.3.

`npm test` output:
```
> nyc --reporter=lcov --reporter=text-lcov --require=@std/esm mocha



  cfg
    1) graph troublesome code


  0 passing (13ms)
  1 failing

  1) cfg graph troublesome code:
     TypeError: Cannot read property 'ArrowFunctionExpression' of undefined
      at isStrictScope (node_modules/escope/lib/scope.js:73:43)
      at GlobalScope.Scope (node_modules/escope/lib/scope.js:249:25)
      at new GlobalScope (node_modules/escope/lib/scope.js:526:89)
      at ScopeManager.__nestGlobalScope (node_modules/escope/lib/scope-manager.js:231:37)
      at Referencer.Program (node_modules/escope/lib/referencer.js:403:31)
      at Referencer.Visitor.visit (node_modules/esrecurse/esrecurse.js:122:34)
      at analyze (node_modules/escope/lib/index.js:153:16)
      at new AST (src/ast.js:12:36)
      at new CFG (src/cfg.js:8:196)
      at testFiles.map.src (test/index-test.js:567:42)
      at Array.map (<anonymous>)
      at Context.it (test/index-test.js:567:30)



TN:
SF:./src/ast.js
FN:16,(anonymous_0)
FN:17,(anonymous_1)
FN:18,(anonymous_2)
FN:34,(anonymous_3)
FN:36,(anonymous_4)
FN:50,(anonymous_5)
FN:64,(anonymous_6)
FN:99,(anonymous_7)
FN:107,(anonymous_8)
FN:120,(anonymous_9)
FN:135,(anonymous_10)
FN:145,(anonymous_11)
FN:155,(anonymous_12)
FN:170,(anonymous_13)
FN:194,(anonymous_14)
FN:194,(anonymous_15)
FN:194,(anonymous_16)
FN:212,_walker
FN:222,(anonymous_18)
FN:227,(anonymous_19)
FN:240,(anonymous_20)
FN:252,(anonymous_21)
FN:256,(anonymous_22)
FN:260,(anonymous_23)
FN:263,(anonymous_24)
FN:265,(anonymous_25)
FN:283,(anonymous_26)
FN:287,(anonymous_27)
FN:291,(anonymous_28)
# ... snipped several thousand lines
BRDA:593,38,0,0
BRDA:593,38,1,0
BRDA:618,39,0,0
BRDA:618,39,1,0
BRDA:627,40,0,0
BRDA:627,40,1,0
BRDA:627,41,0,0
BRDA:627,41,1,0
BRDA:629,42,0,0
BRDA:629,42,1,0
BRDA:630,43,0,0
BRDA:630,43,1,0
BRF:90
BRH:0
end_of_record
npm ERR! Test failed.  See above for more details.
```
So, for now, I'm back to 0.19.3 without a resolution for the test coverage. 0.19.5 breaks in all kinds of "interesting" ways so I'll hold off a bit before I upgrade. :) On the off-chance that I'm not doing something wrong, please let me know if there is any other information you might need from me.

P.S. I have edited the paths a bit to hide some personal info.
