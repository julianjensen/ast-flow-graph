/** ******************************************************************************************************************
 * @file Manages the AST, does some scans, and provides walkers.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

import assert from 'assert';
import { traverse, Syntax } from 'estraverse';
import { analyze } from 'escope';
import { VisitorKeys } from 'espree';
import { plugin, current } from './utils';

const
    { isArray: array } = Array,
    /**
     * @param {string} type
     * @return {boolean}
     * @private
     */
    isBaseFunction = ( { type } ) => type === Syntax.FunctionDeclaration || type === Syntax.FunctionExpression || type === Syntax.ArrowFunctionExpression,
    /**
     * @return {string}
     * @private
     */
    nodeString         = function() {
        let keys = VisitorKeys[ this.type ].map( key => `${key}${array( this[ key ] ) ? '(' + this[ key ].length + ')' : ''}` ).join( ', ' );

        if ( keys ) keys = ': [' + keys + ']';

        return `${this.type}, lvl: ${this.level}, line ${this.loc.start.line}${keys}`;
    };

let stableSort = 0;

/**
 * @class
 * @param {string} source
 * @param {object} options
 */
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

        current.ast = this;
        plugin( 'ast', 'init', this );

        // this.root          = this.ast = espree.parse( source, options );
        this.root          = this.ast = plugin( 'parse', null, source, options );

        this.escope = analyze( this.ast, {
            ecmaVersion: 6,
            sourceType:  options.sourceType,
            directive:   true
        } );

        this.nodesByIndex = [];
        this.functions    = [ this.get_from_function( this.ast ) ];

        let index   = 0,
            labeled = [];

        current.ast = this;
        plugin( 'ast', 'postinit', this );

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
                this.functions.push( this.get_from_function( node ) );

            if ( node.type === Syntax.BlockStatement && node.body.length === 0 )
            {
                node.body.push( {
                    type:  Syntax.EmptyStatement,
                    loc:   node.loc,
                    range: node.range
                } );
            }
        } );

        current.ast = this;
        plugin( 'ast', 'finish', this );

        // this.escope = escope.analyze( this.ast, {
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

        current.ast = this;
        plugin( 'ast', 'postfinish', this );
    }

    /**
     * @param {AnnotatedNode} node
     * @return {*}
     */
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

    /**
     * @type {Iterable<FunctionInfo>}
     */
    *forFunctions()
    {
        yield *this.functions;
    }

    /**
     * @param {AnnotatedNode} start
     * @param {string} label
     * @return {?CFGBlock}
     * @private
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
     * @param {AnnotatedNode|BaseNode|Node} node
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
                isa = array( node ),
                er  = !isa ? enter( node, parent, previous, field, index, next ) : true;

            if ( er !== false )
            {
                VisitorKeys[ node.type ].forEach( key => {
                    if ( array( node[ key ] ) )
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

    /**
     * Iterate over all nodes in a block without recursing into sub-nodes.
     *
     * @param {Array<AnnotatedNode>|AnnotatedNode} nodes
     * @param {function(AnnotatedNode,function(AnnotatedNode):boolean):boolean} cb
     */
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

    /**
     * Callback for each visitor key for a given node.
     *
     * @param {AnnotatedNode} node
     * @param {function((Array<AnnotatedNode>|AnnotatedNode))} cb
     */
    call_visitors( node, cb )
    {
        if ( !node || !VisitorKeys[ node.type ] ) return;

        VisitorKeys[ node.type ].forEach( key => node[ key ] && cb( node[ key ] ) );
    }

    /**
     * Add a new line to the source code.
     *
     * @param {number} lineNumber   - 0-based line number
     * @param {string} sourceLine   - The source line to add
     */
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

    /**
     * @param {Identifier|AnnotatedNode} inode  - A node of type Syntax.Identifier
     * @param {string} newName                  - The new name of the identifier
     */
    rename( inode, newName )
    {
        assert( inode.type === Syntax.Identifier || inode.type === Syntax.MemberExpression, "Not an Identifier in rename, found: " + inode.type );

        if ( !~this.renameOffsets.findIndex( ro => ro.start === inode.range[ 0 ] ) )
            this.renameOffsets.push( { start: inode.range[ 0 ], end: inode.range[ 1 ], newName } );
    }

    /**
     * Return the AST nodes as source code, including any modifications made.
     * @return {string}     - The lossy source code
     */
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

    /**
     * @param {FunctionDeclaration|FunctionExpression|MethodDefinition|ArrowFunctionExpression|Property|Node} node
     * @param {string} [whatToGet='all']
     * @return {Array<Node>|string|CFGInfo}
     * @protected
     */
    get_from_function( node, whatToGet = 'all' )
    {
        if ( node.type === Syntax.Program )
        {
            const pg = {
                name:   'main',
                params: [],
                body:   grab_body( node ),
                lines:  [ node.loc.start.line, node.loc.end.line ],
                node
            };

            return whatToGet && whatToGet !== 'all' ? pg[ whatToGet ] : pg;
        }

        const
            /**
             * @param {AnnotatedNode} n
             * @return {?string}
             * @private
             */
            hopeForName = n => {
                if ( n.type === Syntax.Identifier )
                    return n.name;
                else if ( n.type === Syntax.MemberExpression )
                {
                    if ( !n.computed && n.object.type === Syntax.Identifier && n.property.type === Syntax.Identifier ) return n.object.name + '.' + n.property.name;
                    if ( !n.computed || n.object.type !== Syntax.Identifier || n.property.type !== Syntax.Identifier ) return null;
                    // if ( n.object.name !== 'Symbol' && n.object.name !== 'super' ) return null;

                    return n.object + '.' + n.property;

                }
                else if ( n.type === Syntax.MethodDefinition )
                {
                    if ( n.kind === 'constructor' )
                        return 'constructor';
                    else if ( n.kind === 'method' )
                        return hopeForName( n.key );
                    else
                    {
                        const _name = hopeForName( n.key );

                        return typeof _name === 'string' ? _name + '.' + n.kind : _name;
                    }
                }
                else if ( n.id )
                    return hopeForName( n.id );
                else if ( n.parent.type === Syntax.Property || n.parent.type === Syntax.MethodDefinition )
                    return hopeForName( n.parent.key );
                else if ( n.parent.type === Syntax.VariableDeclarator )
                    return hopeForName( n.parent.id );
                else if ( n.parent.type === Syntax.AssignmentExpression )
                    return hopeForName( n.parent.left );

                return 'anonymous';
            };

        if ( node.type === Syntax.Property || node.type === Syntax.MethodDefinition )
            return this.get_from_function( node.value, whatToGet );
        else if ( !isBaseFunction( node ) )
            throw new SyntaxError( `No function found near ${node.type}, unable to find ${whatToGet}` );

        return grab_info();

        /**
         * @param {AnnotatedNode|BaseFunction|MethodDefinition|Program} node
         * @returns {?(AnnotatedNode|Array<AnnotatedNode>)}
         * @private
         */
        function grab_body( node )
        {
            switch ( node.type )
            {
                case Syntax.Program:
                case Syntax.FunctionDeclaration:
                case Syntax.FunctionExpression:
                case Syntax.ArrowFunctionExpression:
                    return node.body.type === Syntax.BlockStatement ? node.body.body : node.body;

                case Syntax.MethodDefinition:
                    return grab_body( node.value );
            }
        }

        /**
         * @returns {*}
         * @private
         */
        function grab_info()
        {
            switch ( whatToGet )
            {
                case 'name':
                    return hopeForName( node );

                case 'params':
                    return node.params;

                case 'body':
                    return grab_body( node );

                case 'lines':
                    return [ node.loc.start.line, node.loc.end.line ];

                default:
                    return {
                        name:   hopeForName( node ),
                        params: node.params,
                        body:   node.body.type === Syntax.BlockStatement ? node.body.body : node.body,
                        lines:  [ node.loc.start.line, node.loc.end.line ],
                        node
                    };
            }
        }
    }
}
