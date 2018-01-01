/** ****************************************************************************************************
 * File: visitors (cfg)
 *
 * \[\s*Syntax\.([a-zA-Z]+)\s*]\s*:\s*(.*?)(?==>)=>\s*((?:.|\n)*?)\s*(?=\/\*\*\n|\[\s*Syntax\.[a-zA-Z]+\s*\][^(])
 * (( +)\/\*\*\n(?:.|\n)+?\2 \*\/\n\s*)?\[\s*Syntax\.([a-zA-Z]+)\s*]\s*:\s*(.*?)(?==>)=>\s*((?:.|\n)*?)\s*(?=\s{8}},)
 *
 * @author julian on 12/22/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

/** */
const
    list         = require( 'yallist' );

module.exports = {
    BlockStatement,
    BreakStatement,
    CatchClause,
    ContinueStatement,
    DoWhileStatement,
    ForStatement,
    ForInStatement,
    ForOfStatement,
    IfStatement,
    LabeledStatement,
    ReturnStatement,
    SwitchStatement,
    SwitchCase,
    ThrowStatement,
    TryStatement,
    WhileStatement,
    ConditionalExpression,
    syntax_default
};

/**
 * @param {BlockStatement} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function BlockStatement( node, visitorHelper )
{
    return visitorHelper.flatWalk( visitorHelper.newBlock().from( visitorHelper.block ), node.body, visitorHelper );
}

/**
 * @param {LabeledStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function LabeledStatement( node, visitorHelper )
{
    const
        statement = visitorHelper.newBlock().from( visitorHelper.block );

    node.cfg = statement;

    return visitorHelper.flatWalk( statement, node.body, visitorHelper );
}

function to_label( node, vh, type, targets )
{
    if ( node.label )
    {
        const
            self  = vh.newBlock().from( vh.block ).add( node ).as( type ).by( type ),
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

        block.from( vh.block.add( node ).as( type ).by( type ) );

        return null;
    }
}

/**
 * @param {BreakStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock[]}
 */
function BreakStatement( node, visitorHelper )
{
    return to_label( node, visitorHelper, visitorHelper.BlockManager.BREAK, visitorHelper.getBreakTarget );
}

/**
 * @param {CatchClause|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function CatchClause( node, visitorHelper )
{
    return visitorHelper.flatWalk( visitorHelper.newBlock().from( visitorHelper.block ).add( node ), node.body, visitorHelper );
}

/**
 * @param {ContinueStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function ContinueStatement( node, visitorHelper )
{
    return to_label( node, visitorHelper, visitorHelper.BlockManager.CONTINUE, visitorHelper.getLoopTarget );
}

/**
 * @param {DoWhileStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function DoWhileStatement( node, visitorHelper )
{
    const
        { newBlock, block } = visitorHelper;

    let
        body = newBlock().from( block ).by( 'DoWhile.body' ),
        cont = newBlock().as( visitorHelper.BlockManager.CONVERGE ).by( 'DoWhile.conv' ),
        test = newBlock().as( visitorHelper.BlockManager.TEST ).by( 'DoWhile.test' ).add( node.test ).whenTrue( body ).whenFalse( cont );

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
 */
function ForStatement( node, visitorHelper )
{
    const
        { newBlock, block } = visitorHelper;

    let init   = node.init && newBlock().by( 'For.init' ).add( node.init ),
        test   = node.test && newBlock().as( visitorHelper.BlockManager.TEST ).by( 'For.test' ).add( node.test ),
        body   = newBlock().by( 'For.body' ),
        update = node.update && newBlock().by( 'For.update' ).add( node.update ),
        cont   = newBlock().as( visitorHelper.BlockManager.CONVERGE ).by( 'For.conv' );

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
 */
function ForInStatement( node, visitorHelper )
{
    const { newBlock, block } = visitorHelper;

    let update = newBlock().from( block ).add( node ).by( 'ForInOf.update' ),
        body   = newBlock().from( update ).by( 'ForInOf.body' ),
        cont   = newBlock().from( update ).as( visitorHelper.BlockManager.CONVERGE ).by( 'ForInOf.conv' );

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
 */
function ForOfStatement( node, visitorHelper )
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
 */
function IfStatement( node, visitorHelper )
{
    let test       = visitorHelper.newBlock()
        .as( visitorHelper.BlockManager.TEST )
        .from( visitorHelper.block )
        .by( 'If.test' )
        .add( node.test ),

        consequent = visitorHelper.newBlock().by( 'If.cons' ),
        alternate;
        // cont       = visitorHelper.newBlock().as( visitorHelper.BlockManager.CONVERGE );

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
 */
function ReturnStatement( node, visitorHelper )
{
    visitorHelper.block.add( node );
    visitorHelper.toExit.push( visitorHelper.block );

    return null;
}

/**
 * @typedef {object} CaseInfo
 * @property {?CFGBlock} [test]
 * @property {?CFGBlock} [body]
 * @property {?AnnotatedNode} switchTest
 * @property {AnnotatedNode} consequent
 */

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
 *           │     ^            │          │
 *           │     │          no│break     │
 *           │   if│false     no│body      │
 *           │  and│default     │          │
 *           V     │            V          │
 *         TEST ─────────────> BODY ───────┤ break (or not)
 *               if│false                  │
 *           and no│default                │
 *                 v                       │
 * CONT <──────────────────────────────────┘
 *
 * @param {SwitchStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 */
function SwitchStatement( node, visitorHelper )
{
    const { newBlock, block } = visitorHelper;

    let _switch  = newBlock().from( block ).add( node.discriminant ),
        cont     = newBlock().as( visitorHelper.BlockManager.CONVERGE ),

        /** @type {CaseInfo} */
        _default,

        /** @type {List<CaseInfo>} */
        caseList = list.create( node.cases.map( n => {

            let test     = n.test && newBlock().as( visitorHelper.BlockManager.TEST ).add( n.test ),
                body     = n.consequent && n.consequent.length && newBlock(),
                /** @type {CaseInfo} */
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
 */
function SwitchCase( node )
{
    throw new Error( `We hit a switch case which shouldn't happen, node: ${node}` );
}

/**
 * @param {ThrowStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function ThrowStatement( node, visitorHelper )
{
    visitorHelper.block.add( node ).as( visitorHelper.BlockManager.THROW );
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
 */
function TryStatement( node, visitorHelper )
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
 */
function WhileStatement( node, visitorHelper )
{
    const { newBlock, block } = visitorHelper;

    let
        body = newBlock(),
        alt  = newBlock().as( visitorHelper.BlockManager.CONVERGE ),
        test = newBlock().as( visitorHelper.BlockManager.TEST ).add( node.test ).whenFalse( alt ).whenTrue( body ).from( block );

    visitorHelper.addLoopTarget( test, alt );
    body = visitorHelper.flatWalk( body, node.body, visitorHelper );
    visitorHelper.popTarget();

    if ( body )
        body.to( test );
    else
        console.log( `wtf? ${node}` );

    return alt;
}

/**
 * @param {ConditionalExpression|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock[]}
 */
function ConditionalExpression( node, visitorHelper )
{
    const { newBlock, block } = visitorHelper;

    let cons = newBlock(),
        alternate,
        test = newBlock()
            .from( block )
            .add( node.test )
            .as( visitorHelper.BlockManager.TEST )
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
 */
function syntax_default( node, visitorHelper )
{
    return visitorHelper.block.add( node );
}
