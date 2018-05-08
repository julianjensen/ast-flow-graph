/** ******************************************************************************************************************
 * @file Handles all edges.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 10-Jan-2018
 *********************************************************************************************************************/
"use strict";

import { Edge, enum_to_string } from './types';
import { reverse_graph } from 'dominators';

const
    code                     = ( from, to ) => `${from}->${to}`,
    index                    = block => typeof block === 'object' && !Array.isArray( block ) && block !== null ? block.id : block;


/**
 * @param {number} index
 * @param {number} _type
 * @return {EdgeInfo}
 * @private
 */
function blockEdge( index, _type = Edge.NONE )
{
    let type = _type,
        self = {
            as:   t => type |= t,
            not:  t => type &= ~t,
            isa:  t => type & t,
            type: () => type,
            get index() { return index; },
            set index( i ) {
                index = i;
                return self;
            },
            toString()
            {
                return enum_to_string( Edge, type ).join( '|' );
            }
        };

    return self;
}

/**
 * Keeps track of edges apart from the successors listed in the {@link CFGBlock} so we can
 * attach types and classifications on edges separate from their blocks.
 *
 * @param {BlockManager} bm
 */
export default class Edges
{
    /**
     * @param {BlockManager} bm
     */
    constructor( bm )
    {
        this.blockManager = bm;
        this.succs        = [];
        this.edgeInfo     = new Map();
        this.lastEdge     = null;
        this._preds       = null;
    }

    /**
     * @param {number} from
     * @param {number} to
     * @param {number} i
     * @private
     */
    _reindex_one( from, to, i )
    {
        const be = this.edgeInfo.get( code( from, to ) );

        if ( be ) be.index = i;
    }

    /**
     * @param {CFGBlock|number} from
     * @return {Edges}
     */
    reindex( from )
    {
        if ( from !== void 0 )
        {
            from        = index( from );
            const succs = this.succs[ from ] || [];

            succs.forEach( ( id, i ) => this._reindex_one( from, id, i ) );

            return this;
        }

        this.succs.forEach( ( ss, from ) => ss.forEach( ( id, i ) => this._reindex_one( from, id, i ) ) );
        return this;
    }

    /**
     * Add an edge between to CFGBlocks.
     *
     * @param {CFGBlock|number} from
     * @param {CFGBlock|number} to
     * @param {Edge} type
     * @return {Edges}
     */
    add( from, to, type = Edge.NONE )
    {
        from = index( from );
        to   = index( to );

        this.__add( from, to );

        const
            succs = this.succs[ from ],
            be    = blockEdge( succs.length - 1, type );

        this.edgeInfo.set( code( from, to ), be );
        this.lastEdge = { from, to, edgeInfo: be };

        return this;
    }

    /**
     * Set a type on an arbitrary edge.
     *
     * @param {CFGBlock|number} from
     * @param {CFGBlock|number} to
     * @param {Edge} ctype
     * @return {Edges}
     */
    classify( from, to, ctype )
    {
        from = index( from );
        to   = index( to );

        const be = this.edgeInfo.get( code( from, to ) );
        if ( be ) be.as( ctype );

        return this;
    }

    /**
     * Remove a type from an arbitrary edge.
     *
     * @param {CFGBlock|number} from
     * @param {CFGBlock|number} to
     * @param {Edge} type
     * @return {Edges}
     */
    not( from, to, type )
    {
        from = index( from );
        to   = index( to );

        const be = this.edgeInfo.get( code( from, to ) );
        if ( be ) be.not( type );
        return this;
    }

    /**
     * @param {number} from
     * @param {number} to
     * @private
     */
    __add( from, to )
    {
        if ( !this.succs[ from ] )
            this.succs[ from ] = [ to ];
        else if ( !this.succs[ from ].includes( to ) )
            this.succs[ from ].push( to );

        if ( !this.succs[ to ] ) this.succs[ to ] = [];
    }

    /**
     * @param {CFGBlock|number} from
     * @param {CFGBlock|number} to
     * @param {Array<CFGBlock|number>} newTargets
     * @return {Edges}
     * @private
     */
    _retarget( from, to, ...newTargets )
    {
        from = index( from );
        to   = index( to );

        newTargets = newTargets.map( index );

        const
            _code    = code( from, to ),
            be       = this.edgeInfo.get( _code ),
            edgeType = be.type();

        newTargets.forEach( target => this.add( from, index( target ), edgeType ) );

        if ( be )
            this.edgeInfo.delete( _code );

        const
            succs = this.succs[ from ] || [],
            i     = succs.indexOf( to );

        if ( !this.succs[ from ] ) this.succs[ from ] = succs;

        if ( i !== -1 )
            succs.splice( i, 1 );

        this.reindex();
        return this;
    }

    /**
     * Point one or more edges to a new {@link CFGBlock}, used in block removal.
     *
     * @param {CFGBlock|number} node
     * @return {Edges}
     */
    retarget_multiple( node )
    {
        node = index( node );

        const
            preds = this.preds[ node ],
            succs = this.succs[ node ] || [];

        preds.forEach( p => this._retarget( p, node, ...succs ) );

        this.succs[ node ] = [];

        return this;
    }

    /**
     * Remove a successor {@link CFGBlock} from a {@link CFGBlock}
     *
     * @param {CFGBlock|number} from
     * @param {CFGBlock|number} to
     * @return {Edges}
     */
    remove_succ( from, to )
    {
        from = index( from );
        to   = index( to );

        this.edgeInfo.delete( code( from, to ) );

        const succs = this.succs[ from ];

        if ( !succs ) return this;

        const i = succs.indexOf( to );

        if ( i === -1 ) return this;

        succs.splice( i, 1 );
        this.reindex( from );
        return this;
    }

    /**
     * Get all successors for a given {@link CFGBlock}.
     *
     * @param {CFGBlock|number} from
     * @return {Array<CFGBlock>}
     */
    get_succs( from )
    {
        from = index( from );

        const succs = this.succs[ from ] || [];

        return succs.map( id => this.blockManager.get( id ) );
    }

    /**
     * Get all predecessors for a given {@link CFGBlock}
     *
     * @param {CFGBlock|number} from
     * @return {Array<CFGBlock>}
     */
    get_preds( from )
    {
        from = index( from );

        const preds = this.preds[ from ] || [];

        return preds.map( id => this.blockManager.get( id ) );
    }

    /**
     * Renumber all indices (`id` field) because of removed {@link CFGBlock}s.
     *
     * @param {Array<number>} newOffsets
     */
    renumber( newOffsets )
    {
        if ( newOffsets[ newOffsets.length - 1 ] === 0 ) return;

        let from = 0;

        const _succs = [];

        for ( const succs of this.successors() )
        {
            let newFrom = from + newOffsets[ from ];

            for ( const to of succs )
            {
                if ( from !== newFrom || to !== to + newOffsets[ to ] )
                    this._relabel( from, to, newFrom, to + newOffsets[ to ] );
            }

            _succs[ newFrom ] = succs.map( s => s + newOffsets[ s ] );
            from++;
        }

        this.succs = _succs;
    }

    /**
     * Keep edge information up-to-date.
     *
     * @param {CFGBlock|number} from
     * @param {CFGBlock|number} to
     * @param {CFGBlock|number} from1
     * @param {CFGBlock|number} to1
     * @return {?Edges}
     * @private
     */
    _relabel( from, to, from1, to1 )
    {
        const
            _code   = code( from, to ),
            newCode = code( from1, to1 ),
            be      = this.edgeInfo.get( _code );

        if ( !be ) return;

        this.edgeInfo.delete( _code );
        this.edgeInfo.set( newCode, be );
        return this;
    }

    /**
     * @type {Iterable<number>}
     */
    *successors()
    {
        yield *this.succs;
    }

    /**
     * Is there an edge of the gievn type?
     *
     * @param {CFGBlock|number} from
     * @param {Edge} type
     * @return {boolean}
     */
    has( from, type )
    {
        from = index( from );

        return this.succs.some( s => {
            const be = this.edgeInfo.get( code( from, s ) );
            return be && be.isa( type );
        } );
    }

    /**
     * Get edge information for a given {@link CFGBlock}, i.e. successors.
     *
     * @param {CFGBlock|number} from
     * @return {Array<Connection>}
     */
    edges( from )
    {
        from = index( from );

        return this.succs[ from ].map( to => ( { from, to, type: this.edgeInfo.get( code( from, to ) ) } ) );
    }

    /**
     * Get all predecessors for a given {@link CFGBlock}
     *
     * @return {Array<number>}
     */
    get preds()
    {
        // if ( !this._preds )
        this._preds = reverse_graph( this.succs );

        return this._preds;
    }

    /**
     * Get all predecessor edge information for a given {@link CFGBlock}.
     *
     * @param {CFGBlock|number} _from
     * @return {Array<Connection>}
     */
    pred_edges( _from )
    {
        const
            self  = index( _from ),
            preds = this.preds;

        return preds[ self ].map( p => ( { from: p, to: self, type: this.edgeInfo.get( code( p, self ) ) } ) );
    }
}
