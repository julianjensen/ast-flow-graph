/** ******************************************************************************************************************
 * @file CFG block helper functions
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    digits             = ( n, d = 2, pre = '', post = '' ) => `${pre}${n}`.padStart( d ) + post,
    { isArray: array } = Array,
    _add               = ( arr, n ) => {
        if ( !arr.includes( n ) ) arr.push( n );
        return n;
    },
    edges              = {
        edges: Object.create( null ),
        add( from, to, type = BlockManager.NORMAL )
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
        /** @type {CFGBlock[]} */
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

        let elim = 0;
        this.beforeCount = this.blocks.length;
        this.blocks.forEach( ( b, i ) => {
            if ( b.eliminate() )
            {
                elim++;
                this.blocks[ i ] = null;
            }
        } );

        console.log( `eliminated: ${elim}` );
        if ( elim )
        {
            let lastId = 0;
            // This is a `for` loop because the built-ins skip holes in sparse arrays
            for ( let offset = 0, n = 0; n < this.blocks.length; n++ )
            {
                if ( !this.blocks[ n ] )
                    offset--;
                else if ( offset )
                    this.blocks[ n ].id += offset;

                lastId = this.blocks[ n ].id;
            }

            for ( let n = 0; n < lastId; n++ )
                this.blocks[ n ] = this.blocks.find( b => b.id === n );

            // let offset = 0;
            // for ( let i = 0; i < this.blocks.length; i++ )
            // {
            //     if ( !this.blocks[ i ] ) --offset;
            //
            //     this.blocks[ i ].id += offset;
            //
            //     if ( offset !== 0 )
            //         this.blocks[ i + offset ] = this.blocks[ i ];
            // }

            this.blocks.length = lastId;
            this.afterCount = lastId;
        }
        this.size = this.blocks.length;
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
        return `Reduction from ${this.beforeCount} to ${this.afterCount}\n` + this.blocks.map( b => `${b}` ).join( '\n' );
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

/** */
class CFGBlock
{
    constructor()
    {
        this.id = BlockManager.blockId++;
        /** @type {Array<AnnotatedNode|BaseNode|Node>} */
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

        this.createBy = 'none';
    }

    /**
     * @param {CFGBlock|CFGBlock[]} cb
     * @return {CFGBlock}
     */
    follows( cb )
    {
        if ( !cb ) return this;

        if ( !array( cb ) )
            cb = [ cb ];

        cb.forEach( block => edges.add( _add( this.preds, block ), _add( block.succs, this ), BlockManager.NORMAL ) );

        return this;
    }

    /**
     * @param {CFGBlock|CFGBlock[]} cb
     * @return {CFGBlock}
     */
    input( cb )
    {
        return this.follows( cb );
    }

    /**
     * @param {CFGBlock|CFGBlock[]} cb
     * @return {CFGBlock}
     */
    from( cb )
    {
        return this.follows( cb );
    }

    /**
     * @param {CFGBlock|CFGBlock[]} cb
     * @return {CFGBlock}
     */
    child( cb )
    {
        if ( !cb ) return this;

        if ( !array( cb ) )
            cb = [ cb ];

        cb.forEach( block => edges.add( _add( block.preds, this ), _add( this.succs, block ), BlockManager.NORMAL ) );

        return this;
    }

    /**
     * @param {CFGBlock|CFGBlock[]} cb
     * @return {CFGBlock}
     */
    output( cb )
    {
        return this.child( cb );
    }

    /**
     * @param {CFGBlock|CFGBlock[]} cb
     * @return {CFGBlock}
     */
    to( cb )
    {
        return this.child( cb );
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

        this.to( block );
        edges.type( this, block, BlockManager.TRUE );
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

        this.to( block );
        edges.type( this, block, BlockManager.FALSE );
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
     * @param {AnnotatedNode|BaseNode|Node} node
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

    isNotA( typeName )
    {
        if ( this.type === typeName )
            this.type = BlockManager.NORMAL;

        return this;
    }

    /**
     * @param {number} offset
     */
    renumber( offset )
    {
        if ( offset >= 0 ) return this.id;

        this.id += offset;

        return this.id;
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
            console.warn( `Re-pointing edge target ${prevCb.id} in ${usePreds ? 'preds' : 'succs'} of ${this.id} but node wasn't found in list.` );

        nodes.splice( replIndex, 1, ...newCbs );
    }

    /**
     * Remove itself if it's an empty node
     *
     * 1. Remove this node from the successor list of each predecessor
     * 2. In that same spot, insert the successors of this node
     * 3. Remove this node from the predecessors of each successor
     * 4. In that same spot, insert the predecessors of this node
     *
     * @param {boolean} [force=false]
     * @return {boolean}  - true if deleted
     */
    eliminate( force = false )
    {
        if ( !force && ( this.nodes.length || this.isa( BlockManager.START ) || this.isa( BlockManager.EXIT ) ) ) return false;

        this.preds.forEach( pcb => pcb.replace_edge_target( false, this, this.succs ) );
        this.succs.forEach( scb => scb.replace_edge_target( true, this, this.preds ) );

        return true;
    }

    /**
     *
     * 1. Add our successors to the successors or the new node
     * 2. For each of those successors, replace our august self in their predecessors with the upstart
     * 3. Add our noble predeccesors to those of the pretender
     * 4. For each of those exalted ancestors, replace our manifest heritage with that of the usurper
     * 5. Finally, hand over our sacred `id` and depart this world in peace to be collected with the rest of the garbage.
     *
     * @param {CFGBlock} block
     */
    replace( block )
    {
    }

    /*****************************************************************************************************************
     *
     * PRINT
     *
     *****************************************************************************************************************/

    isBool()
    {
        let isTrue = false, isFalse = false;

        this.preds.some( p => p.isa( BlockManager.TEST ) && ( ( isTrue = p.jumpTrue === this ) || ( isFalse = p.jumpFalse === this ) ) );

        return isTrue ? '^' : isFalse ? 'v' : '';
    }

    lines()
    {
        if ( this.nodes.length === 0 ) return '';

        return `:${this.nodes[ 0 ].loc.start.line}-${this.nodes[ this.nodes.length - 1 ].loc.end.line}`;
    }

    str_edges( e, f, x )
    {
        let tf = e.map( c => ( !f ? this.isBool() : '' ) + c.id ),
            out = e.map( ( c, i ) => digits( tf[ i ], 3 ) ).join( '' );

        return ( out && f ? f : '    ' ) + out.padStart( 15 ) + ( out && x ? x : '    ' );
    }

    toString()
    {
        const
            st    = this.type === BlockManager.START ? '>' : '',
            ex    = this.type === BlockManager.EXIT ? '>' : ' ',
            nodes = this.nodes.length ? ' => ' + this.nodes.map( n => n.type ).join( ', ' ) : '',
            lines = this.lines();

        return this.str_edges( this.preds, '', ' <- ' ) + digits( this.id, 3, st, ex ) + this.str_edges( this.succs, ' -> ', '' ) + ' [' + this.type + lines + ']' + nodes;
    }
}

module.exports = BlockManager;
