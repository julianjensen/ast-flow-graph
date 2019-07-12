/** ******************************************************************************************************************
 * @file CFG block definition, equivalent to a basic block in compiler parlance.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Dec-2017
 *********************************************************************************************************************/
"use strict";

import assert                             from 'assert';
import { Block, Edge, enum_to_string }    from './types';
import { display_options, array, plugin, current } from './utils';

const
    {
        SPACE_PER_EDGE,
        MAX_EDGES,
        LEFT_EDGES,
        RIGHT_EDGES,
        TRUE_EDGE,
        FALSE_EDGE,
        START_NODE,
        EXIT_NODE
    }       = display_options( true ),
    padLeft = ( n, target, pre, post ) => [ ' '.repeat( target - `${n}`.length ), pre, `${n}`, post ],
    digits  = ( n, d = 2, pre = '', post = '' ) => padLeft( n, d - 1, pre, post ).join( '' );

/**
 * @param {number} id
 * @param {Edges} edges
 */
export default class CFGBlock
{
    /**
     * @param {number} id
     * @param {Edges} edges
     */
    constructor( id, edges )
    {
        assert( edges );
        // To prevent edges from showing up when doing `console.log` on these blocks
        Object.defineProperty( this, 'edges', { value: edges, enumerable: false } );

        this.id = id;
        /** @type {Array<AnnotatedNode|BaseNode|Node>} */
        this.nodes = [];

        this.lastEdge = null;
        this.types    = Block.NORMAL;

        this.createdBy = '';
        this.scope     = null;

        current.block = this;
        plugin( 'cfgblock', 'init', this );
    }

    /**
     * @return {number[]}
     */
    get succesors_as_indices()
    {
        return this.succs.map( s => s.id );
    }

    /**
     * @return {Array<CFGBlock>}
     */
    get successors()
    {
        return this.succs;
    }

    /**
     * @return {Array<CFGBlock>}
     */
    get succs()
    {
        return this.edges.get_succs( this );
    }

    /**
     * @return {Array<CFGBlock>}
     */
    get preds()
    {
        return this.edges.get_preds( this );
    }

    /**
     * @return {boolean}
     */
    isEmpty()
    {
        return this.nodes.length === 0;
    }

    /**
     * @param {number|CFGBlock} to
     * @param {string} type
     * @return {CFGBlock}
     */
    classify( to, type )
    {
        this.edges.classify( this, to, type );
        return this;
    }

    /**
     * @param {CFGBlock|CFGBlock[]} cb
     * @return {CFGBlock}
     */
    follows( cb )
    {
        if ( !cb ) return this;

        if ( !array( cb ) )
            cb.to( this );
        else
            cb.forEach( block => block.to( this ) );

        return this;
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
    to( cb )
    {
        if ( !cb ) return this;

        if ( array( cb ) && cb.length === 1 ) cb = cb[ 0 ];

        if ( !array( cb ) )
            cb.lastEdge = this.lastEdge = this.edges.add( this, cb ).lastEdge;
        else
            cb.forEach( block => block.lastEdge = this.lastEdge = this.edges.add( this, block ).lastEdge );

        return this;
    }

    /**
     * @return {CFGBlock}
     */
    remove_succs()
    {
        this.edges.get_succs( this ).forEach( s => this.edges.remove_succ( this, s ) );
        return this;
    }

    /**
     * @param {number|CFGBlock} kill
     * @return {CFGBlock}
     */
    remove_succ( kill )
    {
        this.edges.remove_succ( this, kill );
        return this;
    }

    /**
     * @param {number} nodeType
     * @return {CFGBlock}
     */
    as( nodeType )
    {
        if ( nodeType & Block.EXCLUSIVE )
            this.types = ( this.types & ~Block.EXCLUSIVE ) | ( nodeType & Block.EXCLUSIVE );

        this.types |= ( nodeType & ~Block.EXCLUSIVE );

        if ( this.types & ~Block.NORMAL ) this.types &= ~Block.NORMAL;

        return this;
    }

    /**
     * Sets the last edge to type.
     *
     * @param {Edge} edgeType
     * @param {number|CFGBlock} [to]
     * @return {CFGBlock}
     */
    edge_as( edgeType, to )
    {
        to = to || to === 0 ? to : this.lastEdge.to;

        this.edges.classify( this, to || this.lastEdge.to, edgeType );
        return this;
    }

    /**
     * Removes a type from this block.
     *
     * @param {Edge} nodeType
     * @return {CFGBlock}
     */
    not( nodeType )
    {
        this.types &= ~nodeType;
        return this;
    }

    /**
     * For test nodes, this adds the edge taken when the condition is true.
     *
     * @param {CFGBlock} block
     * @return {CFGBlock}
     */
    whenTrue( block )
    {
        if ( !block ) return this;

        this.to( block ).as( Block.TEST );
        this.edge_as( Edge.TRUE, block );
        return this;
    }

    /**
     * For test nodes, this adds the edge taken when the condition is false.
     *
     * @param {CFGBlock} block
     * @return {CFGBlock}
     */
    whenFalse( block )
    {
        if ( !block ) return this;

        this.to( block ).as( Block.TEST );
        this.edge_as( Edge.FALSE, block );
        return this;
    }

    /**
     * Add a current-level AST node to this block.
     *
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
     * Returns the first AST node (if any) of this block.
     *
     * @return {?(AnnotatedNode|BaseNode|Node)}
     */
    first()
    {
        return this.nodes.length ? this.nodes[ 0 ] : null;
    }

    /**
     * Returns the last AST node (if any) of this block.
     *
     * @return {?(AnnotatedNode|BaseNode|Node)}
     */
    last()
    {
        return this.nodes.length ? this.nodes[ this.nodes.length - 1 ] : null;
    }

    /**
     * Free-text field indicating the manner of of creation of this node. For information in graphs and printouts only.
     *
     * @param {string} txt
     * @return {CFGBlock}
     */
    by( txt )
    {
        this.createdBy = typeof txt === 'string' ? txt : 'label';
        return this;
    }

    /**
     * Check if this block has a particular type.
     *
     * @param {number} typeName
     * @returns {boolean}
     */
    isa( typeName )
    {
        return !!( this.types & typeName );
    }

    /**
     * Remove itself if it's an empty node and isn't the start or exit node.
     *
     * @return {boolean}  - true if it was deleted
     */
    eliminate()
    {
        if ( this.nodes.length || this.isa( Block.START ) || this.isa( Block.EXIT ) || this.succs.some( s => s === this ) ) return false;

        this.edges.retarget_multiple( this );

        this.as( Block.DELETED );
        return true;
    }

    /**
     * @param {Edge} type
     */
    defer_edge_type( type )
    {
        this.deferredEdgeType = type;
    }

    /*****************************************************************************************************************
     *
     * PRINT AND OUTPUT HELPERS
     *
     *****************************************************************************************************************/

    /**
     * For the vertices.
     *
     * @return {string}
     */
    graph_label()
    {
        let
            txt = enum_to_string( Block, this.types ).join( '|' ),
            lns = this.nodes.length && this.nodes[ 0 ].loc && this.nodes[ 0 ].loc.start.line,
            lne = this.nodes.length && this.nodes[ this.nodes.length - 1 ].loc && this.nodes[ this.nodes.length - 1 ].loc.end.line,
            ln  = lns === lne ? lns : lns + '-' + lne;

        if ( this.isa( Block.START ) || this.isa( Block.EXIT ) ) txt += ':' + this.id;
        return txt ? `${txt}:${this.id}@${ln}` : `NORMAL:${this.id}@${ln || ''}`;
    }

    /**
     * Stringified line numbers for this block.
     *
     * @return {string}
     */
    lines()
    {
        if ( this.nodes.length === 0 ) return '';

        const
            f = this.first() || {},
            l = this.last() || {},
            {
                start: {
                           line: start = 0
                       }
            } = f.loc,
            {
                end: {
                         line: end = 0
                     }
            } = l.loc;

        return start === end ? `:${start}` : `:${start}-${end}`;
    }

    /**
     * @return {Array<string>}
     */
    pred_edge_types()
    {
        return this.edges.pred_edges( this ).map( e => e.type.isa( Edge.TRUE ) ? TRUE_EDGE : e.type.isa( Edge.FALSE ) ? FALSE_EDGE : e.type.isa( ~Edge.CLEAR ) ? '*' : '' );
    }

    /**
     * @return {Array<string>}
     */
    succ_edge_types()
    {
        return this.edges.edges( this ).map( e => e.type.isa( Edge.TRUE ) ? TRUE_EDGE : e.type.isa( Edge.FALSE ) ? FALSE_EDGE : e.type.isa( ~Edge.CLEAR ) ? '*' : '' );
    }

    /**
     * @param {Array<*>} arr
     * @param {number} chunkSize
     * @return {Array<string>}
     */
    split_by( arr, chunkSize )
    {
        let offset = 0,
            lng    = arr.length,
            out    = [];

        while ( offset < lng )
        {
            out.push( arr.slice( offset, offset + chunkSize ) );
            offset += chunkSize;
        }

        return out;
    }

    /**
     * Headers are
     * TYPE / LINES / LEFT EDGES / NODE / RIGHT EDGES / CREATED BY / AST
     * @return {Array<string>}
     */
    toRow()
    {
        let preds      = this.preds,
            succs      = this.succs,
            leftEdges  = this.pred_edge_types().map( ( c, i ) => digits( preds[ i ].id, SPACE_PER_EDGE, c, '' ) ).join( '' ),
            rightEdges = this.succ_edge_types().map( ( c, i ) => digits( succs[ i ].id, SPACE_PER_EDGE, '', c ) ).join( '' );

        return [
            enum_to_string( Block, this.types ).join( '\n' ),
            this.lines().substr( 1 ),
            leftEdges,
            digits( this.id, SPACE_PER_EDGE, this.isa( Block.START ) ? START_NODE : '', this.isa( Block.EXIT ) ? EXIT_NODE : '' ),
            rightEdges,
            this.createdBy || '',
            this.nodes.length ? this.split_by( this.nodes.map( n => n.type + '(' + n.index + ')' ), 1 ).map( sect => sect.join( ' ' ) ).join( '\n' ) : ''
        ];
    }

    /**
     * @return {Array<string>}
     */
    toString()
    {
        let preds      = this.preds,
            succs      = this.succs,
            leftEdges  = this.pred_edge_types().map( ( c, i ) => digits( preds[ i ].id, SPACE_PER_EDGE, c, '' ) ).join( '' ),
            rightEdges = this.succ_edge_types().map( ( c, i ) => digits( succs[ i ].id, SPACE_PER_EDGE, '', c ) ).join( '' );

        if ( !/^\s*$/.test( leftEdges ) ) leftEdges = leftEdges + ' ' + LEFT_EDGES;
        if ( !/^\s*$/.test( rightEdges ) ) rightEdges = RIGHT_EDGES + ' ' + rightEdges;

        leftEdges  = leftEdges.padStart( MAX_EDGES * SPACE_PER_EDGE + 8 );
        rightEdges = rightEdges.padEnd( MAX_EDGES * SPACE_PER_EDGE + 8 );

        return [
            enum_to_string( Block, this.types ).join( '|' ).padStart( 10 ),
            this.lines().substr( 1 ).padStart( 9 ),
            leftEdges,
            digits( this.id, SPACE_PER_EDGE, this.isa( Block.START ) ? START_NODE : '', this.isa( Block.EXIT ) ? EXIT_NODE : '' ),
            rightEdges,
            ( this.createdBy || '' ).padStart( 26 ),
            this.nodes.length ? this.split_by( this.nodes.map( n => n.type + '(' + n.index + ')' ), 1 ).map( sect => sect.join( ' ' ) ).join( ', ' ) : ''
        ].join( ' ' );
    }

}
