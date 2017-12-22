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

/**
 * @typedef {object} VisitorHelper
 * @property {BlockManager.} BlockManager
 * @property {BlockManager#} bm
 * @property {AST} ast
 * @property {?CFGBlock} prev
 * @property {?CFGBlock} block
 * @property {function():CFGBlock} newBlock
 * @property {function(CFGBlock,AnnotatedNode,VisitorHelper):CFGBlock} [flatWalk]
 * @property {function(CFGBlock,AnnotatedNode,VisitorHelper):*} [scanWalk]
 * @property {CFGBlock[]} breakTargets
 * @property {CFGBlock[]} loopTargets
 */


/** */
const
    list = require( 'yallist' );

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
    return visitorHelper.flatWalk( visitorHelper.newBlock().from( visitorHelper.block ), node, visitorHelper );
}

/**
 * @param {BreakStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function BreakStatement( node, visitorHelper )
{
    if ( node.label )
    {
        visitorHelper.block.add( node ).as( visitorHelper.BlockManager.BREAK );

        const block = visitorHelper.ast.find_label( node, node.label );

        if ( block )
        {
            block.from( visitorHelper.block );
            return null;
        }

        throw new SyntaxError( `Labeled "break" statement has no label "${node.label} in scope: ${node}` );

    }
    else
    {
        const bt = visitorHelper.breakTargets;

        if ( !bt.length )
            throw new SyntaxError( `Statement 'break' is not inside a loop or switch statement` );

        bt[ bt.length - 1 ].from( visitorHelper.block );

        return null;
    }
}

/**
 * @param {CatchClause|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function CatchClause( node, visitorHelper )
{
    return visitorHelper.flatWalk( visitorHelper.newBlock().from( visitorHelper.block ), node, visitorHelper );
}

/**
 * @param {ContinueStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function ContinueStatement( node, visitorHelper )
{
    if ( node.label )
    {
        visitorHelper.block.add( node ).as( visitorHelper.BlockManager.CONTINUE );

        const block = visitorHelper.ast.find_label( node, node.label );

        if ( block )
        {
            block.from( visitorHelper.block );
            return null;
        }

        throw new SyntaxError( `Labeled "continue" statement has no label "${node.label} in scope: ${node}` );
    }
    else
    {
        let lt = visitorHelper.loopTargets;

        if ( !lt.length )
            throw new SyntaxError( `Statement 'continue' is not inside a loop` );

        lt[ lt.length - 1 ].from( visitorHelper.block );

        return null;
    }
}

/**
 * @param {DoWhileStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function DoWhileStatement( node, visitorHelper )
{
    let
        body = visitorHelper.newBlock().from( visitorHelper.block ),
        cont = visitorHelper.newBlock().as( visitorHelper.BlockManager.LOOP ),
        test = visitorHelper.newBlock().as( visitorHelper.BlockManager.TEST ).whenTrue( body ).whenFalse( cont );

    visitorHelper.breakTargets.push( cont );
    visitorHelper.loopTargets.push( cont );
    body = visitorHelper.flatWalk( body, node, visitorHelper );
    visitorHelper.loopTargets.pop();
    visitorHelper.breakTargets.pop();


    test.from( body );

    visitorHelper.scanWalk( test, node.test, visitorHelper );

    return cont;
}

/**
 *
 * PREV ->
 *                 ┌───────────────┐
 *                 v               │
 *      INIT -> TEST -> BODY -> UPDATE
 *                │
 *                └────> REST OF CODE PAST LOOP
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

    let init   = visitorHelper.newBlock().from( visitorHelper.block ),
        test   = visitorHelper.newBlock().from( init ).as( visitorHelper.BlockManager.TEST ),
        body   = visitorHelper.newBlock(),
        update = visitorHelper.newBlock(),
        cont   = visitorHelper.newBlock().as( visitorHelper.BlockManager.LOOP );

    test.whenTrue( body ).whenFalse( cont );
    update.from( visitorHelper.flatWalk( body, node.body, visitorHelper ) ).to( test );

    visitorHelper.scanWalk( init, node.init, visitorHelper );
    visitorHelper.scanWalk( test, node.test, visitorHelper );
    visitorHelper.scanWalk( update, node.update, visitorHelper );

    return cont;
}

/**
 * @param {ForInStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function ForInStatement( node, visitorHelper )
{
    let update = visitorHelper.newBlock().from( visitorHelper.block ).add( node ),
        body   = visitorHelper.newBlock().from( update ),
        cont   = visitorHelper.newBlock().from( update ).as( visitorHelper.BlockManager.LOOP );

    body = visitorHelper.flatWalk( body, node.body, visitorHelper );
    if ( body ) body.to( update );

    visitorHelper.scanWalk( update, node.left, visitorHelper );
    visitorHelper.scanWalk( update, node.right, visitorHelper );

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
 * @param {IfStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function IfStatement( node, visitorHelper )
{
    let test       = visitorHelper.newBlock().as( visitorHelper.BlockManager.TEST ).from( visitorHelper.block ),
        consequent = visitorHelper.newBlock(),
        alternate  = node.alternate && visitorHelper.newBlock(),
        cont       = visitorHelper.newBlock();

    test.whenTrue( consequent );
    test.whenFalse( alternate || cont );

    consequent = visitorHelper.flatWalk( consequent, node.consequent, visitorHelper );

    if ( consequent ) consequent.to( cont );

    if ( alternate )
    {
        alternate = visitorHelper.flatWalk( alternate, node.alternate, visitorHelper );
        cont.from( alternate );
    }

    return cont;
}

/**
 * @param {LabeledStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function LabeledStatement( node, visitorHelper )
{
    return visitorHelper.flatWalk( visitorHelper.newBlock().from( visitorHelper.block ), node.statement, visitorHelper );
}

/**
 * @param {ReturnStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function ReturnStatement( node, visitorHelper )
{
    visitorHelper.block.add( node );
    if ( node.argument ) visitorHelper.scanWalk( visitorHelper.block, node.argument, visitorHelper );
    visitorHelper.bm.toExitNode( visitorHelper.block );
}

/**
 * @typedef {object} CaseInfo
 * @property {?CFGBlock} [test]
 * @property {?CFGBlock} [body]
 * @property {?AnnotatedNode} switchTest
 * @property {AnnotatedNode} consequent
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
 * @param {SwitchStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 */
function SwitchStatement( node, visitorHelper )
{
    let _switch  = visitorHelper.newBlock().from( visitorHelper.block ).add( node ),
        cont     = visitorHelper.newBlock(),

        /** @type {CaseInfo} */
        _default,

        /** @type {List<CaseInfo>} */
        caseList = list.create( node.cases.map( n => {

            let test     = n.test && visitorHelper.newBlock().as( visitorHelper.BlockManager.TEST ).add( n.test ),
                body     = n.consequent && n.consequent.length && visitorHelper.newBlock(),
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

    _switch.add( node.discriminant );

    visitorHelper.breakTargets.push( cont );

    let prevCi       = _switch,
        needBody     = [],
        lastTest     = null,
        fallsThrough = null;

    caseList.forEach( ci => {
        if ( ci.test )
        {
            lastTest = ci;
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

            ci.test.whenTrue( ci.body );

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

    visitorHelper.breakTargets.pop();

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
 * @param {WhileStatement|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function WhileStatement( node, visitorHelper )
{
    let
        body = visitorHelper.newBlock(),
        alt  = visitorHelper.newBlock().as( visitorHelper.BlockManager.LOOP ),
        test = visitorHelper.newBlock().as( visitorHelper.BlockManager.TEST ).add( node.test ).whenFalse( alt ).whenTrue( body );

    visitorHelper.scanWalk( test, node.test, visitorHelper );

    visitorHelper.breakTargets.push( alt );
    visitorHelper.loopTargets.push( alt );
    body = visitorHelper.flatWalk( body, node.body, visitorHelper );
    visitorHelper.loopTargets.pop();
    visitorHelper.breakTargets.pop();

    body.to( test );
    return alt;
}

/**
 * @param {ConditionalExpression|AnnotatedNode} node
 * @param {VisitorHelper} visitorHelper
 * @return {?CFGBlock}
 */
function ConditionalExpression( node, visitorHelper )
{
    let cons = visitorHelper.newBlock(),
        alt  = visitorHelper.newBlock(),
        test = visitorHelper.newBlock()
            .from( visitorHelper.block )
            .add( node.test )
            .as( visitorHelper.BlockManager.TEST )
            .whenTrue( cons )
            .whenFalse( alt );

    visitorHelper.scanWalk( test, node.test, visitorHelper );
    cons = visitorHelper.flatWalk( cons, node.consequent, visitorHelper );
    alt  = visitorHelper.flatWalk( alt, node.alternate, visitorHelper );

    if ( !cons && !alt ) return null;

    let cont = visitorHelper.newBlock();

    if ( cons ) cont.from( cons );
    if ( alt ) cont.from( alt );

    return cont;
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
