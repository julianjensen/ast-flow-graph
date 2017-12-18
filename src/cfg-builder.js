/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";

const
    BasicBlock = require( './basic-block' ),
    // _inspect                                     = require( 'util' ).inspect,
    // inspect                                      = ( o, d ) => _inspect( o, { depth: typeof d === 'number' ? d : 2, colors: true } ),
    AST                             = require( './ast' ),
    { checks, Syntax, ignoreTypes } = require( './defines' ),
    { traverse }                    = require( 'estraverse' ),
    {
        from_object_pattern,
        get_start_nodes
    } = require( './utils/ast-helpers' ),
    { isArray: array }              = Array;


/**
 * If an AST node doesn't output an edge then it can be assumed that it has a single edge to the next ASTNode, if any,
 * and can be merged into the current block. Multiple edges requires additional blocks.
 */
class CFGBuilder
{
    /**
     * @param {Program|FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|Node|AST} ast
     * @param {?Scopes} [scopes]
     * @param {?function} [collector]
     * @param {BasicBlockList} blockList
     */
    constructor( { ast, scopes, collector, blockList } )
    {
        this.collector = collector || ( () => {} );
        this.switchExits = [];
        this.root = ast instanceof AST ? ast.ast : ast;
        this.blockList = blockList;

        this.scopes = scopes;
        // if ( scopes )
        //     BasicBlock.scopes = this.scopes = scopes;
        // else if ( BasicBlock.scopes )
        //     this.scopes = BasicBlock.scopes;

        const topInfo = get_start_nodes( this.root );

        let pop = true;

        /** @type {BasicBlock} */
        this.entry = null;
        /** @type {BasicBlock} */
        this.exit = null;

        [ this.entry, this.exit ] = this.blockList.entry_and_exit();

        switch ( topInfo.type )
        {
            case 'program':
                this.entry.desc( 'entry' );
                this.exit.desc( 'exit' );
                this.entry.add( this.root );
                pop = false;
                this.name = 'main';
                break;

            case 'arrow':
            case 'expression':
            case 'declaration':
                const fname = checks.functionName( this.root );

                this.name = fname;
                this.entry.desc( fname );
                this.exit.desc( fname + '-exit' );
                this.declare( fname, this.entry );
                this.scopes.function_scope( 'function', this.root.params, this.root );
                this.add( this.root, this.entry );
                break;

            case 'method':
                const mname = checks.functionName( this.root );
                this.name = mname;
                this.entry.desc( mname );
                this.exit.desc( mname + '-exit' );
                this.declare( checks.functionName( this.root ), this.entry );
                this.scopes.function_scope( 'function', this.root.value.params, this.root );
                this.add( this.root, this.entry );
                break;
        }

        this.blockList.name = this.name;
        this.entry.source( this.name, this.root.type, this.root.loc, this.root.range );

        let last = this.walk( topInfo.start, this.entry ); // this.blockList.block( this.entry ).desc( 'top' ) );

        if ( last )
        {
            if ( last.hasNodes() )
                last.add_succs( this.exit );
            else
            {
                last.preds.forEach( p => p.succ_replace( last, this.exit ) );
                this.blockList.blocks.delete( last );
            }
        }


        this.exit.indent = this.entry.indent;
        if ( pop ) this.scopes.pop_scope();

        this.scopes.finish();
        this.exit.pre = BasicBlock.pre++;
        this.blockList.initial_walk();
    }

    /**
     * @return {string}
     */
    toString()
    {
        return `${this.entry}`;
    }

    /**
     * @param {Node} node
     * @param {BasicBlock} current
     * @return {?BasicBlock}
     */
    walk( node, current )
    {
        if ( !current ) return null;

        if ( array( node ) )
            return node.reduce( ( p, n ) => this.walk( n, p ), current );

        else if ( typeof this[ node.type ] === 'function' )
            current = this[ node.type ]( node, current );

        else if ( !checks.isClass( node ) && checks.hasBlockBody( node ) )
            current = this.walk( node.body.body, current );

        else if ( !checks.isClass( node ) )
        {
            this.add( node, current );
            this.deep_walk( node, current );
        }

        return current;
    }

    walk_scoped( ast, block, desc )
    {
        const
            scope = checks.isBlock( ast ) && this.scopes.push_scope( desc, ast ),
            newBlock = this.walk( ast, block );

        if ( scope ) this.scopes.pop_scope();

        return newBlock;
    }

    /**
     * @param {string} name
     * @param {Node} node
     * @param {BasicBlock} block
     */
    define( name, node, block )
    {
        this.scopes.define( name, node, block );
    }

    /**
     * @param {string} name
     * @param {Node} node
     * @param {BasicBlock} block
     */
    declare( name, node, block )
    {
        this.scopes.declare( name, node, block );
    }

    /**
     * @param {Node} ast
     * @param {BasicBlock} current
     */
    add_node( ast, current )
    {
        current.add_node( ast );
    }

    add_block_to_scope( block )
    {
        this.scopes.add_block( block );
    }

    /**
     * @param {BlockStatement} node
     * @param {BasicBlock} current
     */
    BlockStatement( node, current )
    {
        const isFunc = node.parent.type.includes( 'Function' ) || node.parent.type === Syntax.IfStatement;

        if ( !isFunc )
        {
            this.scopes.push_scope( 'block', node.parent );
            this.add_block_to_scope( current );
        }

        const b = this.walk( node.body, current );

        if ( !isFunc ) this.scopes.pop_scope();

        return b;
    }

    /**
     * @param {BreakStatement|Node} node
     * @param {BasicBlock} current
     */
    BreakStatement( node, current )
    {
        this.add_node( node, current );

        if ( node.label )
        {
            this.scopes.goto( node.label, current );
            return null;
        }

        const
            s = this.scopes.get_nearest_breakable();
            // s = this.scopes.get_scope_by_type( 'switch' ),
            // l = this.scopes.get_scope_by_type( 'loop' );

        if ( s && s.type === 'switch' )
            current.add_succs( this.switchExits[ this.switchExits.length - 1 ] );
        else if ( s )
            current.add_succs( ...s.blocks[ s.blocks.length - 1 ].succs );
        else
            throw new Error( `Statement 'break' outside of loop or switch` );

        return current;
    }

    /**
     * @param {CatchClause|Node} node
     * @param {BasicBlock} current
     */
    CatchClause( node, current )
    {
        this.add_node( node, current );
        this.scopes.function_scope( 'catch', [ node.param ], node, current );
        this.walk( node, current );
        this.scopes.pop_scope();
    }

    /**
     * @param {ContinueStatement} node
     * @param {BasicBlock} current
     */
    ContinueStatement( node, current )
    {
        this.add_node( node, current );
        const loop = this.scopes.get_scope_by_type( 'loop' );

        if ( !loop ) throw new Error( `Statement 'continue' outside of loop` );

        if ( node.label )
        {
            this.scopes.goto( node.label, current );
            return null;
        }
        else
            current.add_succs( ...loop.blocks[ 0 ].succs );
    }

    /**
     * @param {DoWhileStatement} node
     * @param {BasicBlock} current
     */
    DoWhileStatement( node, current )
    {
        this.add( node, current );

        const
            body = this.blockList.block( current ).desc( 'do-while-body' ),
            test = this.blockList.block().desc( 'do-while-test' ).test(),
            next = this.blockList.block().desc( 'do-while-next' );

        test.consequent( body );
        test.alternate( next );

        this.scopes.push_scope( 'loop', node );
        this.walk( node.body, body );
        this.scopes.pop_scope();

        this.walk( node.test, test );

        return next;
    }

    /**
     * @param {ForStatement} node
     * @param {BasicBlock} current
     */
    ForStatement( node, current )
    {
        this.add( node, current );

        const
            init = node.init && this.blockList.block().desc( 'for-init' ),
            test = node.test && this.blockList.block().desc( 'for-test' ).test();

        let consequent, alternate;

        if ( test )
        {
            consequent = test.consequent().desc( 'for-body' );
            alternate = test.alternate().desc( 'for-next' );
        }

        this.scopes.push_scope( 'loop', node );

        if ( init )
        {
            init.add_preds( current );
            this.VariableDeclaration( node.init, current );
            this.add( node.init, current );
            // this.walk( node.init, init );
        }

        if ( test )
        {
            test.add_preds( init || current );
            this.walk( node.test, test );
        }

        if ( init && !test )
            consequent.add_preds( init );
        else if ( !test && !init )
            consequent.add_preds( current );

        consequent.add_succs( test || consequent );

        alternate.add_preds( test || init || current );

        this.walk( node.body, consequent );
        if ( node.update )
            this.walk( node.update, consequent );

        this.scopes.pop_scope();

        return alternate;
    }

    /**
     * @param {ForInStatement} node
     * @param {BasicBlock} current
     */
    ForInStatement( node, current )
    {
        this.scopes.push_scope( 'loop', node );
        this.add( node, current );

        const
            init = this.blockList.block( current ).desc( 'for-in-left' ),
            test = this.blockList.block( init ).desc( 'for-in-right' ).test();

        let consequent = test.consequent().desc( 'for-in-body' ),
            alternate  = test.alternate().desc( 'for-in-next' );

        this.walk( node.left, init );
        this.walk( node.right, test );

        consequent.add_succs( test );

        this.walk( node.body, consequent );

        this.scopes.pop_scope();
        return alternate;
    }

    /**
     * @param {ForOfStatement} node
     * @param {BasicBlock} current
     */
    ForOfStatement( node, current )
    {
        return this.ForInStatement( node, current );
    }


    /**
     *
     *        │
     *        │
     *        V
     *  ┌────────────┐     ┌─────────────┐
     *  │    test    │ ──> │ (alternate) │
     *  └────────────┘     └─────────────┘
     *        │                   │
     *        │                   │
     *        V                   │
     *  ┌────────────┐            │
     *  │ consequent │            │
     *  └────────────┘            │
     *        │                   │
     *        │                   │
     *        V                   │
     *  ┌────────────┐            │
     *  │   block    │<───────────┘
     *  └────────────┘
     *
     * ### Strategy
     * 1. Create test node always
     * 2. Create consequent node always, parent = test
     * 3. If node.alternate, create alternate node
     * 4. Deep walk test
     * 5. Walk consequent
     * 6. If alternate, walk alternate
     * 7. If no exit block for consequent or alternate, return null block
     * 7. Create normal continue block with parents:
     * 8. If consequent walk exit node, add as parent
     * 9. If no alternate, add test as parent
     * 10. If alternate walk exit node, add as parent
     *
     * Note:
     * If last node has no AST, discard and point predecessors to the exit node
     *
     * @param {IfStatement} node
     * @param {BasicBlock} current
     */
    IfStatement( node, current )
    {
        const
            test = current.hasNodes() ? this.blockList.block( current ).desc( 'if-test' ) : current.desc( 'if-test' );

        this.add( node.test, test );

        let consequent = test.consequent().desc( 'if-consequent' ),
            alternate;

        if ( node.alternate )
            alternate = test.alternate();

        this.deep_walk( node.test, test );

        consequent = this.walk_scoped( node.consequent, consequent, 'consequent' );
        if ( alternate )
            alternate = this.walk_scoped( node.alternate, alternate, 'alternate' );

        if ( !consequent && node.alternate && !alternate ) return null;

        const next = this.blockList.block( consequent );

        if ( !node.alternate ) next.add_preds( test );

        if ( alternate ) next.add_preds( alternate );

        return next;
        // const
        //     is_else = node => node && node.type === Syntax.IfStatement,
        //     test    = current.hasNodes() ? this.blockList.block( current ).desc( 'if-test' ).test() : current.desc( 'if-test' ),
        //     cblock  = ( nodes, block, desc ) => {
        //         let scope    = checks.isBlock( nodes ) && this.scopes.push_scope( desc, node ),
        //             newBlock = this.walk( nodes, block );
        //         if ( scope ) this.scopes.pop_scope();
        //         return newBlock;
        //     };
        //
        // this.add( node.test, test );
        //
        // let consequent = test.consequent().desc( 'if-consequent' ),
        //     alternate  = node.alternate && test.alternate().desc( is_else( node.alternate ) ? 'if-else' : 'if-alternate' );
        //
        //
        // if ( is_else( node.alternate ) )
        //     alternate.left();
        //
        // const isNext = cblock( node.consequent, consequent, 'consequent' );
        //
        // let isAlt;
        //
        // if ( node.alternate )
        //     isAlt = cblock( node.alternate, alternate, 'alternate' );
        //
        // return this.blockList.block( isNext, node.alternate ? isAlt : test ).desc( 'if-next' );
    }

    /**
     * @param {Node} node
     * @param {BasicBlock} current
     */
    LabeledStatement( node, current )
    {
        current = this.blockList.block( current ).desc( 'label-' + node.label );

        this.add( node, current );
        // this.scopes.add( node.label, current );
        return this.walk( node.body, current );
    }

    /**
     * @param {ReturnStatement} node
     * @param {BasicBlock} current
     */
    ReturnStatement( node, current )
    {
        current.desc( 'return' );
        this.add( node, current );
        current.add_succs( this.exit );
        this.deep_walk( node.argument, current );
        return null;
    }

    /**
     *
     *
     *         ┌──────────────┐
     *         │              │
     *         │    switch    │
     *         │              │
     *         └──┬─┬─┬─┬─┬─┬─┘
     *            │ │ │ │ │ │
     *            │ │ │ │ │ │         ┌─────────────┐
     *            │ │ │ │ │ │         │             │
     *            │ │ │ │ │ └────────>│    case1    │
     *            │ │ │ │ │           │             │
     *            │ │ │ │ │           └─────────────┘
     *            │ │ │ │ │
     *            │ │ │ │ │           ┌─────────────┐
     *            │ │ │ │ │           │             │
     *            │ │ │ │ └──────────>│    case2    │
     *            │ │ │ │             │             │
     *            │ │ │ │             └─────────────┘
     *            │ │ │ │
     *            │ │ │ │             ┌─────────────┐
     *            │ │ │ │             │             │ [ fall through succ. is next case ]
     *            │ │ │ └────────────>│    case3    │
     *            │ │ │               │             │
     *            │ │ │               └──────┬──────┘
     *            │ │ │                      │
     *            │ │ │                Falls through
     *            │ │ │                      │
     *            │ │ │               ┌──────┴──────┐
     *            │ │ │               │             │ [ previous falls through, preds are switch and previous case ]
     *            │ │ └──────────────>│    case4    │
     *            │ │                 │             │
     *            │ │                 └─────────────┘
     *            │ │
     *            │ │                 ┌─────────────┐
     *            │ │                 │             │
     *            │ └────────────────>│   default   │
     *            │                   │             │
     *   Pred if no default           └──────┬──────┘
     *            │                          │
     *            v                    Pred if default
     *            ┌─────────────┐            │
     *            │             │            │
     *            │    next     │<───────────┘
     *            │             │
     *            └─────────────┘
     *
     * @param {SwitchStatement} node
     * @param {BasicBlock} current
     */
    SwitchStatement( node, current )
    {
        // debugger;
        this.scopes.push_scope( 'switch', node );

        this.add( node, current );

        const
            _switch    = this.blockList.block( current ).desc( 'switch' ).test(),
            _default   = node.cases.findIndex( c => !c.test ),
            hasDefault = _default !== -1,
            caseBlocks = node.cases.map( () => this.blockList.block( _switch ).desc( 'switch-case' ).right() ),
            alternate  = this.blockList.block( hasDefault ? caseBlocks[ _default ] : _switch ).desc( 'switch-next' );

        // caseBlocks[ 0 ].level( 1, true );

        this.switchExits.push( alternate );

        node.cases.forEach( ( c, i ) => this.SwitchCase( c, caseBlocks[ i ], caseBlocks[ i + 1 ] || alternate ) );

        this.switchExits.pop();
        this.scopes.pop_scope();
        alternate.indent = _switch.indent;
        return alternate;
    }

    /**
     * @param {SwitchCase} node
     * @param {BasicBlock} current
     * @param {BasicBlock} next
     */
    SwitchCase( node, current, next )
    {
        current = node.consequent.reduce( ( b, st ) => this.walk( st, b ), current );

        if ( node.consequent.length )
        {
            node.consequent.forEach( n => this.add( n, current ) );
            if ( current.endsInBreak() ) return current;
        }

        current.description += ' (falls through)';
        current.add_succs( next );
        next.left();

        return current;
    }

    /**
     * @param {ThrowStatement} node
     * @param {BasicBlock} current
     */
    ThrowStatement( node, current )
    {
        current.desc( 'throw' );
        this.add( node, current );

        if ( !this.scopes.has_catch() )
        {
            current.add_succs( this.exit );
            return null;
        }

        current.add_succs( this.scopes.peek_catch().catchClause );

        return null;
    }

    /**
     * @param {TryStatement} node
     * @param {?BasicBlock} current
     */
    TryStatement( node, current )
    {
        this.add( node, current );
        const
            body       = this.blockList.block( current ).desc( 'try-body' ),
            catchBlock = this.blockList.block( body ).desc( 'try-handler' ),
            final      = node.finalizer && this.blockList.block( body, catchBlock ).desc( 'finalizer' );

        let after = ( final ? this.blockList.block( final ) : this.blockList.block( body, catchBlock ) ).desc( 'try-next' );

        this.scopes.add_catch( catchBlock, final );
        this.walk( node.body, body );
        this.scopes.pop_catch();

        this.walk( node.handler, catchBlock );

        if ( final )
            this.walk( node.finalizer, final );

        return after;
    }

    /**
     * @param {VariableDeclarator} node
     * @param {BasicBlock} current
     */
    VariableDeclaration( node, current )
    {
        node.declarations.forEach( decl => this.VariableDeclarator( decl.id, current ) );
        return current;
    }

    /**
     * @param {VariableDeclarator} node
     * @param {BasicBlock} current
     * @param {boolean} [isDef=false]
     */
    VariableDeclarator( node, current, isDef = false )
    {
        let defs = from_object_pattern( node );

        if ( !defs ) return current;

        defs = array( defs ) ? defs : [ defs ];

        defs.forEach( name => this[ isDef ? 'define' : 'declare' ]( name, current ) );

        return current;
    }

    /**
     * @param {Node} node
     * @param {BasicBlock} current
     */
    deep_walk( node, current )
    {
        traverse( node, {
            enter: node => {
                if ( node.type === Syntax.AssignmentExpression )
                    this.VariableDeclarator( node.left, current, true );
            }
        } );
    }

    /**
     * @param {Node} node
     * @param {BasicBlock} current
     */
    WhileStatement( node, current )
    {
        this.add( node, current );
        const
            test       = this.blockList.block( current ).desc( 'while-test' ).test(),
            consequent = test.consequent().desc( 'while-body' ),
            alternate  = test.alternate().desc( 'while-next' );

        consequent.add_succs( test );

        this.add( node.test, test );

        this.walk( node.body, consequent );

        return alternate;
    }
}

ignoreTypes.forEach( name => CFGBuilder.prototype[ name ] = function( node, current ) {
    this.collector( { node, current, scope: this.scopes.current } );
    return current;
} );

module.exports = CFGBuilder;
