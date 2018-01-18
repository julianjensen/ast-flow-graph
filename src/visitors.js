/** ****************************************************************************************************
 * @description
 *
 * ### The `for` Statement
 *
 * The `ForStatement` works like shown in the following. Note that the init, test, and update
 * may be absent, leaving only a body, in which case it is an infirnite loop, barring a `break`
 * or `continue`.
 *
 *      PREV ->
 *                      ┌───────────────┐
 *                      v               │
 *           INIT -> TEST -> BODY -> UPDATE  <───── `ContinueStatement` target
 *                     │
 *                     └────> REST OF CODE PAST LOOP   <───── `BreakStatement` target
 *
 *      [INIT]    ->    [TEST]
 *
 *      BODY    -> [UPDATE]
 *
 *      REST
 *
 * ### The `if` Statement
 *
 *            │
 *            │
 *            V
 *      ┌────────────┐     ┌─────────────┐
 *      │    test    │ ──> │ (alternate) │
 *      └────────────┘     └─────────────┘
 *            │                   │
 *            │                   │
 *            V                   │
 *      ┌────────────┐            │
 *      │ consequent │            │
 *      └────────────┘            │
 *            │                   │
 *            │                   │
 *            V                   │
 *      ┌────────────┐            │
 *      │   block    │<───────────┘
 *      └────────────┘
 *
 * ### The `switch` Statement
 *
 * Originally, I treated the Switc/SwitchCase structure like shown in the
 * first diagram but ended up changing it to something more leaborate but
 * closer to how it would actually be treated by a compiler (sub-dividing
 * test cases and so on).
 *
 *              ┌──────────────┐
 *              │              │
 *              │    switch    │
 *              │              │
 *              └──┬─┬─┬─┬─┬─┬─┘
 *                 │ │ │ │ │ │
 *                 │ │ │ │ │ │         ┌─────────────┐
 *                 │ │ │ │ │ │         │             │
 *                 │ │ │ │ │ └────────>│    case1    │
 *                 │ │ │ │ │           │             │
 *                 │ │ │ │ │           └─────────────┘
 *                 │ │ │ │ │
 *                 │ │ │ │ │           ┌─────────────┐
 *                 │ │ │ │ │           │             │
 *                 │ │ │ │ └──────────>│    case2    │
 *                 │ │ │ │             │             │
 *                 │ │ │ │             └─────────────┘
 *                 │ │ │ │
 *                 │ │ │ │             ┌─────────────┐
 *                 │ │ │ │             │             │ [ fall through succ. is next case ]
 *                 │ │ │ └────────────>│    case3    │
 *                 │ │ │               │             │
 *                 │ │ │               └──────┬──────┘
 *                 │ │ │                      │
 *                 │ │ │                Falls through
 *                 │ │ │                      │
 *                 │ │ │               ┌──────┴──────┐
 *                 │ │ │               │             │ [ previous falls through, preds are switch and previous case ]
 *                 │ │ └──────────────>│    case4    │
 *                 │ │                 │             │
 *                 │ │                 └─────────────┘
 *                 │ │
 *                 │ │                 ┌─────────────┐
 *                 │ │                 │             │
 *                 │ └────────────────>│   default   │
 *                 │                   │             │
 *        Pred if no default           └──────┬──────┘
 *                 │                          │
 *                 v                    Pred if default
 *                 ┌─────────────┐            │
 *                 │             │            │
 *                 │    next     │<───────────┘
 *                 │             │
 *                 └─────────────┘
 *
 * Now, I deal with it as shown below. We go from test to test, based on the discriminant
 * in the `SwitchStatement` itself. A `false` result moves on to the next test while a
 * true result transfers control to the body of the `SwitchCase`. Some caveats are:
 *
 * 1. Without a `BreakStatement` at the end that post-dmoniates the block, it will fall
 *    through to the next `SwitchCase` body.
 * 2. There is no requirement that a `SwitchCase` will have a body block, in which case, we
 *    keep falling to the next one, until we reach a body or exit the `SwitchStatement` entirely.
 * 3. We go from false test to false test, however, there may be one `SwitchCase1 that doesn't
 *    have a test, the default case. The default case need not be at the end and follow the
 *    same rules as described above regarding falling through. The false edge from the final
 *    test will go to the default body, if there is one, or the normal block following the
 *    `SwitchStatement`, if there is one (otherwise it will eventually work its way up to the
 *    exit node).
 *
 *      TEST -> true -> body -> break -> out
 *                           -> no break -> next body
 *
 *           -> false -> next test
 *
 * if last
 *
 *      TEST -> true -> body -> break -> out
 *                           -> no break -> out
 *
 *           -> false -> default OR out
 *
 *
 *
 *                  consequent
 *      SWITCH           │
 *         │             v
 *         └──> TEST ───────────> BODY ─────────┐ break
 *                │                │            │
 *             alt│              no│break       │
 *                │              no│body        │
 *                │                │            │
 *                V                V            │
 *              TEST ───────────> BODY ─────────┤ break
 *                │                │            │
 *             alt│              no│break       │
 *                │              no│body        │
 *                │                │            │
 *                │                V            │
 *                │  DEFAULT ───> BODY ─────────┤ break (or not)
 *                │     ^          │            │
 *                │     │        no│break       │
 *                │   if│false   no│body        │
 *                │  and│default   │            │
 *                V     │          V            │
 *              TEST ───────────> BODY ─────────┤ break (or not)
 *                    if│false                  │
 *                and no│default                │
 *                      v                       │
 *      CONT <──────────────────────────────────┘
 *
 *
 * @author julian on 12/22/17
 * @version 1.0.0
 *******************************************************************************************************/
'use strict';

import assert from 'assert';
import { Block, Edge } from './types';
import list from 'yallist';

/**
 * @param {BlockStatement} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function BlockStatement( node, visitorHelper )
{
    return visitorHelper.flatWalk( visitorHelper.newBlock().from( visitorHelper.block ), node.body, visitorHelper );
}

/**
 * @param {LabeledStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function LabeledStatement( node, visitorHelper )
{
    const
        statement = visitorHelper.newBlock().from( visitorHelper.block );

    node.cfg = statement;

    return visitorHelper.flatWalk( statement, node.body, visitorHelper );
}

/**
 * @param {AnnotatedNode} node
 * @param {VisitorHelper} vh
 * @param {Block} type
 * @param {function} targets
 * @return {null}
 * @private
 */
function to_label( node, vh, type, targets )
{
    if ( node.label )
    {
        const
            self  = vh.newBlock().from( vh.block ).add( node ).edge_as( type ).by( type ),
            block = vh.ast.find_label( node, node.label.name );

        if ( !block )
            throw new SyntaxError( `Labeled "${type}" statement has no label "${node.label.name}" in scope: ${node}` );

        block.from( self );

        return null;
    }
    else
    {
        const block = targets();

        if ( !block )
            throw new SyntaxError( `Statement '${type}' is not inside a breakable scope` );

        vh.block.add( node ).to( block ).classify( block, type );


        return null;
    }
}

/**
 * @param {BreakStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock[]}
 * @private
 */
export function BreakStatement( node, visitorHelper )
{
    return to_label( node, visitorHelper, Edge.BREAK, visitorHelper.getBreakTarget );
}

/**
 * @param {CatchClause|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function CatchClause( node, visitorHelper )
{
    return visitorHelper.flatWalk( visitorHelper.newBlock().from( visitorHelper.block ).as( Block.CATCH ).add( node ), node.body, visitorHelper );
}

/**
 * @param {ContinueStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function ContinueStatement( node, visitorHelper )
{
    return to_label( node, visitorHelper, Edge.CONTINUE, visitorHelper.getLoopTarget );
}

/**
 * @param {DoWhileStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function DoWhileStatement( node, visitorHelper )
{
    const
        { newBlock, block } = visitorHelper;

    let
        body = newBlock().from( block ).by( 'DoWhile.body' ).as( Block.LOOP ),
        cont = newBlock().as( Block.CONVERGE ).by( 'DoWhile.conv' ),
        test = newBlock().as( Block.TEST ).by( 'DoWhile.test' ).add( node.test ).whenTrue( body ).whenFalse( cont );

    visitorHelper.addLoopTarget( test, cont );
    body = visitorHelper.flatWalk( body, node, visitorHelper );
    visitorHelper.popTarget();

    test.from( body );

    return cont;
}

/**
 * The `ForStatement` works like shown in the following. Note that the init, test, and update
 * may be absent, leaving only a body, in which case it is an infirnite loop, barring a `break`
 * or `continue`.
 *
 * PREV ->
 *                 ┌───────────────┐
 *                 v               │
 *      INIT -> TEST -> BODY -> UPDATE  <───── `ContinueStatement` target
 *                │
 *                └────> REST OF CODE PAST LOOP   <───── `BreakStatement` target
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
 * @param {ForStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function ForStatement( node, visitorHelper )
{
    const
        { newBlock, block } = visitorHelper;

    let init   = node.init && newBlock().by( 'For.init' ).add( node.init ),
        test   = node.test && newBlock().as( Block.TEST ).by( 'For.test' ).add( node.test ),
        body   = newBlock().by( 'For.body' ).as( Block.LOOP ),
        update = node.update && newBlock().by( 'For.update' ).add( node.update ),
        cont   = newBlock().as( Block.CONVERGE ).by( 'For.conv' );

    // *************** ENTRY
    // entry block wants: init -> test -> body (there is always a body)

    if ( init )
        block.to( init );
    else if ( test )
        block.to( test );
    else
        block.to( body );

    // entry block resolved

    if ( init )
    {
        if ( test )
            init.to( test );
        else
            init.to( body );
    }

    // init block resolved

    if ( test )
    {
        test.whenTrue( body );
        test.whenFalse( cont );
    }

    visitorHelper.addLoopTarget( update || test || body, cont );
    let endBody = visitorHelper.flatWalk( body, node.body, visitorHelper );
    visitorHelper.popTarget();

    if ( endBody )
    {
        if ( update )
            endBody.to( update );
        else if ( test )
            endBody.to( test );
        else
            endBody.to( body );
    }

    if ( update )
    {
        if ( test )
            update.to( test );
        else
            update.to( body );
    }

    return cont;
}

/**
 * @param {ForInStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function ForInStatement( node, visitorHelper )
{
    const { newBlock, block } = visitorHelper;

    let update = newBlock().from( block ).add( node ).by( 'ForInOf.update' ),
        body   = newBlock().from( update ).by( 'ForInOf.body' ).as( Block.LOOP ),
        cont   = newBlock().from( update ).as( Block.CONVERGE ).by( 'ForInOf.conv' );

    visitorHelper.addLoopTarget( update, cont );
    body = visitorHelper.flatWalk( body, node.body, visitorHelper );
    visitorHelper.popTarget();

    if ( body ) body.to( update );

    return cont;
}

/**
 * @param {ForInStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function ForOfStatement( node, visitorHelper )
{
    return ForInStatement( node, visitorHelper );
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
 * @param {IfStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock[]}
 * @private
 */
export function IfStatement( node, visitorHelper )
{
    let test       = visitorHelper.newBlock()
        .as( Block.TEST )
        .from( visitorHelper.block )
        .by( 'If.test' )
        .add( node.test ),

        consequent = visitorHelper.newBlock().by( 'If.cons' ),
        alternate;

    test.whenTrue( consequent );
    consequent = visitorHelper.flatWalk( consequent, node.consequent, visitorHelper );

    alternate = visitorHelper.newBlock().by( 'If.alt' );
    test.whenFalse( alternate );

    if ( node.alternate )
        alternate = visitorHelper.flatWalk( alternate, node.alternate, visitorHelper );

    if ( !node.alternate && consequent ) consequent.to( alternate );

    return [ consequent, alternate ];
}

/**
 * @param {ReturnStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function ReturnStatement( node, visitorHelper )
{
    visitorHelper.block.add( node ).defer_edge_type( Edge.RETURN );
    visitorHelper.toExit.push( visitorHelper.block );

    return null;
}

/**
 * Originally, I treated the Switc/SwitchCase structure like shown in the
 * first diagram but ended up changing it to something more leaborate but
 * closer to how it would actually be treated by a compiler (sub-dividing
 * test cases and so on).
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
 * Now, I deal with it as shown below. We go from test to test, based on the discriminant
 * in the `SwitchStatement` itself. A `false` result moves on to the next test while a
 * true result transfers control to the body of the `SwitchCase`. Some caveats are:
 *
 * 1. Without a `BreakStatement` at the end that post-dmoniates the block, it will fall
 *    through to the next `SwitchCase` body.
 * 2. There is no requirement that a `SwitchCase` will have a body block, in which case, we
 *    keep falling to the next one, until we reach a body or exit the `SwitchStatement` entirely.
 * 3. We go from false test to false test, however, there may be one `SwitchCase1 that doesn't
 *    have a test, the default case. The default case need not be at the end and follow the
 *    same rules as described above regarding falling through. The false edge from the final
 *    test will go to the default body, if there is one, or the normal block following the
 *    `SwitchStatement`, if there is one (otherwise it will eventually work its way up to the
 *    exit node).
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
 *    └──> TEST ───────────> BODY ─────────┐ break
 *           │                │            │
 *        alt│              no│break       │
 *           │              no│body        │
 *           │                │            │
 *           V                V            │
 *         TEST ───────────> BODY ─────────┤ break
 *           │                │            │
 *        alt│              no│break       │
 *           │              no│body        │
 *           │                │            │
 *           │                V            │
 *           │  DEFAULT ───> BODY ─────────┤ break (or not)
 *           │     ^          │            │
 *           │     │        no│break       │
 *           │   if│false   no│body        │
 *           │  and│default   │            │
 *           V     │          V            │
 *         TEST ───────────> BODY ─────────┤ break (or not)
 *               if│false                  │
 *           and no│default                │
 *                 v                       │
 * CONT <──────────────────────────────────┘
 *
 * @param {SwitchStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @private
 */
export function SwitchStatement( node, visitorHelper )
{
    const { newBlock, block } = visitorHelper;

    let _switch  = newBlock().from( block ).add( node.discriminant ),
        cont     = newBlock().as( Block.CONVERGE ),

        /**
         * @type {CaseInfo}
         * @private
         */
        _default,

        /**
         * @type {List<CaseInfo>}
         * @private
         */
        caseList = list.create( node.cases.map( n => {

            let test     = n.test && newBlock().as( Block.TEST ).add( n.test ),
                body     = n.consequent && n.consequent.length && newBlock(),
                /**
                 * @type {CaseInfo}
                 * @private
                 */
                caseInfo = {
                    body,
                    test,
                    switchTest: n.test,
                    consequent: n.consequent
                };

            if ( !test )
                _default = caseInfo;

            return caseInfo;
        } ) );

    visitorHelper.addBreakTarget( cont );

    let prevCi       = _switch,
        needBody     = [],
        lastTest     = null,
        fallsThrough = null;

    caseList.forEach( ci => {
        if ( ci.test )
        {
            lastTest = ci.test;
            if ( prevCi !== _switch )
                prevCi.test.whenFalse( ci.test );
            else
                _switch.to( ci.test );
            prevCi = ci;
        }

        if ( ci.body )
        {
            if ( fallsThrough )
            {
                fallsThrough.to( ci.body );
                fallsThrough = null;
            }

            for ( const pci of needBody )
            {
                if ( pci.test )
                    pci.test.whenTrue( ci.body );
                else if ( !pci.body )
                    pci.body = ci.body;
            }

            needBody.length = 0;

            if ( ci.test ) ci.test.whenTrue( ci.body );

            fallsThrough = visitorHelper.flatWalk( ci.body, ci.consequent, visitorHelper );
        }
        else
            needBody.push( ci );
    } );

    if ( fallsThrough ) fallsThrough.to( cont );

    if ( _default )
    {
        if ( !_default.body ) _default.body = cont;

        if ( lastTest )
            lastTest.whenFalse( _default.body );
    }


    if ( !caseList.size )
        _switch.to( cont );

    visitorHelper.popTarget();

    return cont;
}

/**
 * @param {SwitchCase|AnnotatedNode} node
 * @return {?CFGBlock}
 * @private
 */
export function SwitchCase( node )
{
    throw new Error( `We hit a switch case which shouldn't happen, node: ${node}` );
}

/**
 * @param {ThrowStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function ThrowStatement( node, visitorHelper )
{
    visitorHelper.block.add( node ).as( Block.THROW ).edge_as( Edge.EXCEPTION );
    return null;
}

/**
 * TRY -> CATCH -> FINALIZER -> OUT
 * TRY          -> FINALIZER -> OUT
 *     -> CATCH              -> OUT
 *                           -> OUT
 *
 * IF FINALIZER
 *      FINALIZER => OUT
 * ELSE
 *      CATCH, TRY => OUT
 *
 * @param {TryStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock|CFGBlock[]}
 * @private
 */
export function TryStatement( node, visitorHelper )
{
    let { newBlock, block } = visitorHelper,
        finalizer,
        tryBlock            = newBlock().add( node ).from( block );

    let tb              = block;
    visitorHelper.block = tryBlock;
    let catchBlock      = CatchClause( node.handler, visitorHelper );
    visitorHelper.block = tb;

    if ( node.finalizer )
    {
        finalizer = newBlock().from( [ tryBlock, catchBlock ] );
        finalizer = visitorHelper.flatWalk( finalizer, node.finalizer, visitorHelper );
    }

    return finalizer || [ tryBlock, catchBlock ];
}

/**
 * @param {WhileStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function WhileStatement( node, visitorHelper )
{
    const { newBlock, block } = visitorHelper;

    let
        body = newBlock().as( Block.LOOP ),
        alt  = newBlock().as( Block.CONVERGE ),
        test = newBlock().as( Block.TEST ).add( node.test ).whenFalse( alt ).whenTrue( body ).from( block );

    visitorHelper.addLoopTarget( test, alt );
    body = visitorHelper.flatWalk( body, node.body, visitorHelper );
    visitorHelper.popTarget();

    assert( body, "Where yo body at?" );
    if ( body )
        body.to( test );

    return alt;
}

/**
 * @param {ConditionalExpression|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock[]}
 * @private
 */
export function ConditionalExpression( node, visitorHelper )
{
    const { newBlock, block } = visitorHelper;

    let cons = newBlock(),
        alternate,
        test = newBlock()
            .from( block )
            .add( node.test )
            .as( Block.TEST )
            .whenTrue( cons );

    cons = visitorHelper.flatWalk( cons, node.consequent, visitorHelper );

    if ( node.alternate )
    {
        alternate = newBlock();
        test.whenFalse( alternate );
        alternate = visitorHelper.flatWalk( alternate, node.alternate, visitorHelper );
    }

    const output = [];

    if ( !cons && !alternate ) return null;

    if ( cons ) output.push( cons );
    if ( alternate ) output.push( alternate );

    return output;
}

/**
 * @param {BaseNode|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 * @private
 */
export function syntax_default( node, visitorHelper )
{
    return visitorHelper.block.add( node );
}
