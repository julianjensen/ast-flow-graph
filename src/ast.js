/** ******************************************************************************************************************
 * @file Manages the AST, does some scans, and provides walkers.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

import assert from 'assert';
import { get_from_function, isBaseFunction } from './ast-vars';
import { analyze } from 'escope';
import { traverse } from 'estraverse';
import { parse, Syntax, VisitorKeys } from 'espree';

const
    { isArray: array } = Array,
    nodeString         = function() {
        let keys = VisitorKeys[ this.type ].map( key => `${key}${array( this[ key ] ) ? '(' + this[ key ].length + ')' : ''}` ).join( ', ' );

        if ( keys ) keys = ': [' + keys + ']';

        return `${this.type}, lvl: ${this.level}, line ${this.loc.start.line}${keys}`;
    };

let stableSort = 0;

/** */
export default class AST
{
    /**
     * @param {string} source
     * @param {object} options
     */
    constructor( source, options )
    {
        const stepsUp = es => {
            let s = -1;
            while ( es )
            {
                ++s;
                es = es.upper;
            }

            return s;
        };

        this.addedLines = [];
        this.blankLines = [];
        this.lines      = source.split( /\r?\n/ );
        this.lines.forEach( ( line, num ) => /^\s*$/.test( line ) && this.blankLines.push( num ) );

        this.source        = source;
        this.renameOffsets = [];
        // this.root          = this.ast = espree.parse( source, options );
        this.root          = this.ast = parse( source, options );

        this.nodesByIndex = [];
        this.functions    = [ get_from_function( this.ast ) ];

        let index   = 0,
            labeled = [];

        // this.traverse( ( node, parent ) => {
        this.walker( ( node, parent, _, field, findex ) => {
            this.nodesByIndex[ index ] = node;
            node.index                 = index++;
            node.parent                = parent;
            node.cfg                   = null;
            node.toString              = nodeString;
            node.level                 = 0;
            node.field                 = field;
            node.fieldIndex            = findex;

            if ( node.type === Syntax.LabeledStatement ) labeled.push( node );

            if ( isBaseFunction( node ) )
                this.functions.push( get_from_function( node ) );

            if ( node.type === Syntax.BlockStatement && node.body.length === 0 )
            {
                node.body.push( {
                    type:  Syntax.EmptyStatement,
                    loc:   node.loc,
                    range: node.range
                } );
            }



        } );

        // this.escope = escope.analyze( this.ast, {
        this.escope = analyze( this.ast, {
            ecmaVersion: 6,
            sourceType:  options.sourceType,
            directive:   true
        } );

        this.traverse( node => {
            const s    = this.node_to_scope( node );
            node.level = stepsUp( s );
            node.scope = s;
        } );

        this.associate = new Map();

        labeled.forEach( node => {
            let escope = this.node_to_scope( node ),
                assoc  = this.associate.get( escope );

            if ( !assoc ) this.associate.set( escope, assoc = { labels: [] } );
            assoc.labels.push( {
                label: node.label.name,
                node:  node
            } );

        } );
    }

    node_to_scope( node )
    {
        let scope = this.escope.acquire( node );

        if ( scope ) return scope;

        while ( node && !scope )
        {
            node = node.parent;
            if ( node ) scope = this.escope.acquire( node );
        }

        return scope;
    }

    *forFunctions()
    {
        yield *this.functions;
    }

    /**
     * @param {AnnotatedNode} start
     * @param {string} label
     * @return {?CFGBlock}
     */
    find_label( start, label )
    {
        let scope = this.node_to_scope( start );

        while ( scope )
        {
            const assoc = this.associate.get( scope );

            if ( assoc && assoc.labels )
            {
                const la = assoc.labels.find( la => la.label === label );
                if ( la ) return la.node.cfg;
            }

            scope = scope.upper;
        }

        return null;
    }

    /**
     * @param {Node|function} ast
     * @param {?function} [enter]
     * @param {?function} [leave]
     */
    traverse( ast, enter, leave )
    {
        if ( typeof ast === 'function' )
        {
            leave = enter;
            enter = ast;
            ast   = this.root;
        }

        const funcs = {
            enter
        };

        if ( typeof leave === 'function' )
            funcs.leave = leave;

        traverse( ast, funcs );
    }

    /**
     * @param {BaseNode|Node} [node]
     * @param {function} [enter]
     * @param {function} [leave]
     */
    walker( node, enter = () => {}, leave = () => {} )
    {
        if ( typeof node === 'function' )
        {
            leave = enter;
            enter = node;
            node  = this.root;
        }

        /**
         * @param {BaseNode|Array<Node>} node
         * @param {?(BaseNode|Node)} parent
         * @param {?Node} previous
         * @param {?string} [field]
         * @param {number} [index]
         * @param {?Node} next
         * @private
         */
        function _walker( node, parent, previous, field, index, next ) // eslint-disable-line max-params
        {
            if ( !node ) return;

            const
                isa = Array.isArray( node ),
                er  = !isa ? enter( node, parent, previous, field, index, next ) : true;

            if ( er !== false )
            {
                VisitorKeys[ node.type ].forEach( key => {
                    if ( Array.isArray( node[ key ] ) )
                    {
                        const arr = node[ key ];

                        arr.forEach( ( n, i ) => _walker( arr[ i ], node, i ? arr[ i - 1 ] : null, key, i, i === arr.length - 1 ? null : arr[ i + 1 ] ) );
                    }
                    else
                        _walker( node[ key ], node, null, key, next );
                } );
            }

            if ( !isa ) leave( node, parent, previous, field, index, next );
        }

        _walker( node || this.root, null, null, null, 0, null );
    }

    flat_walker( nodes, cb )
    {
        if ( !array( nodes ) )
        {
            if ( nodes.body && /Function/.test( nodes.type ) )
                nodes = nodes.body;

            if ( !array( nodes ) ) nodes = [ nodes ];
        }

        let i = 0;

        while ( i < nodes.length && cb( nodes[ i ], n => this.flat_walker( n, cb ) ) !== false )
            ++i;
    }

    call_visitors( node, cb )
    {
        if ( !node || !VisitorKeys[ node.type ] ) return;

        VisitorKeys[ node.type ].forEach( key => node[ key ] && cb( node[ key ] ) );
    }

    add_line( lineNumber, sourceLine )
    {
        const renumIndex = this.blankLines.findIndex( ln => ln <= lineNumber );

        if ( renumIndex !== -1 )
        {
            for ( let i = renumIndex; i < this.blankLines.length; i++ )
                this.blankLines[ i ]++;
        }

        let i = lineNumber;

        while ( i < this.lines.length && !this.lines[ i ] ) i++;

        if ( this.lines[ i ] )
            sourceLine = this.lines[ i ].replace( /^(\s*).*$/, '$1' ) + sourceLine.replace( /^\s*(.*)$/, '$1' );

        this.addedLines.push( { lineNumber: lineNumber * 10000 + stableSort++, sourceLine } );
    }

    rename( inode, newName )
    {
        assert( inode.type === Syntax.Identifier || inode.type === Syntax.MemberExpression, "Not an Identifier in rename, found: " + inode.type );

        if ( !~this.renameOffsets.findIndex( ro => ro.start === inode.range[ 0 ] ) )
            this.renameOffsets.push( { start: inode.range[ 0 ], end: inode.range[ 1 ], newName } );
    }

    as_source()
    {
        if ( this.renameOffsets.length === 0 ) return this.source;

        const offsets = this.renameOffsets.sort( ( a, b ) => b.start - a.start );

        let source = this.source;

        for ( const { start, end, newName } of offsets )
            source = source.substr( 0, start ) + newName + source.substr( end );

        const lines = source.split( /\r?\n/ );

        this.addedLines.sort( ( a, b ) => b.lineNumber - a.lineNumber ).forEach( ( { lineNumber, sourceLine } ) => {
            lines.splice( Math.floor( lineNumber / 10000 ), 0, sourceLine );
        } );

        return lines.map( ( l, i ) => `${i.toString().padStart( 3 )}. ${l}` ).join( '\n' );
    }
}
