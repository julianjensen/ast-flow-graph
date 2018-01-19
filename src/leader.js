/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 19-Nov-2017
 *********************************************************************************************************************/

"use strict";

import { str_table }       from './dump';
import { Block, Edge }     from './types';
import BlockManager        from './manager';
import * as visitors       from './visitors';
import { plugin, current } from './utils';

const
    { isArray: array } = Array;

/**
 * @param {CFGInfo} CFGInfo
 * @param {AST} ast
 * @param {CFGOptions} options
 * @private
 */
export default function create_new_cfg( cfgInfo, ast, options ) {

    ast.root         = cfgInfo.node;
    cfgInfo.ast      = ast;
    cfgInfo.topScope = ast.node_to_scope( ast.root );

    /**
     * @type {CFGInfo}
     * @private
     */
    let cfg = cfgInfo;

    cfg.bm = new BlockManager( ast, options );

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
            breakTargets: [],
            addBreakTarget( block )
            {
                this.breakTargets.push( {
                    type:       Edge.BREAK,
                    breakBlock: block
                } );
            },
            addLoopTarget( lblock, bblock )
            {
                cfg.bm.in_loop( lblock.id );
                this.breakTargets.push( {
                    type:       Edge.LOOP,
                    breakBlock: bblock,
                    loopBlock:  lblock
                } );
            },
            popTarget()
            {
                const popped = this.breakTargets.pop();
                if ( popped.type === Edge.LOOP ) cfg.bm.out_loop( popped.loopBlock.id );
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
                    if ( this.breakTargets[ i ].type === Edge.LOOP ) return this.breakTargets[ i ].loopBlock;

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

    cfg.toString = () => `${cfg.name}:${cfg.lines[ 0 ]}-${cfg.lines[ 1 ]}\n${cfg.bm}`;
    cfg.toTable  = () => str_table( `${cfg.name}:${cfg.lines[ 0 ]}-${cfg.lines[ 1 ]}`, [ "TYPE", "LINES", "LEFT EDGES", "NODE", "RIGHT EDGES", "CREATED BY", "AST" ], cfg.bm.toTable() );
    cfg.bm.finish( final );
    return cfg;
}

/**
 * @param {CFGBlock} block
 * @param {AnnotatedNode|Node|BaseNode|BlockStatement|Array<AnnotatedNode|Node|BaseNode|BlockStatement>} nodes
 * @param {VisitorHelper} visitorHelper
 * @return {CFGBlock}
 * @private
 */
function flat_walker( block, nodes, visitorHelper )
{
    visitorHelper.block = block;

    if ( !nodes ) return visitorHelper.block = block;

    /**
     * @param {AnnotatedNode} node
     * @return {boolean}
     * @private
     */
    function add_cfg( node )
    {
        let cbBlock;

        if ( visitors[ node.type ] )
        {
            cbBlock     = visitorHelper.block;
            let outputs = visitors[ node.type ]( node, visitorHelper );

            current.block = cbBlock;
            plugin( 'cfgblock', 'finish', cbBlock );

            if ( !outputs )
            {
                visitorHelper.block = null;
                return false;
            }
            else if ( !array( outputs ) )
            {
                if ( !outputs.createdBy ) outputs.createdBy = 'CFG: ' + node.type;

                if ( outputs.isa( Block.CONVERGE ) )
                    visitorHelper.block = outputs.not( Block.CONVERGE );
                else
                    visitorHelper.block = visitorHelper.newBlock().from( outputs );
            }
            else
            {
                outputs = outputs.filter( b => !!b );
                if ( !outputs.length )
                {
                    visitorHelper.block = null;
                    return false;
                }

                outputs.forEach( b => {
                    if ( !b.createdBy ) b.createdBy = 'AST: ' + ( b.first() ? b.first().type : 'none' );
                    if ( b.isa( Block.CONVERGE ) )
                        visitorHelper.block = b.not( Block.CONVERGE );
                } );
                visitorHelper.block = visitorHelper.newBlock().from( outputs );
            }

            block = visitorHelper.block;
        }
        else if ( visitorHelper.block )
            visitorHelper.block.add( node );

        current.block = cbBlock;
        plugin( 'cfgblock', 'postFinish', cbBlock );
    }

    visitorHelper.ast.flat_walker( nodes, add_cfg );

    return visitorHelper.block;
}
