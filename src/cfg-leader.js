/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";

const
    { as_table } = require( './dump' ),
    BlockManager       = require( './cfg-block' ),
    visitors           = require( './visitors' ),
    { assignment }     = require( './ast-helpers' ),
    { Syntax } = require( 'espree' ),
    { isArray: array } = Array;


/**
 * @typedef {object} CFGInfo
 * @property {string} name
 * @property {Array<AnnotatedNode>} params
 * @property {AnnotatedNode|Array<AnnotatedNode>} body
 * @property {Array<Number>} lines
 * @property {BlockManager} [bm]
 * @property {CFGBlock} [trailing]
 * @property {AnnotatedNode|Node|BaseNode} node,
 * @property {AST} ast
 */

/**
 * @param {CFGInfo} CFGInfo
 * @param {AST} ast
 */
function create_new_cfg( cfgInfo, ast )
{

    ast.root = cfgInfo.node;
    cfgInfo.ast = ast;

    /** @type {CFGInfo} */
    let cfg = cfgInfo;

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
            flatWalk:     ( b, n, vh ) => flat_walker( b, n, vh ),
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

    let final = flat_walker( visitorHelper.block, ast.root, visitorHelper );

    visitorHelper.toExit.forEach( xn => cfg.bm.toExitNode( xn ) );

    if ( array( final ) )
        final = final.filter( b => !!b );
    else if ( final )
        final = [ final ];

    if ( final )
        final.forEach( f => cfg.bm.toExitNode( f ) );

    cfg.bm.finish( cfg );
    cfg.toString = () => `${cfg.name}:${cfg.lines[ 0 ]}-${cfg.lines[ 1 ]}\n${cfg.bm}`;
    cfg.toTable = () => as_table( `${cfg.name}:${cfg.lines[ 0 ]}-${cfg.lines[ 1 ]}`, [ "TYPE", "LINES", "LEFT EDGES", "NODE", "RIGHT EDGES", "CREATED BY", "LIVEOUT", "PHI", "AST" ], cfg.bm.toTable() );
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

function flat_walker( block, nodes, visitorHelper )
{
    visitorHelper.block = block;

    if ( !nodes ) return visitorHelper.block = block;

    if ( !array( nodes ) )
    {
        // if ( nodes.type === Syntax.BlockStatement && nodes.body.length === 0 )
        // {
        //     nodes.body.push( {
        //         type: Syntax.EmptyStatement,
        //         loc: nodes.loc,
        //         range: nodes.range,
        //     } );
        // }

        if ( nodes.body && /Function/.test( nodes.type ) )
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

            if ( !outputs )
            {
                visitorHelper.block = null;
                break;
            }
            else if ( !array( outputs ) )
            {
                if ( !outputs.createdBy ) outputs.createdBy = 'CFG: ' + node.type;

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
                    if ( !b.createdBy ) b.createdBy = 'AST: ' + ( b.first() ? b.first().type : 'none' );
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

module.exports = create_new_cfg;
