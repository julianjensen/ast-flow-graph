/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";

const
    BlockManager          = require( './cfg/cfg-block' ),
    visitors = require( './cfg/visitors' ),
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
            bm: cfg.bm,
            ast,
            prev: null,
            block: cfg.bm.startNode,
            newBlock: () => cfg.bm.block(),
            flatWalk: ( b, n, vh ) => walk_block( b, n, vh ),
            scanWalk: ( b, n, vh ) => scan_for_assignments( b, n, vh ),
            breakTargets: [],
            loopTargets: []

        };

    // cfg.trailing = cfg_leaders( ast, cfg.body, cfg.bm.startNode, cfg.bm );
    cfg.trailing = walk_block( visitorHelper.block, ast.root, visitorHelper );
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

    if ( !nodes ) return block;

    if ( !array( nodes ) )
    {
        if ( nodes.body )
            nodes = nodes.body;

        if ( !array( nodes ) ) nodes = [ nodes ];
    }

    const nodeList = nodes; // ast.nodelist( nodes );

    while ( i < nodeList.length )
    {
        const n = nodeList[ i ];

        if ( !cfgBlocks.has( n.type ) )
        {
            scan_for_assignments( block, n, visitorHelper );
            block.add( n );
        }
        else if ( visitors[ n.type ] )
            block = visitors[ n.type ]( n, visitorHelper );
        else
            return null;

        if ( !block ) return null;

        ++i;
    }

    return block;
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
