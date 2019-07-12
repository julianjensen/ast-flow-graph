# ast-flow-graph

[![Greenkeeper badge](https://badges.greenkeeper.io/julianjensen/ast-flow-graph.svg)](https://greenkeeper.io/)
[![codecov](https://codecov.io/gh/julianjensen/ast-flow-graph/branch/master/graph/badge.svg)](https://codecov.io/gh/julianjensen/ast-flow-graph)
[![Coveralls Status][coveralls-image]][coveralls-url]
[![Build Status][travis-image]][travis-url]
[![npm version][npm-image]][npm-url]
[![License][license-image]][license-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![david-dm][david-dm-image]][david-dm-url]

> Constructs a CFG for JavaScript source code.

This module will read one or more JavaScript source files and produce CFGs of the code.

## Install

```sh
npm i ast-flow-graph
```

## Usage

```js
const
    CFG = require( 'ast-flow-graph' ),
    fs = require( 'fs' ),
    src = fs.readFileSync( 'some-javascript.js', 'utf8' ),
    cfg = new CFG( src, {
        parser:    {
            loc:          true,
            range:        true,
            comment:      true,
            tokens:       true,
            ecmaVersion:  9,
            sourceType:   'module',
            ecmaFeatures: {
                impliedStrict: true,
                experimentalObjectRestSpread: true
            }
        }
    } );

cfg.generate();     // Generate a CFG for all functions (and main module)
// or for just one function
const graph = cfg.generate( 'my_function' );

// Create all graphs and then get one of them
cfg.generate(); // You only need to do this once.
const myFunc = cfg.by_name( 'my_function' );
// ...
console.log( cfg.toTable() );    // Display all functions as tables
// Create a graph-viz .dot file

console.log( cfg.create_dot( myFunc ) );
```

## CLI Usage

      cfg version 1.0.0

    Usage

      cfg [-d] [-g] [-s ...sources] [-t] [-n ...names] [-r] [-v] [-h] [...files]

    Options

      -d, --debug             Turn on debugging mode. Warning: This will generate a lot of output.
      -g, --graph             Create a .dot file for graph-viz
      -o, --output string     If this option is present, save the .dot files to this directory.
      -s, --source string[]   Input source file. Can also be specified at the end of the command line.
      -t, --table             Output a table showing all CFG blocks
      -l, --lines             Output CFG blocks as text
      -n, --name string[]     Specify a function name to only display information for that function.
      -v, --verbose           Output additional information
      -h, --help              Display this help message

    Description

      Creates a CFG from one or more source files.

The CFG it outputs can be in one of several formats. Two of them are for easy text displays in the console and can be displayed using the `-t, --table` or `-l, --lines` options for tabular or line oriented output, respectively. These displays are of limited use and are mostly used for quick reference or checks. The program will also output a `.dot` file for use with [Graphviz](https://www.graphviz.org/) or, optionally, `graph-easy` or similar programs that can read standard `.dot` files.

Since I like to include some explanatory graphs in source or README.md files, I like to create graphs in line ascii. For this, I use the _perl_ module `graph-easy`.

Example usage:

```sh
ast-flow-graph -g -s test-data/cfg-test-04.js | graph-easy --as_boxart
```

Or in two steps.

```js
ast-flow-graph -gs test-data/cfg-test-04.js > cfg-04.dot
graph-easy cfg-04.dot --as_boxart >flow-04.txt
```

which will produce something like this:

```
                                          blah:12-28

                        ╭─────────────╮
                        │   entry:0   │
                        ╰─────────────╯
                          │
                          │
                          ▼
                        ╭─────────────╮
                        │ NORMAL:1@14 │
                        ╰─────────────╯
                          │
                          │
                          ▼
                        ╭────────────────────────────────────────────╮  CONTINUE
                        │               NORMAL:2@16-20               │ ◀─────────────┐
                        ╰────────────────────────────────────────────╯               │
                          │              ▲         │                                 │
                          │              │         │                                 │
                          ▼              │         ▼                                 │
╭─────────────╮  TRUE   ╭─────────────╮  │       ╭───────────────────╮             ╭───────────╮
│ NORMAL:6@23 │ ◀╴╴╴╴╴╴ │  TEST:5@22  │  └────── │ TEST|LOOP:3@18-19 │ ──────────▶ │ LOOP:4@19 │
╰─────────────╯         ╰─────────────╯          ╰───────────────────╯             ╰───────────╯
  │                       ╵
  │                       ╵ FALSE
  │                       ▼
  │                     ╭─────────────╮
  │                     │  TEST:7@24  │ ╴┐
  │                     ╰─────────────╯  ╵
  │                       ╵              ╵
  │                       ╵ TRUE         ╵
  │                       ▼              ╵
  │                     ╭─────────────╮  ╵
  │                     │ NORMAL:8@25 │  ╵ FALSE
  │                     ╰─────────────╯  ╵
  │                       │              ╵
  │                       │              ╵
  │                       ▼              ╵
  │                     ╭─────────────╮  ╵
  └───────────────────▶ │ NORMAL:9@27 │ ◀┘
                        ╰─────────────╯
                          │
                          │
                          ▼
                        ╭─────────────╮
                        │ NORMAL:10@0 │
                        ╰─────────────╯
                          │
                          │
                          ▼
                        ╭─────────────╮
                        │   exit:11   │
                        ╰─────────────╯
```

The annotations, like `3@18-19`, for example, means (CFG) block number `3`, covering lines 18 through 19 in the source code. A `TEST` is a conditional branch, probably an `if` statement, and `TEST|LOOP` is a loop condition test, and so on.

You can also send the output [Graphviz](https://www.graphviz.org/) and use one of its myriad outputs. We can generate a `.png` of the graph above with a command like this:

```sh
ast-flow-graph -gs test-data/cfg-test-04.js > cfg-04.dot
dot -Tpng tmp-04.dot
```

which produces something the image below (I scaled it down for size reasons):

![cfg-04.dot](./cfg-04.png)

Finally, note that the `.dot` file is simple text, so you can edit the labels, colors, and whatnot if you care or need to do so.

## Plugins

This section is a work in progress. The `headers`, `rows`, and `json` are not implemented, the others are but not tested.

#### General

-   `postLoad` for general initialization
-   `preExit` for general cleanup

#### `CFG`

-   `init` before anything is done
-   `postInit` after `AST` but before graph
-   `finish` after graph as part of block finishing
-   `headers`
-   `rows`
-   `json`

#### `AST`

-   `init` before parsing
-   `postInit` after parsing
-   `finish` after parsing and traversal
-   `postFinish` after all `AST` functions are done

#### `CFGBlock`

-   `init` after the block is initialized
-   `finish` after the block has been visited
-   `postFinish` after the block has been added and the walker is moving on
-   `headers`
-   `rows`
-   `json`

#### `BlockManager`

-   `init` after the `BlockManager` has been initialized
-   `finish` after the `BlockManager` has added all blocks
-   `postFinish` after the `clean()` stage
-   `headers`
-   `rows`
-   `json`

#### Other

-   `parse` called to parse the source code

## API
<!-- APIS -->
## Members

<dl>
<dt><a href="#succesors_as_indices">succesors_as_indices</a> ⇒ <code>Array.&lt;number&gt;</code></dt>
<dd></dd>
<dt><a href="#successors">successors</a> ⇒ <code>Array.&lt;CFGBlock&gt;</code></dt>
<dd></dd>
<dt><a href="#succs">succs</a> ⇒ <code>Array.&lt;CFGBlock&gt;</code></dt>
<dd></dd>
<dt><a href="#preds">preds</a> ⇒ <code>Array.&lt;CFGBlock&gt;</code></dt>
<dd></dd>
<dt><a href="#preds">preds</a> ⇒ <code>Array.&lt;number&gt;</code></dt>
<dd><p>Get all predecessors for a given <a href="CFGBlock">CFGBlock</a></p>
</dd>
<dt><a href="#defaultOutputOptions">defaultOutputOptions</a></dt>
<dd><p>The default display options for table and string output.</p>
</dd>
<dt><a href="#pluginManager">pluginManager</a> : <code>PluginManager</code></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#node_to_scope">node_to_scope(node)</a> ⇒ <code>*</code></dt>
<dd></dd>
<dt><a href="#forFunctions">forFunctions()</a> : <code><a href="#FunctionInfo">Iterable.&lt;FunctionInfo&gt;</a></code></dt>
<dd></dd>
<dt><a href="#traverse">traverse(ast, [enter], [leave])</a></dt>
<dd></dd>
<dt><a href="#walker">walker(node, [enter], [leave])</a></dt>
<dd></dd>
<dt><a href="#flat_walker">flat_walker(nodes, cb)</a></dt>
<dd><p>Iterate over all nodes in a block without recursing into sub-nodes.</p>
</dd>
<dt><a href="#call_visitors">call_visitors(node, cb)</a></dt>
<dd><p>Callback for each visitor key for a given node.</p>
</dd>
<dt><a href="#add_line">add_line(lineNumber, sourceLine)</a></dt>
<dd><p>Add a new line to the source code.</p>
</dd>
<dt><a href="#rename">rename(inode, newName)</a></dt>
<dd></dd>
<dt><a href="#as_source">as_source()</a> ⇒ <code>string</code></dt>
<dd><p>Return the AST nodes as source code, including any modifications made.</p>
</dd>
<dt><a href="#get_from_function">get_from_function(node, [whatToGet])</a> ⇒ <code>Array.&lt;Node&gt;</code> | <code>string</code> | <code><a href="#CFGInfo">CFGInfo</a></code></dt>
<dd></dd>
<dt><a href="#isEmpty">isEmpty()</a> ⇒ <code>boolean</code></dt>
<dd></dd>
<dt><a href="#classify">classify(to, type)</a> ⇒ <code>CFGBlock</code></dt>
<dd></dd>
<dt><a href="#follows">follows(cb)</a> ⇒ <code>CFGBlock</code></dt>
<dd></dd>
<dt><a href="#from">from(cb)</a> ⇒ <code>CFGBlock</code></dt>
<dd></dd>
<dt><a href="#to">to(cb)</a> ⇒ <code>CFGBlock</code></dt>
<dd></dd>
<dt><a href="#remove_succs">remove_succs()</a> ⇒ <code>CFGBlock</code></dt>
<dd></dd>
<dt><a href="#remove_succ">remove_succ(kill)</a> ⇒ <code>CFGBlock</code></dt>
<dd></dd>
<dt><a href="#as">as(nodeType)</a> ⇒ <code>CFGBlock</code></dt>
<dd></dd>
<dt><a href="#edge_as">edge_as(edgeType, [to])</a> ⇒ <code>CFGBlock</code></dt>
<dd><p>Sets the last edge to type.</p>
</dd>
<dt><a href="#not">not(nodeType)</a> ⇒ <code>CFGBlock</code></dt>
<dd><p>Removes a type from this block.</p>
</dd>
<dt><a href="#whenTrue">whenTrue(block)</a> ⇒ <code>CFGBlock</code></dt>
<dd><p>For test nodes, this adds the edge taken when the condition is true.</p>
</dd>
<dt><a href="#whenFalse">whenFalse(block)</a> ⇒ <code>CFGBlock</code></dt>
<dd><p>For test nodes, this adds the edge taken when the condition is false.</p>
</dd>
<dt><a href="#add">add(node)</a> ⇒ <code>CFGBlock</code></dt>
<dd><p>Add a current-level AST node to this block.</p>
</dd>
<dt><a href="#first">first()</a> ⇒ <code><a href="#AnnotatedNode">AnnotatedNode</a></code> | <code>BaseNode</code> | <code>Node</code></dt>
<dd><p>Returns the first AST node (if any) of this block.</p>
</dd>
<dt><a href="#last">last()</a> ⇒ <code><a href="#AnnotatedNode">AnnotatedNode</a></code> | <code>BaseNode</code> | <code>Node</code></dt>
<dd><p>Returns the last AST node (if any) of this block.</p>
</dd>
<dt><a href="#by">by(txt)</a> ⇒ <code>CFGBlock</code></dt>
<dd><p>Free-text field indicating the manner of of creation of this node. For information in graphs and printouts only.</p>
</dd>
<dt><a href="#isa">isa(typeName)</a> ⇒ <code>boolean</code></dt>
<dd><p>Check if this block has a particular type.</p>
</dd>
<dt><a href="#eliminate">eliminate()</a> ⇒ <code>boolean</code></dt>
<dd><p>Remove itself if it&#39;s an empty node and isn&#39;t the start or exit node.</p>
</dd>
<dt><a href="#defer_edge_type">defer_edge_type(type)</a></dt>
<dd></dd>
<dt><a href="#graph_label">graph_label()</a> ⇒ <code>string</code></dt>
<dd><p>For the vertices.</p>
</dd>
<dt><a href="#lines">lines()</a> ⇒ <code>string</code></dt>
<dd><p>Stringified line numbers for this block.</p>
</dd>
<dt><a href="#pred_edge_types">pred_edge_types()</a> ⇒ <code>Array.&lt;string&gt;</code></dt>
<dd></dd>
<dt><a href="#succ_edge_types">succ_edge_types()</a> ⇒ <code>Array.&lt;string&gt;</code></dt>
<dd></dd>
<dt><a href="#split_by">split_by(arr, chunkSize)</a> ⇒ <code>ArrayArray.&lt;string&gt;</code></dt>
<dd></dd>
<dt><a href="#toRow">toRow()</a> ⇒ <code>Array.&lt;string&gt;</code></dt>
<dd><p>Headers are
TYPE / LINES / LEFT EDGES / NODE / RIGHT EDGES / CREATED BY / AST</p>
</dd>
<dt><a href="#toString">toString()</a> ⇒ <code>Array.&lt;string&gt;</code></dt>
<dd></dd>
<dt><a href="#toString">toString()</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#toTable">toTable()</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#generate">generate([name])</a> ⇒ <code><a href="#CFGInfo">Array.&lt;CFGInfo&gt;</a></code> | <code>CFG</code></dt>
<dd></dd>
<dt><a href="#by_name">by_name(name)</a> ⇒ <code><a href="#CFGInfo">CFGInfo</a></code></dt>
<dd></dd>
<dt><a href="#forEach">forEach(fn)</a></dt>
<dd></dd>
<dt><a href="#create_dot">create_dot(cfg, [title])</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#_as_table">_as_table(hdr, [headers], [rows])</a></dt>
<dd></dd>
<dt><a href="#reindex">reindex(from)</a> ⇒ <code>Edges</code></dt>
<dd></dd>
<dt><a href="#add">add(from, to, type)</a> ⇒ <code>Edges</code></dt>
<dd><p>Add an edge between to CFGBlocks.</p>
</dd>
<dt><a href="#classify">classify(from, to, ctype)</a> ⇒ <code>Edges</code></dt>
<dd><p>Set a type on an arbitrary edge.</p>
</dd>
<dt><a href="#not">not(from, to, type)</a> ⇒ <code>Edges</code></dt>
<dd><p>Remove a type from an arbitrary edge.</p>
</dd>
<dt><a href="#retarget_multiple">retarget_multiple(node)</a> ⇒ <code>Edges</code></dt>
<dd><p>Point one or more edges to a new <a href="CFGBlock">CFGBlock</a>, used in block removal.</p>
</dd>
<dt><a href="#remove_succ">remove_succ(from, to)</a> ⇒ <code>Edges</code></dt>
<dd><p>Remove a successor <a href="CFGBlock">CFGBlock</a> from a <a href="CFGBlock">CFGBlock</a></p>
</dd>
<dt><a href="#get_succs">get_succs(from)</a> ⇒ <code>Array.&lt;CFGBlock&gt;</code></dt>
<dd><p>Get all successors for a given <a href="CFGBlock">CFGBlock</a>.</p>
</dd>
<dt><a href="#get_preds">get_preds(from)</a> ⇒ <code>Array.&lt;CFGBlock&gt;</code></dt>
<dd><p>Get all predecessors for a given <a href="CFGBlock">CFGBlock</a></p>
</dd>
<dt><a href="#renumber">renumber(newOffsets)</a></dt>
<dd><p>Renumber all indices (<code>id</code> field) because of removed <a href="CFGBlock">CFGBlock</a>s.</p>
</dd>
<dt><a href="#successors">successors()</a> : <code>Iterable.&lt;number&gt;</code></dt>
<dd></dd>
<dt><a href="#has">has(from, type)</a> ⇒ <code>boolean</code></dt>
<dd><p>Is there an edge of the gievn type?</p>
</dd>
<dt><a href="#edges">edges(from)</a> ⇒ <code><a href="#Connection">Array.&lt;Connection&gt;</a></code></dt>
<dd><p>Get edge information for a given <a href="CFGBlock">CFGBlock</a>, i.e. successors.</p>
</dd>
<dt><a href="#pred_edges">pred_edges(_from)</a> ⇒ <code><a href="#Connection">Array.&lt;Connection&gt;</a></code></dt>
<dd><p>Get all predecessor edge information for a given <a href="CFGBlock">CFGBlock</a>.</p>
</dd>
<dt><a href="#forEach">forEach(fn)</a></dt>
<dd></dd>
<dt><a href="#map">map(fn)</a></dt>
<dd></dd>
<dt><a href="#get">get(index)</a> ⇒ <code>CFGBlock</code></dt>
<dd></dd>
<dt><a href="#toString">toString()</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#toTable">toTable()</a> ⇒ <code>Array.&lt;string&gt;</code></dt>
<dd></dd>
<dt><a href="#create_dot">create_dot(title)</a> ⇒ <code>string</code></dt>
<dd></dd>
<dt><a href="#callback">callback(topKey, subKey, ...args)</a> ⇒ <code>*</code></dt>
<dd></dd>
<dt><a href="#output">output(options)</a></dt>
<dd><p>Override display options.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#CFGInfo">CFGInfo</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#VisitorHelper">VisitorHelper</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#AnnotatedNode">AnnotatedNode</a> : <code>Statement</code> | <code>function</code> | <code>Expression</code> | <code>Pattern</code> | <code>Declaration</code> | <code>Node</code> | <code>BaseNode</code> | <code>Esprima.Node</code></dt>
<dd><p>It&#39;s damn near impossible to make WebStorm understand a class hierarchy.</p>
</dd>
<dt><a href="#CFGOptions">CFGOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#DotOptions">DotOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#FunctionInfo">FunctionInfo</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#Connection">Connection</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="succesors_as_indices"></a>

## succesors_as_indices ⇒ <code>Array.&lt;number&gt;</code>
**Kind**: global variable
<a name="successors"></a>

## successors ⇒ <code>Array.&lt;CFGBlock&gt;</code>
**Kind**: global variable
<a name="succs"></a>

## succs ⇒ <code>Array.&lt;CFGBlock&gt;</code>
**Kind**: global variable
<a name="preds"></a>

## preds ⇒ <code>Array.&lt;CFGBlock&gt;</code>
**Kind**: global variable
<a name="preds"></a>

## preds ⇒ <code>Array.&lt;number&gt;</code>
Get all predecessors for a given [CFGBlock](CFGBlock)

**Kind**: global variable
<a name="defaultOutputOptions"></a>

## defaultOutputOptions
The default display options for table and string output.

**Kind**: global variable
<a name="pluginManager"></a>

## pluginManager : <code>PluginManager</code>
**Kind**: global variable
<a name="Block"></a>

## Block : <code>enum</code>
**Kind**: global enum
<a name="Edge"></a>

## Edge : <code>enum</code>
**Kind**: global enum
<a name="node_to_scope"></a>

## node_to_scope(node) ⇒ <code>\*</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| node | [<code>AnnotatedNode</code>](#AnnotatedNode) |

<a name="forFunctions"></a>

## forFunctions() : [<code>Iterable.&lt;FunctionInfo&gt;</code>](#FunctionInfo)
**Kind**: global function
<a name="traverse"></a>

## traverse(ast, [enter], [leave])
**Kind**: global function

| Param | Type |
| --- | --- |
| ast | <code>Node</code> \| <code>function</code> |
| [enter] | <code>function</code> |
| [leave] | <code>function</code> |

<a name="walker"></a>

## walker(node, [enter], [leave])
**Kind**: global function

| Param | Type |
| --- | --- |
| node | [<code>AnnotatedNode</code>](#AnnotatedNode) \| <code>BaseNode</code> \| <code>Node</code> |
| [enter] | <code>function</code> |
| [leave] | <code>function</code> |

<a name="flat_walker"></a>

## flat_walker(nodes, cb)
Iterate over all nodes in a block without recursing into sub-nodes.

**Kind**: global function

| Param | Type |
| --- | --- |
| nodes | [<code>Array.&lt;AnnotatedNode&gt;</code>](#AnnotatedNode) \| [<code>AnnotatedNode</code>](#AnnotatedNode) |
| cb | <code>function</code> |

<a name="call_visitors"></a>

## call_visitors(node, cb)
Callback for each visitor key for a given node.

**Kind**: global function

| Param | Type |
| --- | --- |
| node | [<code>AnnotatedNode</code>](#AnnotatedNode) |
| cb | <code>function</code> |

<a name="add_line"></a>

## add_line(lineNumber, sourceLine)
Add a new line to the source code.

**Kind**: global function

| Param | Type | Description |
| --- | --- | --- |
| lineNumber | <code>number</code> | 0-based line number |
| sourceLine | <code>string</code> | The source line to add |

<a name="rename"></a>

## rename(inode, newName)
**Kind**: global function

| Param | Type | Description |
| --- | --- | --- |
| inode | <code>Identifier</code> \| [<code>AnnotatedNode</code>](#AnnotatedNode) | A node of type Syntax.Identifier |
| newName | <code>string</code> | The new name of the identifier |

<a name="as_source"></a>

## as_source() ⇒ <code>string</code>
Return the AST nodes as source code, including any modifications made.

**Kind**: global function
**Returns**: <code>string</code> - - The lossy source code
<a name="get_from_function"></a>

## get_from_function(node, [whatToGet]) ⇒ <code>Array.&lt;Node&gt;</code> \| <code>string</code> \| [<code>CFGInfo</code>](#CFGInfo)
**Kind**: global function
**Access**: protected

| Param | Type | Default |
| --- | --- | --- |
| node | <code>FunctionDeclaration</code> \| <code>FunctionExpression</code> \| <code>MethodDefinition</code> \| <code>ArrowFunctionExpression</code> \| <code>Property</code> \| <code>Node</code> |  |
| [whatToGet] | <code>string</code> | <code>&quot;&#x27;all&#x27;&quot;</code> |

<a name="isEmpty"></a>

## isEmpty() ⇒ <code>boolean</code>
**Kind**: global function
<a name="classify"></a>

## classify(to, type) ⇒ <code>CFGBlock</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| to | <code>number</code> \| <code>CFGBlock</code> |
| type | <code>string</code> |

<a name="follows"></a>

## follows(cb) ⇒ <code>CFGBlock</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| cb | <code>CFGBlock</code> \| <code>Array.&lt;CFGBlock&gt;</code> |

<a name="from"></a>

## from(cb) ⇒ <code>CFGBlock</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| cb | <code>CFGBlock</code> \| <code>Array.&lt;CFGBlock&gt;</code> |

<a name="to"></a>

## to(cb) ⇒ <code>CFGBlock</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| cb | <code>CFGBlock</code> \| <code>Array.&lt;CFGBlock&gt;</code> |

<a name="remove_succs"></a>

## remove_succs() ⇒ <code>CFGBlock</code>
**Kind**: global function
<a name="remove_succ"></a>

## remove_succ(kill) ⇒ <code>CFGBlock</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| kill | <code>number</code> \| <code>CFGBlock</code> |

<a name="as"></a>

## as(nodeType) ⇒ <code>CFGBlock</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| nodeType | <code>number</code> |

<a name="edge_as"></a>

## edge_as(edgeType, [to]) ⇒ <code>CFGBlock</code>
Sets the last edge to type.

**Kind**: global function

| Param | Type |
| --- | --- |
| edgeType | [<code>Edge</code>](#Edge) |
| [to] | <code>number</code> \| <code>CFGBlock</code> |

<a name="not"></a>

## not(nodeType) ⇒ <code>CFGBlock</code>
Removes a type from this block.

**Kind**: global function

| Param | Type |
| --- | --- |
| nodeType | [<code>Edge</code>](#Edge) |

<a name="whenTrue"></a>

## whenTrue(block) ⇒ <code>CFGBlock</code>
For test nodes, this adds the edge taken when the condition is true.

**Kind**: global function

| Param | Type |
| --- | --- |
| block | <code>CFGBlock</code> |

<a name="whenFalse"></a>

## whenFalse(block) ⇒ <code>CFGBlock</code>
For test nodes, this adds the edge taken when the condition is false.

**Kind**: global function

| Param | Type |
| --- | --- |
| block | <code>CFGBlock</code> |

<a name="add"></a>

## add(node) ⇒ <code>CFGBlock</code>
Add a current-level AST node to this block.

**Kind**: global function

| Param | Type |
| --- | --- |
| node | [<code>AnnotatedNode</code>](#AnnotatedNode) \| <code>BaseNode</code> \| <code>Node</code> |

<a name="first"></a>

## first() ⇒ [<code>AnnotatedNode</code>](#AnnotatedNode) \| <code>BaseNode</code> \| <code>Node</code>
Returns the first AST node (if any) of this block.

**Kind**: global function
<a name="last"></a>

## last() ⇒ [<code>AnnotatedNode</code>](#AnnotatedNode) \| <code>BaseNode</code> \| <code>Node</code>
Returns the last AST node (if any) of this block.

**Kind**: global function
<a name="by"></a>

## by(txt) ⇒ <code>CFGBlock</code>
Free-text field indicating the manner of of creation of this node. For information in graphs and printouts only.

**Kind**: global function

| Param | Type |
| --- | --- |
| txt | <code>string</code> |

<a name="isa"></a>

## isa(typeName) ⇒ <code>boolean</code>
Check if this block has a particular type.

**Kind**: global function

| Param | Type |
| --- | --- |
| typeName | <code>number</code> |

<a name="eliminate"></a>

## eliminate() ⇒ <code>boolean</code>
Remove itself if it's an empty node and isn't the start or exit node.

**Kind**: global function
**Returns**: <code>boolean</code> - - true if it was deleted
<a name="defer_edge_type"></a>

## defer_edge_type(type)
**Kind**: global function

| Param | Type |
| --- | --- |
| type | [<code>Edge</code>](#Edge) |

<a name="graph_label"></a>

## graph_label() ⇒ <code>string</code>
For the vertices.

**Kind**: global function
<a name="lines"></a>

## lines() ⇒ <code>string</code>
Stringified line numbers for this block.

**Kind**: global function
<a name="pred_edge_types"></a>

## pred_edge_types() ⇒ <code>Array.&lt;string&gt;</code>
**Kind**: global function
<a name="succ_edge_types"></a>

## succ_edge_types() ⇒ <code>Array.&lt;string&gt;</code>
**Kind**: global function
<a name="split_by"></a>

## split_by(arr, chunkSize) ⇒ <code>ArrayArray.&lt;string&gt;</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| arr | <code>Array.&lt;\*&gt;</code> |
| chunkSize | <code>number</code> |

<a name="toRow"></a>

## toRow() ⇒ <code>Array.&lt;string&gt;</code>
Headers are
TYPE / LINES / LEFT EDGES / NODE / RIGHT EDGES / CREATED BY / AST

**Kind**: global function
<a name="toString"></a>

## toString() ⇒ <code>Array.&lt;string&gt;</code>
**Kind**: global function
<a name="toString"></a>

## toString() ⇒ <code>string</code>
**Kind**: global function
<a name="toTable"></a>

## toTable() ⇒ <code>string</code>
**Kind**: global function
<a name="generate"></a>

## generate([name]) ⇒ [<code>Array.&lt;CFGInfo&gt;</code>](#CFGInfo) \| <code>CFG</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| [name] | <code>string</code> |

<a name="by_name"></a>

## by_name(name) ⇒ [<code>CFGInfo</code>](#CFGInfo)
**Kind**: global function

| Param | Type |
| --- | --- |
| name | <code>string</code> |

<a name="forEach"></a>

## forEach(fn)
**Kind**: global function

| Param | Type |
| --- | --- |
| fn | <code>function</code> |

<a name="create_dot"></a>

## create_dot(cfg, [title]) ⇒ <code>string</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| cfg | [<code>CFGInfo</code>](#CFGInfo) |
| [title] | <code>string</code> |

<a name="_as_table"></a>

## _as_table(hdr, [headers], [rows])
**Kind**: global function

| Param | Type |
| --- | --- |
| hdr | <code>string</code> \| <code>Array.&lt;string&gt;</code> \| <code>Array.&lt;Array.&lt;string&gt;&gt;</code> |
| [headers] | <code>Array.&lt;string&gt;</code> \| <code>Array.&lt;Array.&lt;string&gt;&gt;</code> |
| [rows] | <code>Array.&lt;Array.&lt;string&gt;&gt;</code> |

<a name="reindex"></a>

## reindex(from) ⇒ <code>Edges</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |

<a name="add"></a>

## add(from, to, type) ⇒ <code>Edges</code>
Add an edge between to CFGBlocks.

**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |
| to | <code>CFGBlock</code> \| <code>number</code> |
| type | [<code>Edge</code>](#Edge) |

<a name="classify"></a>

## classify(from, to, ctype) ⇒ <code>Edges</code>
Set a type on an arbitrary edge.

**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |
| to | <code>CFGBlock</code> \| <code>number</code> |
| ctype | [<code>Edge</code>](#Edge) |

<a name="not"></a>

## not(from, to, type) ⇒ <code>Edges</code>
Remove a type from an arbitrary edge.

**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |
| to | <code>CFGBlock</code> \| <code>number</code> |
| type | [<code>Edge</code>](#Edge) |

<a name="retarget_multiple"></a>

## retarget_multiple(node) ⇒ <code>Edges</code>
Point one or more edges to a new [CFGBlock](CFGBlock), used in block removal.

**Kind**: global function

| Param | Type |
| --- | --- |
| node | <code>CFGBlock</code> \| <code>number</code> |

<a name="remove_succ"></a>

## remove_succ(from, to) ⇒ <code>Edges</code>
Remove a successor [CFGBlock](CFGBlock) from a [CFGBlock](CFGBlock)

**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |
| to | <code>CFGBlock</code> \| <code>number</code> |

<a name="get_succs"></a>

## get_succs(from) ⇒ <code>Array.&lt;CFGBlock&gt;</code>
Get all successors for a given [CFGBlock](CFGBlock).

**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |

<a name="get_preds"></a>

## get_preds(from) ⇒ <code>Array.&lt;CFGBlock&gt;</code>
Get all predecessors for a given [CFGBlock](CFGBlock)

**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |

<a name="renumber"></a>

## renumber(newOffsets)
Renumber all indices (`id` field) because of removed [CFGBlock](CFGBlock)s.

**Kind**: global function

| Param | Type |
| --- | --- |
| newOffsets | <code>Array.&lt;number&gt;</code> |

<a name="successors"></a>

## successors() : <code>Iterable.&lt;number&gt;</code>
**Kind**: global function
<a name="has"></a>

## has(from, type) ⇒ <code>boolean</code>
Is there an edge of the gievn type?

**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |
| type | [<code>Edge</code>](#Edge) |

<a name="edges"></a>

## edges(from) ⇒ [<code>Array.&lt;Connection&gt;</code>](#Connection)
Get edge information for a given [CFGBlock](CFGBlock), i.e. successors.

**Kind**: global function

| Param | Type |
| --- | --- |
| from | <code>CFGBlock</code> \| <code>number</code> |

<a name="pred_edges"></a>

## pred_edges(_from) ⇒ [<code>Array.&lt;Connection&gt;</code>](#Connection)
Get all predecessor edge information for a given [CFGBlock](CFGBlock).

**Kind**: global function

| Param | Type |
| --- | --- |
| _from | <code>CFGBlock</code> \| <code>number</code> |

<a name="forEach"></a>

## forEach(fn)
**Kind**: global function

| Param | Type |
| --- | --- |
| fn | <code>function</code> |

<a name="map"></a>

## map(fn)
**Kind**: global function

| Param | Type |
| --- | --- |
| fn | <code>function</code> |

<a name="get"></a>

## get(index) ⇒ <code>CFGBlock</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| index | <code>number</code> |

<a name="toString"></a>

## toString() ⇒ <code>string</code>
**Kind**: global function
<a name="toTable"></a>

## toTable() ⇒ <code>Array.&lt;string&gt;</code>
**Kind**: global function
<a name="create_dot"></a>

## create_dot(title) ⇒ <code>string</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| title | <code>string</code> |

<a name="callback"></a>

## callback(topKey, subKey, ...args) ⇒ <code>\*</code>
**Kind**: global function

| Param | Type |
| --- | --- |
| topKey | <code>string</code> |
| subKey | <code>string</code> |
| ...args | <code>\*</code> |

<a name="output"></a>

## output(options)
Override display options.

**Kind**: global function

| Param |
| --- |
| options |

<a name="CFGInfo"></a>

## CFGInfo : <code>object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| name | <code>string</code> |
| params | [<code>Array.&lt;AnnotatedNode&gt;</code>](#AnnotatedNode) |
| body | [<code>AnnotatedNode</code>](#AnnotatedNode) \| [<code>Array.&lt;AnnotatedNode&gt;</code>](#AnnotatedNode) |
| lines | <code>Array.&lt;Number&gt;</code> |
| [bm] | <code>BlockManager</code> |
| [trailing] | <code>CFGBlock</code> |
| node, | [<code>AnnotatedNode</code>](#AnnotatedNode) \| <code>Node</code> \| <code>BaseNode</code> |
| ast | <code>AST</code> |
| topScope | <code>Scope</code> |
| toString | <code>function</code> |
| toTable | <code>function</code> |

<a name="VisitorHelper"></a>

## VisitorHelper : <code>object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| BlockManager | <code>BlockManager</code> |
| bm | <code>BlockManager</code> |
| ast | <code>AST</code> |
| prev | <code>CFGBlock</code> |
| block | <code>CFGBlock</code> |
| newBlock | <code>function</code> |
| toExit | <code>Array.&lt;CFGBlock&gt;</code> |
| [flatWalk] | <code>function</code> |
| [scanWalk] | <code>function</code> |
| breakTargets | <code>Array.&lt;CFGBlock&gt;</code> |
| addBreakTarget | <code>function</code> |
| addLoopTarget | <code>function</code> |
| popTarget | <code>function</code> |
| getBreakTarget | <code>function</code> |
| getLoopTarget | <code>function</code> |

<a name="AnnotatedNode"></a>

## AnnotatedNode : <code>Statement</code> \| <code>function</code> \| <code>Expression</code> \| <code>Pattern</code> \| <code>Declaration</code> \| <code>Node</code> \| <code>BaseNode</code> \| <code>Esprima.Node</code>
It's damn near impossible to make WebStorm understand a class hierarchy.

**Kind**: global typedef
**Extends**: <code>BaseNode</code>, <code>Node</code>, <code>VariableDeclarator</code>, <code>Statement</code>, <code>Declaration</code>, <code>Pattern</code>, <code>Expression</code>, <code>Function</code>, <code>BlockStatement</code>, <code>espree.Node</code>
**Properties**

| Name | Type |
| --- | --- |
| [index] | <code>number</code> |
| [parent] | [<code>AnnotatedNode</code>](#AnnotatedNode) |
| [cfg] | <code>CFGBlock</code> |
| [toString] | <code>function</code> |
| scope | <code>Scope</code> |
| level | <code>number</code> |
| field | <code>string</code> |
| fieldIndex | <code>number</code> |

<a name="CFGOptions"></a>

## CFGOptions : <code>object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| ssaSource | <code>boolean</code> |
| parser | <code>object</code> |

<a name="DotOptions"></a>

## DotOptions : <code>object</code>
**Kind**: global typedef
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| title | <code>string</code> |  |  |
| nodeLabels | <code>Array.&lt;string&gt;</code> |  |  |
| edgeLabels | <code>Array.&lt;string&gt;</code> |  | // was graph_label |
| [start] | <code>number</code> |  |  |
| [end] | <code>number</code> |  |  |
| conditional | <code>Array.&lt;Array.&lt;number&gt;&gt;</code> |  | Actually an array of a tuple length 2: [ number, number ] |
| unconditional | <code>Array.&lt;Array.&lt;number&gt;&gt;</code> |  | Actually an array of a tuple length 2: [ number, number ] |
| [dotOptions] | <code>object</code> | <code>{}</code> |  |
| blocks | <code>Array.&lt;CFGBlock&gt;</code> |  |  |

<a name="FunctionInfo"></a>

## FunctionInfo : <code>object</code>
**Kind**: global typedef
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> |  |
| body | [<code>Array.&lt;AnnotatedNode&gt;</code>](#AnnotatedNode) \| [<code>AnnotatedNode</code>](#AnnotatedNode) |  |
| [params] | [<code>Array.&lt;AnnotatedNode&gt;</code>](#AnnotatedNode) |  |
| node | [<code>AnnotatedNode</code>](#AnnotatedNode) |  |
| lines | <code>Array.&lt;number&gt;</code> | A tuple with length 2 |

<a name="Connection"></a>

## Connection : <code>object</code>
**Kind**: global typedef
**Properties**

| Name | Type |
| --- | --- |
| from | <code>number</code> |
| to | <code>number</code> |
| type | <code>EdgeInfo</code> |

<!-- APIE -->

## License

MIT © [Julian Jensen](https://github.com/julianjensen/ast-flow-graph)

[coveralls-url]: https://coveralls.io/github/julianjensen/ast-flow-graph?branch=master

[coveralls-image]: https://coveralls.io/repos/github/julianjensen/ast-flow-graph/badge.svg?branch=master

[travis-url]: https://travis-ci.org/julianjensen/ast-flow-graph

[travis-image]: https://img.shields.io/travis/julianjensen/ast-flow-graph.svg

[npm-url]: https://badge.fury.io/js/ast-flow-graph

[npm-image]: https://badge.fury.io/js/ast-flow-graph.svg

[license-url]: https://github.com/julianjensen/ast-flow-graph/blob/master/LICENSE

[license-image]: https://img.shields.io/badge/license-MIT-brightgreen.svg

[snyk-url]: https://snyk.io/test/github/julianjensen/ast-flow-graph

[snyk-image]: https://snyk.io/test/github/julianjensen/ast-flow-graph/badge.svg

[david-dm-url]: https://david-dm.org/julianjensen/ast-flow-graph

[david-dm-image]: https://david-dm.org/julianjensen/ast-flow-graph.svg
