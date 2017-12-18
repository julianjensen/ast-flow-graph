/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";

const
    BasicBlock                                            = require( './basic-block' ),
    // _inspect                                     = require( 'util' ).inspect,
    // inspect                                      = ( o, d ) => _inspect( o, { depth: typeof d === 'number' ? d : 2, colors: true } ),
    { cfgBlocks, causesUnreachable, Syntax, ignoreTypes } = require( './defines' ),
    { traverse }                                          = require( 'estraverse' ),
    {
        from_object_pattern,
        get_start_nodes
    }                                                     = require( './utils/ast-helpers' ),
    { isArray: array }                                    = Array,
    _newNode                                              = bl => ( ...preds ) => bl.block( ...preds );

let bb;

function add_block( node, prev, type = 'normal' )
{
    let newBlock;

    if ( !prev )
    {
        newBlock = bb( prev );
    }
    else if ( type === 'consequent' )
        newBlock = prev.consequent();
    else if ( type === 'alternate' )
        newBlock = prev.alternate();
    else
        newBlock = bb( prev );

    newBlock.add_node( node ).block_type( type );

    return type === 'test' ? newBlock.test() : newBlock;
}

function chain_optionals( prev, ...nodes )
{
    return nodes.filter( n => !!n ).reduce( ( prevBlock, node ) => add_block( node, prevBlock ), prev );
}

const
    state      = {
        deferred: {},
        targets:  {}
    },
    breakStack = [];


/**
 * If an AST node doesn't output an edge then it can be assumed that it has a single edge to the next ASTNode, if any,
 * and can be merged into the current block. Multiple edges requires additional blocks.
 *
 * @param {AST} ast
 * @param {BasicBlockList} [bl]
 * @param {Scopes} scopes
 */
function cfg_leaders( ast, bl, scopes )
{
    const isBreakable = block => breakStack.length && breakStack[ breakStack.length - 1 ] === block;

    let entry = [ bl.startNode ],
        exit  = [ bl.exitNode ];

    state.deferred = {};
    state.targets  = {};

    if ( bl ) bb = _newNode( bl );

    /**
     * @paran {BaseNode|Node} n
     * @paran {BaseNode|Node} p
     * @param {?BasicBlock} prev
     */
    function leader( n, p, prev )
    {
        if ( !prev ) return false;  // Unreachable code

        scopes.scope_from_ast( n );

        let isOnBreakStack = isBreakable( prev );


        const
            sub     = ( _node, _prev ) => ast.walker( _node, ( __node, __p ) => leader( __node, __p, _prev ) ),

            entries = {
                /** @param {BlockStatement} node */
                [ Syntax.BlockStatement ]: node => {

                    let i = 0;

                    while ( i < node.body.length )
                    {
                        const n = node.body[ i ];

                        if ( !cfgBlocks.has( n.type ) )
                            prev.add_node( n );
                        else if ( !causesUnreachable.has( n.type ) )
                            prev = sub( n, prev );
                        else
                            break;
                    }

                    return prev;
                },

                [ Syntax.BreakStatement ]: node => {
                    if ( node.label )
                    {
                        prev.add_node( node );

                        if ( !state.deferred[ node.label ] ) state.deferred[ node.label ] = [];
                        state.deferred[ node.label ].push( prev );
                    }
                    else
                    {
                        if ( !breakStack.length )
                            throw new SyntaxError( `Statement 'break' is not inside a loop or switch statement` );

                        breakStack[ breakStack.length - 1 ].add_pred( prev );

                        return null;
                    }
                },
                [ Syntax.CatchClause ]:    node => {},

                [ Syntax.ContinueStatement ]: node => {
                    if ( node.label )
                    {
                        prev.add_node( node );

                        if ( !state.deferred[ node.label ] ) state.deferred[ node.label ] = [];
                        state.deferred[ node.label ].push( prev );
                    }
                    else
                    {
                        if ( !breakStack.length )
                            throw new SyntaxError( `Statement 'continue' is not inside a loop` );

                        breakStack[ breakStack.length - 1 ].add_pred( prev );

                        return null;
                    }
                },

                [ Syntax.DoWhileStatement ]: node => {
                    const
                        body = add_block( node.body, prev, 'loop' ),
                        test = add_block( node.test, body, 'test' ),
                        alt  = test.alternate();

                    test.consequent( body );

                    breakStack.push( alt );
                    sub( node.body, prev );
                    breakStack.pop();

                    sub( node.test, body );

                    return alt;
                },

                /**
                 *
                 * PREV ->
                 *                 ┌───────────────┐
                 *                 v               │
                 *      INIT -> TEST -> BODY -> UPDATE
                 *                │
                 *                └────> REST
                 *
                 * [INIT]    ->    [TEST]
                 *
                 * BODY    -> [UPDATE]
                 *
                 * REST
                 *
                 *
                 *
                 *
                 * @param {ForStatement} node
                 */
                [ Syntax.ForStatement ]:     node => {
                    let init = node.init && add_block( node.init, prev, 'init' ),
                        initEnd = init && sub( node.init, init ),

                        test = node.test && add_block( node.test, initEnd || prev, 'test' ),
                        testEnd = test && sub( node.test, test );

                    let consequent,
                        alternate;

                    if ( test )
                    {
                        consequent = add_block( node.body, testEnd, 'consequent' );
                        alternate = add_block( null, testEnd, 'alternate' );
                    }
                    else
                    {
                        consequent = sub( node.body, add_block( node.body, init || prev ) );
                        alternate = add_block( null, consequent );
                    }

                    let update = node.update && add_block( node.update, consequent ),
                        updateEnd = update && sub( node.update, update );

                    if ( updateEnd )
                        updateEnd.add_succ( test || consequent );
                    else
                        consequent.add_succ( test || consequent );

                    return alternate;
                },

                /**
                 * @param {ForInStatement} node
                 */
                [ Syntax.ForInStatement ]:   node => {

                },

                /**
                 * @param {ForOfStatement} node
                 */
                [ Syntax.ForOfStatement ]:   node => {

                },

                /**
                 * @param {IfStatement} node
                 */
                [ Syntax.IfStatement ]:      node => {

                },

                /**
                 * @param {LabeledStatement} node
                 */
                [ Syntax.LabeledStatement ]: node => {
                    const p = add_block( node, prev );

                    state.targets[ node.label ] = p;

                    return sub( node.statement, p );
                },

                /** @param {ReturnStatement} node */
                [ Syntax.ReturnStatement ]: node => {
                    prev.add_node( node );
                    if ( node.argument ) sub( node.argument, prev );
                    exit.add_preds( prev );
                },

                /**
                 * @param {SwitchStatement} node
                 */
                [ Syntax.SwitchStatement ]: node => {
                    const
                        _default   = node.cases.findIndex( c => !c.test ),
                        hasDefault = _default !== -1,

                        test       = add_block( node.discriminant, prev ),
                        cases      = node.cases.map( nc => add_block( nc, test ) ),
                        alt        = hasDefault && add_block( _default );

                    let out;

                    if ( alt )
                        out = add_block( null, alt );
                    else
                        out = add_block( null, test, 'alternate' );


                    breakStack.push( out );
                    node.cases.forEach( ( _case, i ) => entries[ Syntax.SwitchCase ]( _case, test, cases[ i ], out ) );
                    breakStack.pop();

                    return out;
                },
                [ Syntax.SwitchCase ]:      ( node, _switch, next, done ) => {
                    let test = add_block( node.test, _switch, 'test' ),
                        cons = add_block( node.consequent, test, 'consequent' );

                    if ( node.consequent.length )
                    {
                        if ( node.consequent[ node.consequent.length - 1 ].type === Syntax.BreakStatement )
                            sub( node.consequent, cons );
                        else
                        {
                            cons = sub( node.consequent, cons );
                            cons.add_succ( next || done );
                        }
                    }
                    else
                        cons.add_succ( next || done );
                },
                [ Syntax.ThrowStatement ]:  ( node, parent ) => {},

                // /** @param {TryStatement} node */
                // [ Syntax.TryStatement ]: node => {
                //
                //     prev = add_block( node.block, prev );
                //
                //     prev = sub( node.block )
                //         handler = node.handler && add_block( node.handler, block ),
                //         finalizer = node.finalizer && add_block( node.finalizer, handler || block );
                //
                //
                //
                // },

                /**
                 * @param {WhileStatement} node
                 */
                [ Syntax.WhileStatement ]: node => {
                    let test = add_block( node.test, prev, 'test' ),
                        body = add_block( node.body, test, 'consequent' ),
                        alt  = add_block( null, test, 'alternate' );

                    sub( node.test, test );

                    breakStack.push( alt );
                    body = sub( node.body, body );
                    breakStack.pop();

                    body.add_succ( test );
                    return alt;
                },

                /**
                 * @param {ConditionalExpression} node
                 */
                [ Syntax.ConditionalExpression ]: node => {
                    let test = add_block( node.test, prev, 'test' ),
                        cons = add_block( node.consequent, test, 'consequent' ),
                        alt  = add_block( node.alternate, test, 'alternate' );

                    cons = sub( node.consequent, cons );
                    alt  = sub( node.alternate, alt );

                    if ( !cons && !alt ) return null;

                    return bb( cons, alt );
                },
                'default':                        node => {
                    run = false;
                    return prev.add_node( node );
                }
            };

        if ( entries[ n.type ] )
            return entries[ n.type ]( n, p );
        else
            return entries.default( n );
    }

    let current = null;

    ast.walker( ( n, p ) => {
        current = leader( n, p, current );
        return false;
    } );
}

module.exports = cfg_leaders;
