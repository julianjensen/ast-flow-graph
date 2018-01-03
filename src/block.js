/** ******************************************************************************************************************
 * @file CFG block helper functions
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    MAX_EDGES_TO_PRINT = 7,
    SPACE_PER_EDGE     = 4,
    LEFT_EDGES         = ' <-- ', // ' ←── ',
    RIGHT_EDGES        = ' --> ', // ' ──→ ',
    AST_NODES          = ' => ',
    TRUE_EDGE          = '+', // '✔',
    FALSE_EDGE         = '-', // '✖',
    START_NODE         = '+', // '→',
    EXIT_NODE          = '$', // '⛔',

    digits             = ( n, d = 2, pre = '', post = '' ) => `${pre}${n}`.padStart( d ) + post,
    { isArray: array } = Array,
    has                = ( list, b ) => !!list.find( lb => lb.id === b.id ),
    _add               = ( arr, n ) => {
        const exists = arr.find( b => b.id === n.id );
        if ( !exists ) arr.push( n );
        return n;
    };


let BlockManager;

/** */
class CFGBlock
{
    constructor( edges )
    {
        // To prevent edges from showing up when doing `console.log` on these blocks
        Object.defineProperty( this, 'edges', { value: edges, enumerable: false } );

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

        this.createdBy = '';
        this.scope     = null;
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
     */
    add_var( name, type, index, isDecl, implied = false )
    {
        this.vars.add_var( this, { name, type, index, isDecl, implied } );
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

        cb.forEach( block => {
            if ( has( this.preds, block ) || has( block.succs, this ) ) return;
            this.edges.add( _add( this.preds, block ).id, _add( block.succs, this ).id, BlockManager.NORMAL );
        } );

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
    child( cb )
    {
        if ( !cb ) return this;

        if ( !array( cb ) )
            cb = [ cb ];

        cb.forEach( block => {
            if ( has( block.preds, this ) || has( this.succs, block ) ) return;
            this.edges.add( _add( block.preds, this ).id, _add( this.succs, block ).id, BlockManager.NORMAL );
        } );

        return this;
    }

    /**
     * @param {CFGBlock|CFGBlock[]} cb
     * @return {CFGBlock}
     */
    to( cb )
    {
        return this.child( cb );
    }

    remove_succ( kill )
    {
        this.remove_adjacent( kill, 1 );
        return this;
    }

    remove_pred( kill )
    {
        this.remove_adjacent( kill, -1 );
        return this;
    }

    remove_adjacent( kill, dir )
    {
        const
            [ list, remote ] = dir > 0 ? [ this.succs, kill.preds ] : [ this.preds, kill.succs ],
            remIndex         = list.findIndex( sb => sb === kill ),
            remRemIndex      = remote.findIndex( sb => sb === this );

        // assert( remIndex !== -1, `Removing non-existing ${dir > 0 ? 'successor' : 'predecessor'} ${kill.id} from ${this.id}` );
        // assert( remRemIndex !== -1, `Removing non-existing remote ref to self ${dir < 0 ? 'successor' : 'predecessor'} ${kill.id} from ${this.id}` );

        list.splice( remIndex, 1 );
        remote.splice( remRemIndex, 1 );

        if ( dir > 0 )
            this.edges.delete( this.id, kill.id );
        else
            this.edges.delete( kill.id, this.id );
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
        this.edges.type( this.id, block.id, BlockManager.TRUE );
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
        this.edges.type( this.id, block.id, BlockManager.FALSE );
        this.jumpFalse = block;
        this.type      = BlockManager.TEST;
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
     * @param {number} oldId
     * @param {number} newId
     */
    renumber( oldId, newId )
    {
        if ( oldId === newId ) return;

        const affectedBlocks = this.preds.concat( this.succs );

        this.preds.forEach( p => {
            if ( p.id === oldId )
                this.edges.replace( oldId, oldId, newId, newId );
            else
                this.edges.replace( p.id, oldId, p.id, newId );
        } );

        this.succs.forEach( s => {
            if ( s.id !== oldId )
                this.edges.replace( oldId, s.id, newId, s.id );
        } );

        return affectedBlocks;
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
     * @return {boolean|Array<CFGBlock>}  - true if deleted
     */
    eliminate( force = false )
    {
        if ( this.preds.length === 0 && this.succs.length === 0 ) force = true;

        if ( !force && ( this.nodes.length || this.isa( BlockManager.START ) || this.isa( BlockManager.EXIT ) ) ) return false;

        if ( this.succs.some( s => s === this ) ) return false;

        this.as( BlockManager.DELETED );

        const types = {};

        this.succs.forEach( s => {
            const ri = s.preds.findIndex( sp => sp === this );
            if ( ri !== -1 )
            {
                s.preds.splice( ri, 1 );
                this.edges.delete( this.id, s.id );
            }
        } );

        this.preds.forEach( p => {
            const ri = p.succs.findIndex( ps => ps === this );
            if ( ri !== -1 )
            {
                p.succs.splice( ri, 1 );
                types[ p.id ] = this.edges.delete( p.id, this.id ).type;
            }
        } );

        this.preds.forEach( p => {
            if ( this === p.jumpFalse && this.succs.length === 1 )
                p.whenFalse( this.succs[ 0 ] );
            else
                p.to( this.succs );
        } );

        return true;
    }

    /**
     *
     * 1. Add our successors to the successors or the new node
     * 2. For each of those successors, replace our august self in their predecessors with the upstart
     * 3. Add our noble predeccesors to those of the pretender
     * 4. For each of those exalted ancestors, replace our manifest heritage with that of the usurper
     * 5. Finally, remove our sacred `id` and depart this world in peace to be collected with the rest of the garbage.
     *
     * @param {CFGBlock} block
     */
    replace( block )
    {
        for ( const s of this.succs )
        {
            this.remove_succ( s );
            block.to( s );
        }

        for ( const p of this.preds )
        {
            this.remove_pred( p );
            p.to( block );
        }

        // The id will be cleaned up by the `finish` pass in the manager
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
        return ( this.type || ( this.first() ? this.first().type : 'no desc ' ) ) + this.lines();
    }

    /**
     * For the vertices.
     *
     * @return {string}
     */
    graph_label()
    {
        let
            txt = this.type && this.type.length < 16 ? this.type.replace( 'consequent', 'cons' ) : '',
            ln  = this.nodes.length && this.nodes[ 0 ].loc && this.nodes[ 0 ].loc.start.line;

        if ( this.type === 'start' || this.type === 'exit' ) txt += ':' + this.id;
        return txt ? `${txt}:${this.id}@${ln}` : `unk:${this.id}@${ln || ''}`;
    }

    isBool()
    {
        let isTrue  = false,
            isFalse = false;

        this.preds.some( p => p.isa( BlockManager.TEST ) && ( ( isTrue = p.jumpTrue === this ) || ( isFalse = p.jumpFalse === this ) ) );

        return isTrue ? TRUE_EDGE : isFalse ? FALSE_EDGE : '';
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

    str_edges( e, f, x )
    {
        let tf  = e.map( c => ( !f ? this.isBool() : '' ) + c.id ),
            out = e.map( ( c, i ) => digits( tf[ i ], SPACE_PER_EDGE ) ).join( '' );

        return ( out && f ? f : '    ' ) + out[ f ? 'padEnd' : 'padStart' ]( MAX_EDGES_TO_PRINT * SPACE_PER_EDGE ) + ( out && x ? x : '    ' );
    }

    toString()
    {
        const
            st      = this.type === BlockManager.START ? START_NODE : '',
            ex      = this.type === BlockManager.EXIT ? EXIT_NODE : ' ',
            nodes   = this.nodes.length ? AST_NODES + this.nodes.map( n => n.type + '(' + n.index + ')' ).join( ', ' ) : '',
            lines   = this.lines(),
            self    = this.vars.get( this ),
            lo      = self.liveOut,
            _phi    = self.phi,
            liveOut = lo && lo.size ? '\n    live: ' + [ ...lo ].join( ', ' ) : '';

        let phi = Object.keys( _phi ).join( ', ' );

        if ( phi ) phi = `\n     phi: ${phi}`;

        return this.str_edges( this.preds, '', LEFT_EDGES ) + digits( this.id, SPACE_PER_EDGE, st, ex ) + this.str_edges( this.succs, RIGHT_EDGES, '' ) + ' [' + this.type + lines + '] ' +
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

        return [
            this.type,
            this.lines().substr( 1 ),
            this.str_edges( this.preds, '', '' ),
            digits( this.id, '', '' ),
            this.str_edges( this.succs, '', '' ),
            this.createdBy || '',
            toStrs( this.split_by( [ ...this.vars.get( this ).liveOut ], 1 ) ),
            toStrs( this.split_by( [ ...this.vars.get( this ).ueVar ], 1 ) ),
            toStrs( this.split_by( [ ...this.vars.get( this ).varKill ], 1 ) ),
            this.split_by( [ ...this.vars.get( this ).phi.keys() ], 1 ).map( sect => sect.join( ' ' ) ).join( '\n' ),
            this.nodes.length ? this.split_by( this.nodes.map( n => n.type + '(' + n.index + ')' ), 1 ).map( sect => sect.join( ' ' ) ).join( '\n' ) : ''
        ];
    }

    /**
     * @param {BlockManager} bm
     * @constructor
     */
    static referenceBlockManager( bm )
    {
        BlockManager = bm;
    }

    mark( rdf )
    {
        const
            workList = [],
            marks = [];     // marks.length === nodes.length

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
