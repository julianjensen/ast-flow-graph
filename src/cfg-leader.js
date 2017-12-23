/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";

const
    BlockManager          = require( './cfg/cfg-block' ),
    visitors              = require( './cfg/visitors' ),
    { get_from_function } = require( './utils/ast-helpers' ),
    {
        cfgBlocks,
        causesUnreachable
    }                     = require( './defines' ),
    {
        assignment
    }                     = require( './utils/ast-helpers' ),
    { isArray: array }    = Array;

/**
 * If an AST node doesn't output an edge then it can be assumed that it has a single edge to the next ASTNode, if any,
 * and can be merged into the current block. Multiple edges requires additional blocks.
 *
 * @param {AST} ast
 * @param {AnnotatedNode|Array<AnnotatedNode>} nodes
 * @param {CFGBlock} prev
 * @param {BlockManager} bm
 */
function cfg_leaders( ast, nodes, prev, bm )
{
    walk_block( prev, nodes );
    // if ( array( n ) )
    //     return walk_block( prev, n );
    // else if ( n.body )
    //     return walk_block( prev, n.body );
    // else
    //     return call_node_type( n );
    // // {
    // //     if ( entries[ n.type ] )
    // //         return entries[ n.type ]( n, p, prevNode, nextNode );
    // //     else
    // //         return entries.default( n );
    // // }

    /**
     * @param n
     * @returns {*}
     */
    function call_node_type( n )
    {
        if ( entries[ n.type ] )
            return entries[ n.type ]( n );
        else
            return entries.default( n );
    }

    // }

    // leader( ast.root, ast.root.parent, bm.block().from( bm.startNode ), null, null );
    // bm.finish();


    return walk_block( prev, nodes );
}

/**
 * @typedef {object} CFGInfo
 * @property {string} name
 * @property {Array<AnnotatedNode>} params
 * @property {AnnotatedNode|Array<AnnotatedNode>} body
 * @property {Array<Number>} lines
 * @property {BlockManager} [bm]
 * @property {CFGBlock} [trailing]
 */

/**
 * @param {AST} ast
 */
function start_new_cfg( ast )
{

    /** @type {CFGInfo} */
    let cfg = get_from_function( ast.root );

    cfg.bm = new BlockManager();

    const
        visitorHelper = {
            BlockManager,
            bm:           cfg.bm,
            ast,
            prev:         null,
            block:        cfg.bm.startNode,
            toExit:       [],
            newBlock:     () => cfg.bm.block(),
            flatWalk:     ( b, n, vh ) => new_walker( b, n, vh ),
            scanWalk:     ( b, n, vh ) => scan_for_assignments( b, n, vh ),
            breakTargets: [],
            addBreakTarget( block )
            {
                this.breakTargets.push( {
                    type:       BlockManager.BREAK,
                    breakBlock: block
                } );
            },
            addLoopTarget( lblock, bblock )
            {
                this.breakTargets.push( {
                    type:       BlockManager.LOOP,
                    breakBlock: bblock,
                    loopBlock:  lblock
                } );
            },
            popTarget()
            {
                this.breakTargets.pop();
            },
            getBreakTarget()
            {
                return this.breakTargets.length ? this.breakTargets[ this.breakTargets.length - 1 ].breakBlock : null;
            },
            getLoopTarget()
            {
                let i = this.breakTargets.length;

                if ( i === 0 ) return null;

                while ( i-- )
                    if ( this.breakTargets[ i ].type === BlockManager.LOOP ) return this.breakTargets[ i ].loopBlock;

                return null;
            }
        };

    Object.entries( visitorHelper ).forEach( ( [ name, fn ] ) => {
        if ( typeof fn !== 'function' ) return;
        if ( !name.includes( 'Target' ) ) return;
        visitorHelper[ name ] = fn.bind( visitorHelper );
    } );

    // cfg.trailing = cfg_leaders( ast, cfg.body, cfg.bm.startNode, cfg.bm );
    let final = new_walker( visitorHelper.block, ast.root, visitorHelper );

    visitorHelper.toExit.forEach( xn => cfg.bm.toExitNode( xn ) );

    if ( array( final ) )
        final = final.filter( b => !!b );
    else if ( final )
        final = [ final ];

    if ( final )
        final.forEach( f => cfg.bm.toExitNode( f ) );

    cfg.bm.finish();
    return cfg;
}

/**
 * @param {CFGBlock} block
 * @param {?(AnnotatedNode|Array<AnnotatedNode>)} nodes
 * @param {VisitorHelper} visitorHelper
 */
function scan_for_assignments( block, nodes, visitorHelper )
{
    if ( !nodes ) return;

    if ( array( nodes ) )
        nodes.forEach( n => visitorHelper.ast.walker( n, assignment ) );
    else
        visitorHelper.ast.walker( nodes, assignment );
}

/**
 * @param {CFGBlock} block
 * @param {?(AnnotatedNode|BlockStatement|Array<AnnotatedNode>)} nodes
 * @param {VisitorHelper} visitorHelper
 * @returns {?CFGBlock}
 */
function walk_block( block, nodes, visitorHelper )
{
    let i = 0;

    visitorHelper.block = block;

    if ( !nodes ) return visitorHelper.block = block;

    if ( !array( nodes ) )
    {
        if ( nodes.body )
            nodes = nodes.body;

        if ( !array( nodes ) ) nodes = [ nodes ];
    }

    const nodeList = nodes; // ast.nodelist( nodes );

    if ( ( block = visitorHelper.block ) )
    {
        while ( i < nodeList.length )
        {
            const n = nodeList[ i ];

            // if ( !visitors[ n.type ] )
            // {
            //     scan_for_assignments( block, n, visitorHelper );
            //     block.add( n );
            // }
            if ( visitors[ n.type ] )
                block = visitors[ n.type ]( n, visitorHelper );
            else
            {
                block = null;
                break;
            }

            if ( !block )
            {
                block = null;
                break;
            }

            ++i;
        }
    }

    return visitorHelper.block = block;
}

function new_walker( block, nodes, visitorHelper )
{
    visitorHelper.block = block;

    if ( !nodes ) return visitorHelper.block = block;

    if ( !array( nodes ) )
    {
        if ( nodes.body )
            nodes = nodes.body;

        if ( !array( nodes ) ) nodes = [ nodes ];
    }

    let i = 0;

    while ( i < nodes.length && block )
    {
        const node = nodes[ i ];

        if ( visitors[ node.type ] )
        {
            let outputs = visitors[ node.type ]( node, visitorHelper );
            // console.log( node.type + " outputs ", outputs );

            if ( outputs === null )
            {
                visitorHelper.block = null;
                break;
            }
            else if ( !array( outputs ) )
            {
                outputs.createdBy = node.type;

                if ( outputs.isa( BlockManager.CONVERGE ) )
                    visitorHelper.block = outputs.isNotA( BlockManager.CONVERGE );
                else
                    visitorHelper.block = visitorHelper.newBlock().from( outputs );
            }
            else
            {
                outputs = outputs.filter( b => !!b );
                if ( !outputs.length )
                {
                    visitorHelper.block = null;
                    break;
                }

                outputs.forEach( b => {
                    b.createdBy = node.type;
                    if ( b.isa( BlockManager.CONVERGE ) )
                        visitorHelper.block = b.isNotA( BlockManager.CONVERGE );
                } );
                visitorHelper.block = visitorHelper.newBlock().from( outputs );
            }

            block = visitorHelper.block;
        }
        else if ( visitorHelper.block )
            visitorHelper.block.add( node );

        ++i;
    }

    return visitorHelper.block;
}


// function create_new_cfg( ast )
// {
//     if ( astSeen.includes( ast.root.index ) )
//     {
//         console.log( 'duplicate ast:', ast.root );
//         console.trace();
//         return null;
//     }
//
//     const
//         name = get_from_function( ast.root, 'name' ),
//         line = ast.root.loc.start.line;
//
//     if ( name === 'neat' )
//         debugger;
//     else if ( line === -1 )
//         debugger;
//
//     astSeen.push( ast.root.index );
//     const bm = new BlockManager();
//     cfg_leaders( ast, bm );
//     bm.finish();
//     return bm;
// }

// module.exports = create_new_cfg;
module.exports = start_new_cfg;
