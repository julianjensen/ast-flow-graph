/** ******************************************************************************************************************
 * @file Keeps track of all scopes for an entire program.
 *
 *                      ┌───────────────────────────────────────────────────────────┐
 *                      │                                                           │
 *                  ┌───┤                          global                           │
 *                  │   │                                                           │
 *                  │   └─────────────┬────────────────────────────────┬────────────┘
 *                  │                 │                                │
 * Script scope     │                 │ Module scope                   │ Script scope
 *                  │                 │                                │
 *                  │   ┌─────────────v────────────┐     ┌─────────────v────────────┐
 *                  │   │                          │     │                          │
 *                  │   │          module          ├─────>           class          │
 *                  │   │                          │     │                          │
 *                  │   └─────────────┬────────────┘     └─────────────┬────────────┘
 *                  │                 │                                │
 *                  │                 │       nested function          │
 *                  │                 │               │                │
 *                  │   ┌─────────────v────────────┐  │  ┌─────────────v────────────┐
 *                  │   │                          │  v  │                          │
 *                  └───>         function         <─────┤          method          │
 *                      │                          │     │                          │
 *                      └────^────┬─┬─┬────────────┘     └───────────┬─┬─┬──────────┘
 *                           │    │ │ │                              │ │ │
 *                           │    │ │ │                              │ │ │
 *                           │    │ │ │                              │ │ │
 *                           │    │ │ │   ┌──────────────────────┐   │ │ │
 *                           │    │ │ │   │                      │   │ │ │
 *                           │    │ │ └───>   params w/ defs     <───┘ │ │
 *                           │    │ │     │                      │     │ │
 *                           │    │ │     └──────────────────────┘     │ │
 *                           │    │ │                                  │ │
 *                           │    │ │                                  │ │
 *                           │    │ │                                  │ │
 *                           │    │ │     ┌──────────────────────┐     │ │
 *                           │    │ │     │         body         │     │ │
 *                           │    │ └─────>   params wo/ defs    <─────┘ │
 *                           │    │       │                      │       │
 *                           │    │       └──────────────────────┘       │
 *                           │    │                                      │
 *                           │    │                                      │
 *                           │    │                                      │
 *                           │    │       ┌──────────────────────┐       │
 *                           │    │       │                      <───────┘
 *                           │    └───────>  block [ , block ]   │
 *                           │            │                      <────┐
 *           nested function │            └─────┬─────┬──────────┘    │ nested block
 *                           │                  │     │               │
 *                           └──────────────────┘     └───────────────┘
 *
 * ### Scope Types
 *
 * 1. `eval` scope
 * 2. `function` scope
 * 3. module scope
 * 4. script scope
 * 5. `catch` scope
 * 6. `{}` scope
 * 7. `with` scope
 * 8. declaration scope
 *
 *
 * ## `var` hoisting
 *
 * Hoisting goes to the top of these scopes:
 *
 * 1. script scope
 * 2. `function` scope
 * 3. `{}` scope
 *
 * Note: Same as declaration scope except for declaration block scope.
 *
 * ## Scope of `this`
 *
 * Goes to the nearest (non-arrow) function or script scope.
 *
 *
 *
 * ## Position in the source where the scopes begin and end.
 *
 * These were taken from the V8 source code. Note that the definition for the catch block
 * seems to be erroneous in the source comments. I have corrected it here. Potentially, the
 * comment is correct in relation to some V8 implementation quirk, but the definition below is
 * consistent with the ECMA specs and is also, incidentally, how V8 actually behaves.
 *
 * * For the scope of a with statement
 *
 *   `with (obj) stmt`
 *   ^        ^
 *   │        └─ end position: end position of last token of 'stmt'
 *   └─ start position: start position of first token of 'stmt'
 *
 * * Block scope
 *
 *   `{ stmts }`
 *   ^        ^
 *   │        └─ start position: start position of '{'
 *   └─ end position: end position of '}'
 *
 * * For the scope of a function literal or decalaration
 *
 *   `function fun(a,b) { stmts }`
 *                ^             ^
 *                │             └─ end position: end position of '}'
 *                └─ start position: start position of '('
 *
 * * For the scope of a catch block
 *
 *   `try { stms } catch(e) { stmts }`
 *                      ^          ^
 *                      │          └─ end position: end position of '}'
 *                      └─ start position: start position of '('
 *
 * * For the scope of a for-statement
 *
 *   `for (let x ...) stmt`
 *        ^              ^
 *        │              └─ end position: end position of last token of 'stmt'
 *        └─ start position: start position of '('
 *
 * * For the scope of a switch statement
 *
 *   `switch (tag) { cases }`
 *                 ^       ^
 *                 │       └─ end position: end position of '}'
 *                 └─ start position: start position of '{'
 *
 * ## Function Declaration
 *
 * 1. Create function Environment Record (AKA function scope)
 * 2. Create bindings for each formal parameter (add parameters variables to function scope)
 * 3. If any parameters have default values
 *    1. Create second Environment Record
 *    2. Evaluate the declaration bodies for the default values
 * 4. If there are duplicate parameter names
 *
 * ## Terminology
 *
 * * `VarDeclaredNames`
 *    Variables declared with `var` as well as named functions.
 *
 *    `VarScopedDeclarations`
 *    Same as above but inside a scope as opposed to the outermost scope. I think. Documentation never explains them.
 *
 * ## Other scope notes
 *
 * `let` and `const` are lexical declarations, as are class declarations. Functions act much like `var` and get hoisted
 * and potentially overwritten.
 *
 *
 * Declaration[Yield, Await]:
 *      HoistableDeclaration[?Yield, ?Await, ~Default]
 *      ClassDeclaration[?Yield, ?Await, ~Default]
 *      LexicalDeclaration[+In, ?Yield, ?Await]
 *
 * HoistableDeclaration[Yield, Await, Default]:
 *      FunctionDeclaration[?Yield, ?Await, ?Default]
 *      GeneratorDeclaration[?Yield, ?Await, ?Default]
 *      AsyncFunctionDeclaration[?Yield, ?Await, ?Default]
 *
 * BreakableStatement[Yield, Await, Return]:
 *      IterationStatement[?Yield, ?Await, ?Return]
 *      SwitchStatement[?Yield, ?Await, ?Return]
 *
 *
 * It's a syntax error
 * 1. to have duplicate names if even one of them is declared with `let` or `const`
 * 2. to have duplicate label names
 * 3. to have undefined break or continue targets
 *
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 24-Nov-2017
 *********************************************************************************************************************/
"use strict";

/**
 * @typedef {object} CatchFinal
 * @property {BasicBlock} catchClause
 * @property {BasicBlock} finalizer
 */


/** */
const
    { Syntax, checks } = require( './defines' ),
    { assignment } = require( './utils/ast-helpers' ),
    up = ( p, fn ) => {
        let r;

        while ( p && !( r = fn( p ) ) ) p = p.parent;

        return p ? r : null;
    };

/** */
class Scope
{
    /**
     * @param {?Scope} [parent=null]
     * @param {string} [type="normal"]
     */
    constructor( parent = null, type = 'normal' )
    {
        this.type = type;
        this.parent = parent;
        this.children = [];
        if ( parent )
        {
            this.parent.children.push( this );
            this.depth = parent.depth + 1;
        }
        else
            this.depth = 0;
        this.declsByBlock = new Map();
        this.defsByBlock = new Map();
        this.declarations = Object.create( null );
        this.definitions = Object.create( null );
        this.blocks = [];
        this.nodes = [];
        this._descNode = null;
        this.first = 0;
        this.last = 0;
        this.labelNodes = [];
    }

    get descNode()
    {
        return this._descNode;
    }

    set descNode( n )
    {
        this._descNode = n;
        this.first = n.scope.first;
        this.last = n.scope.last;
        n.scope = this;

    }

    toString()
    {
        const
            idKeys = Object.keys( this.declarations ).concat( Object.keys( this.definitions ) ),
            ids = idKeys.length ? ` [ "${idKeys.join( '", "' )}" ]` : '',
            fname = this.descNode ? checks.functionName( this.descNode ) : null,
            desc = this.descNode ? ( fname === 'anonymous' ? '_' + this.descNode.type : fname ) : 'unknown',
            lines = `${this.descNode.loc.start.line}-${this.descNode.loc.end.line}`;

        // if ( this.descNode && this.descNode.type === Syntax.MethodDefinition )
        // {
        //     console.log( 'y no name?', this.descNode );
        // }

        return [ ' '.repeat( this.depth * 4 ) + `${desc}[${this.type}:${lines}]${ids}`, ...this.children.map( c => c.toString() ) ].join( '\n' );
    }

    /**
     * @param {string} name
     * @param {Node} node
     * @param {BasicBlock} block
     */
    declare( name, node, block )
    {
        if ( this.declarations[ name ] )
            throw new SyntaxError( `Duplicate declaration of "${name}"` );

        this.declarations[ name ] = { node, block };
        this.declsByBlock.set( block, name );
    }

    /**
     * @param {string} name
     * @param {Node} node
     * @param {BasicBlock} block
     */
    define( name, node, block )
    {
        if ( !this.definitions[ name ] )
            this.definitions[ name ] = [];

        this.definitions[ name ].push( { node, block } );
        this.defsByBlock.set( block, name );
    }

    /**
     * @param {BasicBlock} block
     */
    add( block )
    {
        this.blocks.push( block );
        block.scope = this;
    }

    add_labels( ...labelNodes )
    {
        this.labelNodes = labelNodes;
    }

    has_label( label )
    {
        return this.labelNodes.find( ln => ln.label === label );
    }

    /**
     * @param {string} label
     * @param {BasicBlock} block
     */
    want_resolution( label, block )
    {
        return this.identifiers[ label ] ? block.add_succs( this.identifiers[ label ] ) : null;
    }

    /**
     * @param {string} name
     * @return {?number}
     */
    has( name )
    {
        return this.identifiers[ name ];
    }

    /**
     * @return {string}
     */
    name()
    {
        return this.descNode ? checks.functionName( this.descNode ) : '';
    }
}

/** */
class Scopes
{
    /**
     * @param {Scope} scope
     */
    constructor( type, node )
    {
        this.top = this.current = new Scope( null, type );
        this.current.descNode = node;
        this.list = [ this.current ];

        this.deferrals = [];
        this.catches = [];
    }

    toString()
    {
        return this.top.toString();
    }

    /**
     * @param {string} type
     * @param {Node[]} params
     * @param {?Node} [desc]
     * @param {?BasicBlock} [block]
     * @return {Scope}
     */
    function_scope( type, params, desc, block )
    {
        this.current = this.push_scope( type, desc || params.parent );

        if ( desc.type !== Syntax.CatchClause && !params.every( p => p.type === Syntax.Identifier ) )
        {
            this.push_scope( 'params', desc || params.parent );
            // @todo Need to actually walk the defaults at this time
            // It would be  a single top BasicBlock with each param being a sequential operation, unless they're not...
            this.pop_scope();
        }

        params.map( n => [ n, assignment( n ) ] ).forEach( ( [ node, [ names ] ] ) => names.forEach( name => this.current.declare( name, node, block ) ) );
        return this.current;
    }

    /**
     * @param {string} type
     * @param {?Node} [node]
     * @return {Scope}
     */
    push_scope( type = 'normal', node )
    {
        this.current = new Scope( this.current, type );
        this.current.descNode = node;
        this.list.push( this.current );
        return this.current;
    }

    /**
     * @return {Scope}
     */
    pop_scope()
    {
        return this.current = this.current.parent;
    }

    /**
     * @param {string} name
     * @param {Node} node
     * @param {BasicBlock} block
     */
    declare( name, node, block )
    {
        this.current.declare( name, node, block );
    }

    /**
     * @param {string} name
     * @param {Node} node
     * @param {BasicBlock} block
     */
    define( name, node, block )
    {
        this.current.define( name, node, block );
    }

    /**
     * @param {BasicBlock} block
     */
    add_block( block )
    {
        this.current.add( block );
    }

    /**
     * @param {string} label
     * @param {BasicBlock} block
     * @return {BasicBlock}
     */
    resolve( label, block )
    {
        return this.current.want_resolution( label, block );
    }

    /**
     * @param {string} label
     * @param {BasicBlock} block
     */
    goto( label, block )
    {
        if ( this.resolve( label, block ) ) return;

        this.deferrals.push( { label, block, scope: this.current } );
    }

    /**
     * @param {string} label
     * @param {Scope} scope
     * @return {?BasicBlock}
     */
    static find_in_scopes( label, scope )
    {
        return up( scope, s => s.has( label ) );
    }

    /** */
    finish()
    {
        this.deferrals.forEach( ( { label, block, scope } ) => {
            const def = Scopes.find_in_scopes( label, scope );

            if ( !def ) throw new Error( `Unable to find identifier ${label} in any scope` );
            block.add_succs( def );
        } );
    }

    get_nearest_breakable( startScope = this.current )
    {
        return up( startScope, s => ( s.type === 'loop' || s.type === 'switch' ) && s );
    }

    /**
     * @param {string} type
     * @return {?Scope}
     */
    get_scope_by_type( type )
    {
        return up( this.current, s => s.type === type && s );
    }

    /** */
    pop_to_function()
    {
        this.current = up( this.current, s => s.type === 'function' && s );
    }

    /**
     * @param {BasicBlock} catchClause
     * @param {BasicBlock} [finalizer]
     */
    add_catch( catchClause, finalizer )
    {
        this.catches.unshift( { catchClause, finalizer } );
    }

    /**
     * @return {CatchFinal}
     */
    pop_catch()
    {
        return this.catches.shift();
    }

    /**
     * @return {number}
     */
    has_catch()
    {
        return this.catches.length;
    }

    /**
     * @return {CatchFinal}
     */
    peek_catch()
    {
        return this.catches[ 0 ];
    }

    scope_from_ast( node )
    {
        while ( !node.scope ) node = node.parent;
        this.current = node.scope;
    }

    // snapshot()
    // {
    //     return {
    //         current: this.current,
    //         catches: this.catches.slice()
    //     };
    // }
    //
    // from_snapshot( snap )
    // {
    //     this.current = snap.current;
    //     this.catches = snap.catches;
    // }

    static get_type( nodeType )
    {
        return {
            [ Syntax.FunctionExpression ]:      'function',
            [ Syntax.FunctionDeclaration ]:     'function',
            [ Syntax.ArrowFunctionExpression ]: 'function',
            [ Syntax.MethodDefinition ]:        'function',
            [ Syntax.ClassDeclaration ]:        'function',
            [ Syntax.SwitchStatement ]:         'switch',
            [ Syntax.CatchClause ]:             'catch',
            [ Syntax.WithStatement ]:           'with',
            [ Syntax.ForStatement ]:            'loop',
            [ Syntax.ForOfStatement ]:          'loop',
            [ Syntax.ForInStatement ]:          'loop',
            [ Syntax.BlockStatement ]:          'normal',
            [ Syntax.Program ]:                 'module'
        }[ nodeType ] || null;
    }

}

module.exports = { Scopes, Scope };
