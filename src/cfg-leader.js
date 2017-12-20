/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";

const
    list                                                  = require( './utils/link-list' ),
    BasicBlock                                            = require( './basic-block' ),
    BlockManager                                          = require( './cfg/cfg-block' ),
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
 * @param {BlockManager} bm
 * @param {Scopes} scopes
 */
function cfg_leaders( ast, bm, scopes )
{
    const isBreakable = block => breakStack.length && breakStack[ breakStack.length - 1 ] === block;

    let entry = [ bl.startNode ],
        exit  = [ bl.exitNode ];

    state.deferred = {};
    state.targets  = {};

    if ( bl ) bb = _newNode( bl );

    /**
     * @param {BaseNode|Node} n
     * @param {BaseNode|Node} p
     * @param {?CFGBlock} prev
     * @param {?(BaseNode|Node)} [prevNode]
     * @param {?(BaseNode|Node)} [nextNode]
     */
    function leader( n, p, prev, prevNode, nextNode )
    {
        if ( !prev ) return false;  // Unreachable code

        scopes.scope_from_ast( n );

        let isOnBreakStack = isBreakable( prev );


        const
            sub        = ( _node, _prev ) => _node ? ast.walker( _node, ( __node, __p, prev, f, i, next ) => leader( __node, __p, _prev, prev, next ) ) : null,

            walk_block = ( block, nodes, i = 0 ) => {

                while ( i < nodes.length )
                {
                    const n = nodes.body[ i ];

                    if ( !cfgBlocks.has( n.type ) )
                        block.add( n );
                    else if ( !causesUnreachable.has( n.type ) )
                        block = sub( n, block );
                    else
                        return null;
                }

                return block;
            },

            entries    = {
                /** @param {BlockStatement} node */
                [ Syntax.BlockStatement ]: node => {

                    let block = bm.block().from( prev );

                    return walk_block( block, node.body );
                    //     i = 0;
                    //
                    // while ( i < node.body.length )
                    // {
                    //     const n = node.body[ i ];
                    //
                    //     if ( !cfgBlocks.has( n.type ) )
                    //         block.add( n );
                    //     else if ( !causesUnreachable.has( n.type ) )
                    //         block = sub( n, block );
                    //     else
                    //         break;
                    // }
                    //
                    // return block;
                },

                [ Syntax.BreakStatement ]: node => {
                    if ( node.label )
                    {
                        prev.add( node );

                        const block = ast.find_label( node, node.label );

                        if ( block )
                        {
                            block.from( prev );
                            return null;
                        }

                        if ( !state.deferred[ node.label ] ) state.deferred[ node.label ] = [];
                        state.deferred[ node.label ].push( { cfg: prev, node } );
                    }
                    else
                    {
                        if ( !breakStack.length )
                            throw new SyntaxError( `Statement 'break' is not inside a loop or switch statement` );

                        breakStack[ breakStack.length - 1 ].from( prev );

                        return null;
                    }
                },
                [ Syntax.CatchClause ]:    node => {
                    return sub( node.body, bm.block().from( prev ) );
                },

                [ Syntax.ContinueStatement ]: node => {
                    if ( node.label )
                    {
                        prev.add( node );

                        const block = ast.find_label( node, node.label );

                        if ( block )
                        {
                            block.from( prev );
                            return null;
                        }

                        if ( !state.deferred[ node.label ] ) state.deferred[ node.label ] = [];
                        state.deferred[ node.label ].push( { cfg: prev, node } );
                    }
                    else
                    {
                        if ( !breakStack.length )
                            throw new SyntaxError( `Statement 'continue' is not inside a loop` );

                        breakStack[ breakStack.length - 1 ].from( prev );

                        return null;
                    }
                },

                [ Syntax.DoWhileStatement ]: node => {
                    let
                        bodyStart = bm.block().from( prev ),
                        test      = bm.block().as( BlockManager.TEST ),
                        cont      = bm.block();

                    breakStack.push( cont );
                    let bodyEnd = sub( node.body, bodyStart );
                    breakStack.pop();


                    test.from( bodyEnd ).whenTrue( bodyStart ).whenFalse( cont );

                    sub( node.test, test );

                    return cont;
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
                [ Syntax.ForStatement ]: node => {

                    let init   = bm.block().from( prev ),
                        test   = bm.block().from( init ).as( BlockManager.TEST ),
                        body   = bm.block(),
                        update = bm.block(),
                        cont   = bm.block();

                    test.whenTrue( body ).whenFalse( cont );
                    update.from( sub( node.body, body ) ).to( test );

                    return cont;
                },

                /**
                 * @param {ForInStatement} node
                 */
                [ Syntax.ForInStatement ]: node => {
                    let update = bm.block().from( prev ).add( node ),
                        body   = bm.block().from( update ),
                        cont   = bm.block().from( update );

                    body = sub( node.body, body );
                    if ( body ) body.to( update );

                    return cont;
                },

                /**
                 * @param {ForOfStatement} node
                 */
                [ Syntax.ForOfStatement ]: node => {
                    return self[ Syntax.ForInStatement ]( node );
                },

                /**
                 * @param {IfStatement} node
                 */
                [ Syntax.IfStatement ]: node => {
                    let test       = bm.block().as( BlockManager.TEST ).from( prev ),
                        consequent = bm.block(),
                        alternate  = bm.block(),
                        cont       = bm.block();

                    test.whenTrue( consequent ).whenFalse( alternate );

                    return cont.from( sub( node.consequent, consequent ) ).from( sub( node.alternate, alternate ) );
                },

                /**
                 * @param {LabeledStatement} node
                 */
                [ Syntax.LabeledStatement ]: node => {
                    return sub( node.statement, bm.block().from( prev ) );
                },

                /** @param {ReturnStatement} node */
                [ Syntax.ReturnStatement ]: node => {

                    prev.add( node );
                    if ( node.argument ) sub( node.argument, prev );
                    exit.from( prev );
                },

                /**
                 * @typedef {object} CaseInfo
                 * @property {?CFGBlock} [test]
                 * @property {?CFGBlock} [body]
                 * @property {?CFGBlock} [forwardBody]
                 * @property {SwitchCase} switchCase
                 */

                /**
                 *
                 * TEST -> true -> body -> break -> out
                 *                      -> no break -> next body
                 *
                 *      -> false -> next test
                 *
                 * if last
                 *
                 * TEST -> true -> body -> break -> out
                 *                      -> no break -> out
                 *
                 *      -> false -> default OR out
                 *
                 *
                 *
                 *             consequent
                 * SWITCH           │
                 *    │             v
                 *    └──> TEST ──────────> BODY ──────────┐ break
                 *           │                │            │
                 *        alt│              no│break       │
                 *           │              no│body        │
                 *           │                │            │
                 *           V                V            │
                 *         TEST ───────────> BODY ─────────┤ break
                 *           │                  │          │
                 *        alt│                no│break     │
                 *           │                no│body      │
                 *           │                  │          │
                 *           │                  V          │
                 *           │  DEFAULT ─────> BODY ───────┤ break (or not)
                 *           │                  │          │
                 *           │                no│break     │
                 *           │                no│body      │
                 *           │                  │          │
                 *           V                  V          │
                 *         TEST ─────────────> BODY ───────┤ break (or not)
                 *                                         │
                 *                                         │
                 * CONT <──────────────────────────────────┘
                 *
                 * @param {SwitchStatement} node
                 */
                [ Syntax.SwitchStatement ]: node => {

                    let _switch      = bm.block().from( prev ).add( node ),
                        cont         = bm.block(),
                        alt          = bm.block(),
                        /** @type {List<CaseInfo>} */
                        caseList     = list(),
                        /** @type {CaseInfo} */
                        _default,
                        defaultIndex = -1;

                        node.cases.forEach( ( n, i ) => {

                            let test     = n.test && bm.block().as( BlockManager.TEST ).add( n.test ),
                                body     = n.consequent && n.consequent.length && bm.block(),
                                /** @type {CaseInfo} */
                                caseInfo = { body, test, switchCase: n };

                            if ( !test )
                            {
                                _default     = caseInfo;
                                defaultIndex = i;
                            }
                            else
                                caseList.add( caseInfo );
                        } );

                    _switch.add( node.discriminant );

                    let dup = caseList.tail,
                        lastBody = cont,
                        i = _default && _default.body ? caseList.size - 1 : -1;

                    while ( dup )
                    {
                        if ( i === defaultIndex )
                        {
                            lastBody = _default.body;
                            i = -1;
                            continue;
                        }

                        if ( !dup.data.body )
                            dup.data.forwardBody = lastBody;
                        else
                            lastBody = dup.data.body;

                        --i;
                        dup = dup.prev;
                    }


                    breakStack.push( cont );

                    if ( !caseList.size )
                        _switch.to( cont );
                    else
                    {
                        _switch.to( caseList.head.test );

                        caseList.forEach( ( cse, i, listNode ) => {
                            let
                                test = cse.test,
                                body = cse.body;

                            if ( listNode.next )
                                test.whenFalse( listNode.next.data.test ).add( cse.switchCase.test );
                            else if ( _default )
                                test.whenFalse( _default.body ).add( cse.switchCase.test );
                            else
                                test.whenFalse( cont ).add( cse.switchCase.test );

                            if ( !body )
                                test.whenTrue( cse.forwardBody );
                            else
                            {
                                test.whenTrue( body );

                                body = walk_block( body, cse.switchCase.consequent );

                                let nxt = listNode.next,
                                    ncse = nxt && nxt.data;

                                if ( body ) body.to( !nxt ? cont : ncse.body ? ncse.body : ncse.forwardBody );
                            }
                        } );
                    }

                    breakStack.pop();

                    return cont;
                },
                [ Syntax.SwitchCase ]:      () => prev,
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
                    let
                        body = bm.block(),
                        alt = bm.block(),
                        test = bm.block().as( BlockManager.TEST ).add( node.test ).whenFalse( alt ).whenTrue( body );

                    sub( node.test, test );

                    breakStack.push( alt );
                    body = sub( node.body, body );
                    breakStack.pop();

                    body.to( test );
                    return alt;
                },

                /**
                 * @param {ConditionalExpression} node
                 */
                [ Syntax.ConditionalExpression ]: node => {
                    let cons = bm.block().add( node.consequent ),
                        alt  = bm.block(),
                        test = bm.block().add( node.test ).as( BlockManager.TEST ).whenTrue( cons ).whenFalse( alt );

                    cons = sub( node.consequent, cons );
                    alt  = sub( node.alternate, alt );

                    if ( !cons && !alt ) return null;

                    let cont = bm.block();

                    if ( cons ) cont.from( cons );
                    if ( alt ) cont.from( alt );

                    return cont;
                },
                'default':                        node => {
                    run = false;
                    return prev.add_node( node );
                }
            };

        var self = entries;

        if ( entries[ n.type ] )
            return entries[ n.type ]( n, p, prevNode, nextNode );
        else
            return entries.default( n );
    }

    let current = null;

    ast.walker( ( n, p, prev, f, i, next ) => {
        current = leader( n, p, current, prev, next );
        return false;
    } );
}

function create_new_cfg( ast )
{
    const bm = new BlockManager();
    cfg_leaders( ast, bm, ast.scopes );
    return bm;
}

module.exports = create_new_cfg;
