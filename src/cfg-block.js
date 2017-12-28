/** ******************************************************************************************************************
 * @file CFG block helper functions
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    chalk              = require( 'chalk' ),
    sprintf = require( 'sprintf-js' ),
    MAX_EDGES_TO_PRINT = 7,
    SPACE_PER_EDGE     = 4,
    LEFT_EDGES         = ' <-- ', // ' ←── ',
    RIGHT_EDGES        = ' --> ', //' ──→ ',
    AST_NODES          = ' => ',
    TRUE_EDGE          = '+', // '✔',
    FALSE_EDGE         = '-', // '✖',
    START_NODE         = '+', // '→',
    EXIT_NODE          = '$', // '⛔',
    EMPTY              = '∅',
    assert             = require( 'assert' ),
    clc                = require( 'cli-color' ),
    warn               = clc.xterm( 220 ),
    error              = clc.xterm( 196 ),
    info               = clc.xterm( 117 ),

    colors             = {
        dark:  {
            green:  clc.xterm( 34 ),
            blue:   clc.xterm( 26 ),
            cyan:   clc.xterm( 45 ),
            purple: clc.xterm( 57 ),
            red:    clc.xterm( 161 ),
            orange: clc.xterm( 167 ),
            yellow: clc.xterm( 184 ),
            pink:   clc.xterm( 170 ),
            gray:   clc.xterm( 248 )
        },
        light: {
            green:  clc.xterm( 118 ),
            blue:   clc.xterm( 39 ),
            cyan:   clc.xterm( 123 ),
            purple: clc.xterm( 147 ),
            red:    clc.xterm( 196 ),
            orange: clc.xterm( 208 ),
            yellow: clc.xterm( 226 ),
            pink:   clc.xterm( 213 ),
            gray:   clc.xterm( 252 )
        },
        white: clc.xterm( 255 )
    },

    spr = {
        LEFT_EDGES, RIGHT_EDGES, AST_NODES, TRUE_EDGE, FALSE_EDGE, START_NODE, EXIT_NODE, EMPTY
    },
    pleftEdges = "%s %(LEFT_EDGES)s  % 3s%s %(RIGHT_EDGES)s %s   [%s:%s]",

    eyes               = require( 'eyes' ),
    {
        initialize,
        liveOut,
        compute_globals
    }                  = require( './liveness' ),
    EdgeList           = require( './edge-list' ),
    dot                = require( './dot' ),
    digits             = ( n, d = 2, pre = '', post = '' ) => `${pre}${n}`.padStart( d ) + post,
    { isArray: array } = Array,
    dupes              = list => {
        let dupeList = [];

        for ( let i = 0; i < list.length; ++i )
        {
            const b = list[ i ];

            for ( let j = i + 1; j < list.length; ++j )
            {
                const c = list[ j ];

                if ( b.id === c.id )
                    dupeList.push( b.id );
            }
        }

        return dupeList.length ? dupeList : null;
    },
    has                = ( list, b ) => !!list.find( lb => lb.id === b.id ),
    _add               = ( arr, n ) => {
        const exists = arr.find( b => b.id === n.id );
        if ( !exists ) arr.push( n );
        return n;
    };

class BlockManager
{
    constructor()
    {
        this.edges = new EdgeList();

        BlockManager.blockId = 0;
        /** @type {CFGBlock[]} */
        this.blocks = [];
        this.startNode = this.block().as( BlockManager.START );
        this.toExit    = [];
    }

    /**
     * @param {CFGBlock} block
     */
    toExitNode( block )
    {
        this.toExit.push( block );
    }

    /**
     * @param {CFGInfo} cfg
     */
    finish( cfg )
    {
        function check_dupes( block, message = 'pre-check' )
        {
            if ( dupes( block.succs ) )
                console.error( error( `${message}: Successor dupes for ${block.id}: ${dupes( block.succs ).join( ', ' )}` ) );
            if ( dupes( block.preds ) )
                console.error( error( `${message}: Predecessor dupes for ${block.id}: ${dupes( block.preds ).join( ', ' )}` ) );
        }

        this.exitNode = this.block().as( BlockManager.EXIT );
        this.toExit.forEach( b => b.to( this.exitNode ) );

        let i;

        for ( const block of this )
        {
            check_dupes( block );
        }

        const
            packed = [];

        for ( i = 0; i < BlockManager.blockId; i++ )
        {
            if ( this.blocks[ i ].eliminate() )
                this.blocks[ i ] = null;
        }

        for ( i = 0; i < BlockManager.blockId; i++ )
        {
            if ( this.blocks[ i ] )
            {
                this.blocks[ i ].renumber( i, packed.length );
                this.blocks[ i ].id = packed.length;
                packed.push( this.blocks[ i ] );
            }
        }

        this.blocks = packed;

        BlockManager.blockId = this.size = this.blocks.length;

        const scope = cfg.ast.escope.acquire( cfg.node );

        initialize( scope );
        liveOut( cfg );
        compute_globals( this );
    }

    /**
     * @param {function} fn
     */
    forEach( fn )
    {
        this.blocks.forEach( ( b, i, bl ) => b && fn( b, i, bl ) );
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
        return this.blocks.map( b => `${b}` ).join( '\n' ); // + `\n\n${this.edges}\n`;
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

/** */
class CFGBlock
{
    constructor( edges )
    {
        Object.defineProperty( this, 'edges', { value: edges, enumerable: false } );
        // this.edges = edges;

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

        this.ueVar      = null;
        this.varKill    = null;
        this.notVarKill = null;
        this.liveOut    = null;
        this.createdBy  = '';
        this.varList    = [];
        this.phi        = {};
    }

    hasPhi( name )
    {
        return this.phi.hasOwnProperty( name );
    }

    addPhi( name, defBlock )
    {
        if ( !this.hasPhi( name ) )
            this.phi[ name ] = [ defBlock ];
        else
            this.phi[ name ].push( defBlock );
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
            if ( has( this.preds, block ) )
            {
                assert( has( block.succs, this ) );
                return;
            }
            if ( has( block.succs, this ) )
            {
                assert( has( this.preds, block ) );
                return;
            }

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
            if ( has( block.preds, this ) )
            {
                assert( has( this.succs, block ) );
                return;
            }
            if ( has( this.succs, block ) )
            {
                assert( has( block.preds, this ) );
                return;
            }
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
    }

    remove_pred( kill )
    {
        this.remove_adjacent( kill, -1 );
    }

    remove_adjacent( kill, dir )
    {
        const
            [ list, remote ] = dir > 0 ? [ this.succs, kill.preds ] : [ this.preds, kill.succs ],
            remIndex         = list.findIndex( sb => sb === kill ),
            remRemIndex      = remote.findIndex( sb => sb === this );

        assert( remIndex !== -1, `Removing non-existing ${dir > 0 ? 'successor' : 'predecessor'} ${kill.id} from ${this.id}` );
        assert( remRemIndex !== -1, `Removing non-existing remote ref to self ${dir < 0 ? 'successor' : 'predecessor'} ${kill.id} from ${this.id}` );

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
                this.edges.replace( oldId, s.id, newId, s.id )
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
        // if ( !force && ( this.nodes.length || this.isa( BlockManager.START ) || this.isa( BlockManager.EXIT ) || this.isa( BlockManager.TEST ) ) ) return false;

        if ( this.succs.some( s => s === this ) ) return false;

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
            f                                                                  = this.first() || {},
            l                                                                  = this.last() || {},
            { start: { line: start = 0 } } = f.loc, { end: { line: end = 0 } } = l.loc;

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
            liveOut = this.liveOut.size ? '\n    live: ' + [ ...this.liveOut ].join( ', ' ) : '';

        let phi = Object.keys( this.phi ).join( ', ' );

        if ( phi ) phi = `\n     phi: ${phi}`;

        return this.str_edges( this.preds, '', LEFT_EDGES ) + digits( this.id, SPACE_PER_EDGE, st, ex ) + this.str_edges( this.succs, RIGHT_EDGES, '' ) + ' [' + this.type + lines + '] ' +
               ( this.createdBy ? 'from ' + this.createdBy : '' ) +
               nodes + liveOut + phi;
    }

    split_by( arr, chunkSize )
    {
        let offset = 0,
            lng = arr.length,
            out = [];

        while ( offset < lng )
        {
            out.push( arr.slice( offset, offset + chunkSize ) );
            offset += chunkSize;
        }

        return out;
    }

    /**
     * Headers are
     * TYPE / LINES / LEFT EDGES / NODE / RIGHT EDGES / CREATED BY / LIVEOUT / PHI / AST
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
            toStrs( this.split_by( [ ...this.liveOut ], 3 ) ),
            this.split_by( Object.keys( this.phi ), 3 ).map( sect => sect.join( ' ' ) ).join( '\n' ),
            this.nodes.length ? this.split_by( this.nodes.map( n => n.type + '(' + n.index + ')' ), 2 ).map( sect => sect.join( ' ' ) ).join( '\n' ) : '',
        ];
    }
}

module.exports = BlockManager;
