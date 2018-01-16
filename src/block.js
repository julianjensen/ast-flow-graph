/** ******************************************************************************************************************
 * @file CFG block helper functions
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Dec-2017
 *********************************************************************************************************************/
"use strict";
// @ts-check

import assert from 'assert';
import { Block, Edge, enum_to_string } from './types';

const
        MAX_EDGES_TO_PRINT = 7,
        SPACE_PER_EDGE =     4,
        LEFT_EDGES =         ' <-- ', // ' ←── ',
        RIGHT_EDGES =        ' --> ', // ' ──→ ',
        AST_NODES =          ' => ',
        TRUE_EDGE =          '+', // '✔',
        FALSE_EDGE =         '-', // '✖',
        START_NODE =         '+', // '→',
        EXIT_NODE =          '$', // '⛔',
    // }
    // assert             = require( 'assert' ),
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

        // Block, Edge, enum_to_string
    }                  = require( './types' ),

    digits             = ( n, d = 2, pre = '', post = '' ) => `${pre}${n}`.padStart( d ) + post,
    { isArray: array } = Array;

/**
 * @typedef {object} EdgeInfo
 * @property {function(number):EdgeInfo} as
 * @property {function(number):EdgeInfo} not
 * @property {function(number):boolean} isa
 * @property {number} index
 */

/** */
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
    }

    get succs()
    {
        return this.edges.get_succs( this );
    }

    get preds()
    {
        return this.edges.get_preds( this );
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
            this.lastEdge = this.edges.add( this, cb ).lastEdge;
        else
            cb.forEach( block => this.lastEdge = this.edges.add( this, block ).lastEdge );

        return this;
    }

    remove_succs()
    {
        this.edges.get_succs( this ).forEach( s => this.edges.remove_succ( this, s ) );
        return this;
    }

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

    edge_as( edgeType, to = this.lastEdge.to )
    {
        this.edges.classify( this, to, edgeType );
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

        this.to( block ).as( Block.TEST );
        this.edge_as( Edge.TRUE, block.id );
        return this;
    }

    /**
     * @param {CFGBlock} block
     * @return {CFGBlock}
     */
    whenFalse( block )
    {
        if ( !block ) return this;

        this.to( block ).as( Block.TEST );
        this.edge_as( Edge.FALSE );
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
     * @return {boolean}  - true if can be deleted
     */
    eliminate()
    {
        if ( this.nodes.length || this.isa( Block.START ) || this.isa( Block.EXIT ) || this.succs.some( s => s === this ) ) return false;

        this.edges.retarget_multiple( this );

        this.as( Block.DELETED );
        return true;
    }

    defer_edge_type( type )
    {
        this.deferredEdgeType = type;
    }

    /*****************************************************************************************************************
     *
     * PRINT
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
        return this.edges.pred_edges( this ).map( e => e.type.isa( Edge.TRUE ) ? TRUE_EDGE : e.type.isa( Edge.FALSE ) ? FALSE_EDGE : e.type.isa( ~Edge.CLEAR ) ? '*' : '' );
    }

    succ_edge_types()
    {
        return this.edges.edges( this ).map( e => e.type.isa( Edge.TRUE ) ? TRUE_EDGE : e.type.isa( Edge.FALSE ) ? FALSE_EDGE : e.type.isa( ~Edge.CLEAR ) ? '*' : '' );
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
            phi     = Object.keys( _phi ).join( ', ' );
            if ( phi ) phi = `\n     phi: ${phi}`;
        }
        else
        {
            liveOut = '';
            phi     = '';
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

        let preds      = this.preds,
            succs      = this.succs,
            leftEdges  = this.pred_edge_types().map( ( c, i ) => digits( preds[ i ].id, SPACE_PER_EDGE, c, '' ) ).join( '' ),
            rightEdges = this.succ_edge_types().map( ( c, i ) => digits( succs[ i ].id, SPACE_PER_EDGE, '', c ) ).join( '' );

        return [
            enum_to_string( Block, this.types ).join( '\n' ),
            this.lines().substr( 1 ),
            leftEdges,
            digits( this.id, '', '' ),
            rightEdges,
            this.createdBy || '',
            this.vars ? toStrs( this.split_by( [ ...this.vars.get( this ).liveOut ], 1 ) ) : '',
            this.vars ? toStrs( this.split_by( [ ...this.vars.get( this ).ueVar ], 1 ) ) : '',
            this.vars ? toStrs( this.split_by( [ ...this.vars.get( this ).varKill ], 1 ) ) : '',
            this.vars ? this.split_by( [ ...this.vars.get( this ).phi.keys() ], 1 ).map( sect => sect.join( ' ' ) ).join( '\n' ) : '',
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

// module.exports = CFGBlock;
