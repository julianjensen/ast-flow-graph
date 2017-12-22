/** ******************************************************************************************************************
 * @file CFG block helper functions
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    digits = ( n, d = 2, pre = '', post = '' ) => `${pre}${n}`.padStart( d ) + post,
    _add   = ( arr, n ) => {
        if ( !arr.includes( n ) ) arr.push( n );
        return n;
    },
    edges  = {
        edges: Object.create( null ),
        add( from, to, type )
        {
            let eto = this.edges[ from ];

            if ( !eto ) eto = this.edges[ from ] = {};

            eto[ to ] = type;
        },
        type( from, to, type )
        {
            this.edges[ from ][ to ] = type;
        }

    };

class BlockManager
{
    constructor()
    {
        BlockManager.blockId = 0;
        this.blocks          = [];
        this.startNode       = this.block().as( BlockManager.START );
        this.toExit          = [];
        this.deferredLinks   = [];
    }

    /**
     * @param {CFGBlock} block
     */
    toExitNode( block )
    {
        this.toExit.push( block );
    }

    /** */
    finish()
    {
        this.exitNode = this.block().as( BlockManager.EXIT );
        this.toExit.forEach( b => b.to( this.exitNode ) );
        this.size = BlockManager.blockId;
    }

    /**
     * @returns {CFGBlock}
     */
    block()
    {
        const block = new CFGBlock();

        this.blocks[ block.id ] = block;

        return block;
    }

    toString()
    {
        return this.blocks.map( b => `${b}` ).join( '\n' );
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
BlockManager.EXIT      = 'start';

/** */
class CFGBlock
{
    constructor()
    {
        this.id = BlockManager.blockId++;
        /** @type {Array<Node>} */
        this.nodes = [];
        /** @type {Array<CFGBlock>} */
        this.preds = [];
        /** @type {Array<CFGBlock>} */
        this.succs = [];

        this.type = BlockManager.NORMAL;

        /** @type {CFGBlock} */
        this.jumpTrue = null;
        /** @type {CFGBlock} */
        this.jumpFalse = null;
    }

    /**
     * @param {CFGBlock} cb
     * @param {string} type
     * @return {CFGBlock}
     */
    follows( cb, type = BlockManager.NORMAL )
    {
        if ( !cb ) return this;

        edges.add( _add( this.preds, cb ), _add( cb.succs, this ), type );

        return this;
    }

    /**
     * @param {CFGBlock} cb
     * @param {string} type
     * @return {CFGBlock}
     */
    input( cb, type = BlockManager.NORMAL )
    {
        return this.follows( cb, type );
    }

    /**
     * @param {CFGBlock} cb
     * @param {string} type
     * @return {CFGBlock}
     */
    from( cb, type = BlockManager.NORMAL )
    {
        return this.follows( cb, type );
    }

    /**
     * @param {CFGBlock} cb
     * @param {string} type
     * @return {CFGBlock}
     */
    child( cb, type = BlockManager.NORMAL )
    {
        if ( !cb ) return this;

        edges.add( _add( cb.preds, this ), _add( this.succs, cb ), type );

        return this;
    }

    /**
     * @param {CFGBlock} cb
     * @param {string} type
     * @return {CFGBlock}
     */
    output( cb, type = BlockManager.NORMAL )
    {
        return this.child( cb, type );
    }

    /**
     * @param {CFGBlock} cb
     * @param {string} type
     * @return {CFGBlock}
     */
    to( cb, type = BlockManager.NORMAL )
    {
        return this.child( cb, type );
    }

    /**
     * @param {string} nodeType
     * @return {CFGBlock}
     */
    as( nodeType )
    {
        this.type = nodeType;

        return this;
    }

    /**
     * @param {CFGBlock} block
     * @return {CFGBlock}
     */
    whenTrue( block )
    {
        if ( !block ) return this;

        this.to( block, BlockManager.TRUE );
        this.jumpTrue = block;
        this.type     = BlockManager.TEST;
        return this;
    }

    /**
     * @param {CFGBlock} block
     * @return {CFGBlock}
     */
    whenFalse( block )
    {
        if ( !block ) return this;

        this.to( block, BlockManager.FALSE );
        this.jumpFalse = block;
        this.type      = BlockManager.TEST;
        return this;
    }

    /**
     * @param {string} asWhat
     * @return {?CFGBlock}
     */
    get( asWhat )
    {
        switch ( asWhat )
        {
            case BlockManager.TRUE:
                return this.jumpTrue;
            case BlockManager.FALSE:
                return this.jumpFalse;
            default:
                return null;
        }
    }

    /**
     * @param {AnnotatedNode} node
     * @return {CFGBlock}
     */
    add( node )
    {
        node.cfg = this;
        this.nodes.push( node );

        return this;
    }

    /**
     * @param {string} typeName
     * @returns {boolean}
     */
    isa( typeName )
    {
        return this.type === typeName;
    }

    /**
     *
     */
    renumber()
    {

    }

    /**
     * @param {boolean} usePreds
     * @param {CFGBlock} prevCb
     * @param {Array<CFGBlock>} newCbs
     */
    replace_edge_target( usePreds, prevCb, newCbs )
    {
        const
            /** @type {Array<CFGBlock>} */
            nodes     = usePreds ? this.preds : this.succs,
            /** @type {number} */
            replIndex = nodes.findIndex( cb => cb === prevCb );

        if ( replIndex === -1 )
            console.warn( `Re-pointing edge target ${prevCb.id} in ${usePreds ? 'preds' : 'succs'} of ${this.id} but node wasn't found in list. (replacement: ${newCb.id}` );

        nodes.splice( replIndex, 1, ...newCbs );
    }

    /**
     * Remove itself if it's an empty node
     */
    eliminate()
    {
        if ( this.nodes.length ) return;

        this.preds.forEach( pcb => pcb.replace_edge_target( false, this, this.succs ) );
        this.succs.forEach( scb => scb.replace_edge_target( true, this, this.preds ) );
    }

    /*****************************************************************************************************************
     *
     * PRINT
     *
     *****************************************************************************************************************/

    str_edges( e, f, x )
    {
        let out = e.map( c => digits( c.id, 3 ) ).join( '' );

        return ( out && f ? f : '    ' ) + out.padStart( 15 ) + ( out && x ? x : '    ' );
    }

    toString()
    {
        const
            st = this.type === BlockManager.START ? '>' : '',
            ex = this.type === BlockManager.EXIT ? '>' : ' ',
            nodes = this.nodes.map( n => n.type ).join( ', ' );

        return this.str_edges( this.preds, '', ' <- ' ) + digits( this.id, 3, st, ex ) + this.str_edges( this.succs, ' -> ', '' ) + ' [' + this.type + '] => ' + nodes;
    }
}

module.exports = BlockManager;
