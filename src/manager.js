/** ******************************************************************************************************************
 * @file Describe what manager does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 02-Jan-2018
 *********************************************************************************************************************/
"use strict";

const
    { DFS }        = require( 'traversals' ),
    dot            = require( './dot' ),
    vars           = require( './variables' ),
    { assignment } = require( './ast-vars' ),
    CFGBlock       = require( './block' ),
    EdgeList       = require( './edge-list' );

/**
 * @type {Iterable<CFGBlock>}
 */
class BlockManager
{
    /**
     * @param {AST} ast
     */
    constructor( ast )
    {
        this.edges = new EdgeList();

        BlockManager.blockId = 0;
        /** @type {CFGBlock[]} */
        this.blocks = [];
        this.startNode = this.block().as( BlockManager.START );
        this.toExit    = [];
        this.ast       = ast;
    }

    /**
     * @param {CFGBlock} block
     */
    toExitNode( block )
    {
        this.toExit.push( block );
    }

    /**
     *
     * @param {Array<CFGBlock>} final
     * @param {CFGInfo} cfg
     */
    finish( final, cfg )
    {
        const ast = this.ast;

        if ( final )
            final.forEach( f => this.toExitNode( f ) );

        this.exitNode = this.block().as( BlockManager.EXIT );
        this.toExit.forEach( b => b.to( this.exitNode ) );

        this.clean();

        BlockManager.blockId = this.size = this.blocks.length;

        this.vars = vars( this, ast, cfg.topScope );

        this.forEach( b => {
            const node = b.first();
            if ( node ) b.scope = ast.node_to_scope( node );
            b.prepare( this.vars );
        } );

        if ( /Function/.test( ast.root.type ) && ast.root.params && ast.root.params )
        {
            let fb = ast.root.cfg || this.blocks[ 0 ];
            ast.root.params.forEach( pnode => assignment( ast, fb, pnode, () => {} ) );
        }

        this.forEach( block => ast.flat_walker( block.nodes, ( n, rec ) => assignment( ast, block, n, rec ) ) );

        this.vars.finish();
        this.vars.live_out();
    }

    pack()
    {
        const packed = [];

        for ( let i = 0; i < BlockManager.blockId; i++ )
        {
            if ( this.blocks[ i ] && !this.blocks[ i ].isa( BlockManager.DELETED ) )
            {
                this.blocks[ i ].renumber( i, packed.length );
                this.blocks[ i ].id = packed.length;
                packed.push( this.blocks[ i ] );
            }
        }

        this.blocks = packed;
    }

    /**
     * @param {function(CFGBlock,number,Array<CFGBlock>):*} fn
     */
    forEach( fn )
    {
        this.blocks.forEach( ( b, i, bl ) => b && fn( b, i, bl ) );
    }

    map( fn )
    {
        return this.blocks.map( fn );
    }

    /**
     * @param {number}  index
     * @return {CFGBlock}
     */
    get( index )
    {
        return this.blocks[ index ];
    }

    /**
     * @returns {CFGBlock}
     */
    block()
    {
        const block = new CFGBlock( this.edges );

        this.blocks[ block.id ] = block;

        return block;
    }

    toString()
    {
        return this.blocks.map( b => `${b}` ).join( '\n' );
    }

    toTable()
    {
        return this.blocks.map( b => b.toRow() );
    }

    /**
     * @type {Iterable<CFGBlock>}
     */
    *[ Symbol.iterator ]()
    {
        for ( const block of this.blocks )
        {
            if ( !block ) continue;
            yield block;
        }
    }

    /**
     * @param {string} title
     */
    create_dot( title )
    {
        return dot( {
            title,
            nodeLabels:    [ ...this ].map( b => b.graph_label() ),
            edgeLabels:    [ ...this ].map( b => b.node_label() ),
            start:         this.startNode.id,
            end:           this.exitNode.id,
            conditional:   this.edges.conditional(),
            unconditional: this.edges.unconditional(),
            blocks:        this.blocks
        } );
    }

    clean()
    {
        let changed = true,
            blocks;

        /**
         * @param {number} blockIndex
         */
        function pass( blockIndex )
        {
            const block = blocks[ blockIndex ];

            if ( !block || block.isa( BlockManager.START ) || block.isa( BlockManager.EXIT ) ) return;

            if ( block.isa( BlockManager.TEST ) )
            {
                if ( block.succs.length === 2 && block.succs[ 0 ] === block.succs[ 1 ] )
                {
                    const succ = block.succs[ 0 ];
                    block.remove_succ( succ ).remove_succ( succ );
                    block.as( BlockManager.NORMAL ).to( succ );
                    changed = true;
                }
            }

            if ( block.succs.length === 1 )
            {
                const succ = block.succs[ 0 ];

                if ( block.isEmpty() )
                {
                    if ( ( changed = block.eliminate() ) ) blocks[ block.id ] = null;
                }

                if ( !block.isa( BlockManager.DELETED ) && succ.preds.length === 1 )
                {
                    if ( !succ.isEmpty() && succ.scope === block.scope )
                    {
                        block.nodes       = block.nodes.concat( succ.nodes );
                        succ.nodes.length = 0;
                        if ( ( changed = succ.eliminate() ) ) blocks[ succ.id ] = null;
                    }

                    if ( succ.isEmpty() && succ.isa( BlockManager.TEST ) )
                    {
                        block.as( BlockManager.TEST );
                        block.remove_succ( succ );
                        if ( succ.jumpFalse )
                        {
                            const f = succ.jumpFalse;
                            succ.remove_succ( f );
                            block.whenFalse( f );
                        }
                        if ( succ.jumpTrue )
                        {
                            const t = succ.jumpTrue;
                            succ.remove_succ( t );
                            block.whenTrue( t );
                        }
                        block.to( succ.succs );
                        blocks[ succ.id ] = null;
                        succ.eliminate( true );
                        changed = true;
                    }
                }
            }
        }

        while ( changed )
        {
            blocks = this.blocks;
            changed = false;

            DFS( this.map( b => b.succs.map( s => s.id ) ), {
                post: pass
            } );

            if ( changed ) this.pack();
        }
    }
}

BlockManager.blockId = 0;

BlockManager.TEST      = 'test';
BlockManager.TRUE      = 'true';
BlockManager.FALSE     = 'false';
BlockManager.NORMAL    = 'normal';
BlockManager.EXCEPTION = 'exception';
BlockManager.CATCH     = 'catch';
BlockManager.BREAK     = 'break';
BlockManager.CONTINUE  = 'continue';
BlockManager.LOOP      = 'loop';
BlockManager.THROW     = 'throw';
BlockManager.START     = 'start';
BlockManager.EXIT      = 'exit';
BlockManager.CONVERGE  = 'converge';
BlockManager.TEMPORARY = 'temporary';
BlockManager.DELETED   = 'deleted';

CFGBlock.referenceBlockManager( BlockManager );

module.exports = BlockManager;
