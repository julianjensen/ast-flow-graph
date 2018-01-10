/** ******************************************************************************************************************
 * @file CFG block helper functions
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    assert             = require( 'assert' ),
    {
        outputOptions: {
                           MAX_EDGES_TO_PRINT,
                           SPACE_PER_EDGE,
                           LEFT_EDGES,
                           RIGHT_EDGES,
                           AST_NODES,
                           TRUE_EDGE,
                           FALSE_EDGE,
                           START_NODE,
                           EXIT_NODE
                       },

        Block, Edge, enum_to_string
    }                  = require( './types' ),
    { flatten } = require( './utils' ),

    digits             = ( n, d = 2, pre = '', post = '' ) => `${pre}${n}`.padStart( d ) + post,
    { isArray: array } = Array,
    has                = ( list, b ) => !!list.find( lb => lb.id === b.id ),
    _add               = ( arr, n ) => {
        const exists = arr.find( b => b.id === n.id );
        if ( !exists ) arr.push( n );
        return n;
    };

/**
 * @typedef {object} EdgeInfo
 * @property {function(number):EdgeInfo} as
 * @property {function(number):EdgeInfo} not
 * @property {function(number):boolean} isa
 * @property {number} index
 */

/**
 * @param {number} index
 * @param {number} _type
 * @return {EdgeInfo}
 */
function blockEdge( index, _type = 0 )
{
    let type = _type,
        self = {
            as,
            not,
            isa,
            get index() { return index; },
            set index( i ) {
                index = i;
                return self;
            }
        };

    function as( t )
    {
        type |= t;
    }

    function not( t )
    {
        type &= ~t;
    }

    function isa( t )
    {
        return type & t;
    }

    return self;
}

/** */
class CFGBlock
{
    constructor( id )
    {
        // // To prevent edges from showing up when doing `console.log` on these blocks
        // Object.defineProperty( this, 'edges', { value: edges, enumerable: false } );

        this.id = id;
        /** @type {Array<AnnotatedNode|BaseNode|Node>} */
        this.nodes = [];
        /** @type {Array<CFGBlock>} */
        this.preds = [];
        /** @type {Array<CFGBlock>} */
        this.succs = [];

        /** @type {Array<EdgeInfo>} */
        this.edgeInfo = [];
        /** @type {?EdgeInfo} */
        this.lastEdge = null;

        this.types = Block.NORMAL;

        this.createdBy = '';
        this.scope     = null;
    }

    *edges()
    {
        const sl = this.succs.length;

        for ( let i = 0; i < sl; i++ )
        {
            yield { from: this.id, to: this.succs[ i ].id, type: this.edgeInfo[ i ] };
        }
    }

    get edgeIndices()
    {
        return this.succs.map( s => s.id );
    }

    _set_edge( index, type = 0 )
    {
        if ( typeof index !== 'number' )
            index = this.succs.indexOf( index );

        return this.edgeInfo[ index ] = blockEdge( index, type );
    }

    prepare( vars )
    {
        this.vars = vars;
    }

    /**
     * @param {string} name     - Variable name
     * @param {string} type     - Either 'use' or 'def'
     * @param index             - AST node index
     * @param {boolean} isDecl  - If this is a declaration, it may shadow a similarly named variable in an outer scope
     * @param {boolean} implied - Identifier part of a chain
     * @param {boolean} renameTarget
     */
    add_var( name, type, index, isDecl, implied = false, renameTarget = false ) // eslint-disable-line max-params
    {
        this.vars.add_var( this, { name, type, index, isDecl, implied, renameTarget } );
    }

    /**
     * @return {boolean}
     */
    isEmpty()
    {
        return this.nodes.length === 0;
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

        if ( !array( cb ) )
            cb = [ cb ];

        cb.forEach( block => {
            this.lastEdge = this._set_edge( this.succs.length, Edge.NONE );
            this.succs.push( block );
        } );

        return this;
    }

    get_edge_by_type( type )
    {
        return this.edgeInfo.find( e => e.isa( type ) );
    }

    get_block_by_edge_type( type )
    {
        const e = this.get_edge_by_type( type );

        if ( !e ) return null;

        return this.succs[ this.edgeInfo.indexOf( e ) ];
    }

    get_edge_to_succ( succ )
    {
        return this.edgeInfo[ this.succs.indexOf( succ ) ];
    }

    remove_succs()
    {
        this.succs    = [];
        this.edgeInfo = [];
    }

    remove_succ( kill )
    {
        const index = this.succs.indexOf( kill );

        if ( index === -1 ) return this;
        // assert( index !== -1 );

        this.succs.splice( index, 1 );
        this.edgeInfo.splice( index, 1 );
        this.edgeInfo.forEach( ( e, i ) => e.index = i );
        return this;
    }

    remove_pred( kill )
    {
        const index = this.preds.indexOf( kill );

        if ( index === -1 ) return this;

        this.preds.splice( index, 1 );
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

        return this;
    }

    edge_as( edgeType )
    {
        if ( this.lastEdge ) this.lastEdge.as( edgeType );
        return this;
    }

    not( nodeType )
    {
        this.types &= ~nodeType;
        return this;
    }

    /**
     * @param {CFGBlock} block
     * @return {CFGBlock}
     */
    whenTrue( block )
    {
        if ( !block ) return this;

        this.to( block ).as( Block.TEST ).lastEdge.as( Edge.TRUE );
        return this;
    }

    /**
     * @param {CFGBlock} block
     * @return {CFGBlock}
     */
    whenFalse( block )
    {
        if ( !block ) return this;

        this.to( block ).as( Block.TEST ).lastEdge.as( Edge.FALSE );
        return this;
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
     * @return {?(AnnotatedNode|BaseNode|Node)}
     */
    first()
    {
        return this.nodes.length ? this.nodes[ 0 ] : null;
    }

    /**
     * @return {?(AnnotatedNode|BaseNode|Node)}
     */
    last()
    {
        return this.nodes.length ? this.nodes[ this.nodes.length - 1 ] : null;
    }

    /**
     * @param {string} txt
     * @return {CFGBlock}
     */
    by( txt )
    {
        this.createdBy = txt;
        return this;
    }

    /**
     * @param {number} typeName
     * @returns {boolean}
     */
    isa( typeName )
    {
        return !!( this.types & typeName );
    }

    /**
     * Remove itself if it's an empty node
     *
     * 1. Remove this node from the successor list of each predecessor
     * 2. In that same spot, insert the successors of this node
     * 3. Remove this node from the predecessors of each successor
     * 4. In that same spot, insert the predecessors of this node
     *
     * @return {boolean}  - true if can be deleted
     */
    eliminate()
    {
        const can = !this.nodes.length && !this.isa( Block.START ) && !this.isa( Block.EXIT ) && !this.succs.some( s => s === this );

        if ( !can ) return false;

        const
            liveSuccs = this.live_succs(),
            livePreds = [];

        this.for_live_preds( p => livePreds.push( p ) && p.remove_succ( this ).to( liveSuccs ) );
        liveSuccs.forEach( s => s.remove_pred( this ).from( livePreds ) );
        this.as( Block.DELETED );
        return true;
    }

    for_live_preds( fn )
    {
        this.preds.forEach( ( p, i ) => p.isa( Block.DELETED ) || fn( p, i ) );
    }

    live_succs()
    {
        const
            live = _s => !_s.isa( Block.DELETED ) ? _s : _s.succs.length ? _s.succs.map( live ) : null;
        // if ( !s.isa( Block.DELETED ) ) return s;
        //
        // if ( !s.succs.length ) return null;


        return flatten( this.succs.map( live ) ).filter( s => !!s );
    }

    /*****************************************************************************************************************
     *
     * PRINT
     *
     *****************************************************************************************************************/

    /**
     * For the edges.
     *
     * @return {string}
     */
    node_label()
    {
        return ( this.types || ( this.first() ? this.first().types : 'no desc ' ) ) + this.lines();
    }

    /**
     * For the vertices.
     *
     * @return {string}
     */
    graph_label()
    {
        let
            txt = this.types && this.types.length < 16 ? this.types.replace( 'consequent', 'cons' ) : '',
            ln  = this.nodes.length && this.nodes[ 0 ].loc && this.nodes[ 0 ].loc.start.line;

        if ( this.types === 'start' || this.types === 'exit' ) txt += ':' + this.id;
        return txt ? `${txt}:${this.id}@${ln}` : `unk:${this.id}@${ln || ''}`;
    }

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

        if ( start === end )
            return `:${start}`;

        return `:${start}-${end}`;
    }

    pred_edge_types()
    {
        return this.preds.map( p => p.get_edge_to_succ( this ) ).map( e => e.isa( Edge.TRUE ) ? TRUE_EDGE : e.isa( Edge.FALSE ) ? FALSE_EDGE : '' );
    }

    succ_edge_types()
    {
        return this.edgeInfo.map( e => e.isa( Edge.TRUE ) ? TRUE_EDGE : e.isa( Edge.FALSE ) ? FALSE_EDGE : '' );
    }

    toString()
    {
        const
            st    = this.isa( Block.START ) ? START_NODE : '',
            ex    = this.isa( Block.EXIT ) ? EXIT_NODE : ' ',
            nodes = this.nodes.length ? AST_NODES + this.nodes.map( n => n.type + '(' + n.index + ')' ).join( ', ' ) : '',
            lines = this.lines();

        let self,
            lo,
            _phi,
            phi,
            liveOut;

        if ( this.vars )
        {
            self    = this.vars.get( this );
            lo      = self.liveOut;
            _phi    = self.phi;
            liveOut = lo && lo.size ? '\n    live: ' + [ ...lo ].join( ', ' ) : '';
            phi = Object.keys( _phi ).join( ', ' );
            if ( phi ) phi = `\n     phi: ${phi}`;
        }
        else
        {
            liveOut = '';
            phi = '';
        }

        let leftEdges  = this.pred_edge_types().map( ( c, i ) => c + digits( this.preds[ i ].id, SPACE_PER_EDGE ) ).join( '' ) + LEFT_EDGES,
            rightEdges = RIGHT_EDGES + this.succ_edge_types().map( ( c, i ) => c + digits( this.succs[ i ].id, SPACE_PER_EDGE ) ).join( '' );

        leftEdges = leftEdges !== LEFT_EDGES ? leftEdges : ( ' '.repeat( SPACE_PER_EDGE - 1 ) + LEFT_EDGES );

        return leftEdges + digits( this.id, SPACE_PER_EDGE, st, ex ) + rightEdges + ' [' + enum_to_string( Block, this.types ).join( ' ' ) + lines + '] ' +
               ( this.createdBy ? 'from ' + this.createdBy : '' ) +
               nodes + liveOut + phi;
    }

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
     * TYPE / LINES / LEFT EDGES / NODE / RIGHT EDGES / CREATED BY / LIVEOUT / UE / KILL / PHI / AST
     */
    toRow()
    {
        const
            toStrs = arr => arr.map( grp => grp.join( ' ' ) ).join( '\n' );

        let leftEdges  = this.pred_edge_types().map( ( c, i ) => digits( this.preds[ i ].id, SPACE_PER_EDGE, c, '' ) ).join( '' ),
            rightEdges = this.succ_edge_types().map( ( c, i ) => digits( this.succs[ i ].id, SPACE_PER_EDGE, '', c ) ).join( '' );

        return [
            enum_to_string( Block, this.types ).join( '\n' ),
            this.lines().substr( 1 ),
            leftEdges,
            digits( this.id, '', '' ),
            rightEdges,
            this.createdBy || '',
            toStrs( this.split_by( [ ...this.vars.get( this ).liveOut ], 1 ) ),
            toStrs( this.split_by( [ ...this.vars.get( this ).ueVar ], 1 ) ),
            toStrs( this.split_by( [ ...this.vars.get( this ).varKill ], 1 ) ),
            this.split_by( [ ...this.vars.get( this ).phi.keys() ], 1 ).map( sect => sect.join( ' ' ) ).join( '\n' ),
            this.nodes.length ? this.split_by( this.nodes.map( n => n.type + '(' + n.index + ')' ), 1 ).map( sect => sect.join( ' ' ) ).join( '\n' ) : ''
        ];
    }

    mark( rdf )
    {
        const
            workList = [],
            marks    = [];     // marks.length === nodes.length

        function isCritical( node )
        {

        }

        // @todo assign each def/use to a top node in the flat list for the block: x <- y op z (we ignore any line that have no def/use)
        this.nodes.forEach( ( node, i ) => {
            if ( isCritical( node ) )
            {
                marks[ i ] = true;
                workList[ i ].push( node );
            }
        } );

        while ( workList.length )
        {
            // for every 'use' mark the corresponding 'def' op

            // if ( this.isa( BlockManager.TEST ) )
            // for every block in post dominance frontier of this
            // i.e. rdf.forEach( b => mark branch from this to b and add branch to workList )
        }
    }

    sweep( marks )
    {
        this.nodes.forEach( ( op, i ) => {
            if ( marks[ i ] ) return;

            // if op is branch rewrite op to to jump to nearest marked post dom
            // else if not a jump delete op
        } );
    }
}

module.exports = CFGBlock;
