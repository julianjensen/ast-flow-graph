/** ******************************************************************************************************************
 * @file Manages the AST, does some scans, and provides walkers.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    {
        get_from_function,
        isBaseFunction
    }                  = require( './ast-helpers' ),

    escope             = require( 'escope' ),
    { traverse }       = require( 'estraverse' ),

    espree = require( 'espree' ),
    {
        Syntax,
        VisitorKeys
    }                  = espree,

    { isArray: array } = Array,
    get_node = node => array( node ) ? node[ 0 ] : node,
    nodeString         = function() {
        let keys = VisitorKeys[ this.type ].map( key => `${key}${array( this[ key ] ) ? '(' + this[ key ].length + ')' : ''}` ).join( ', ' );

        if ( keys ) keys = ': [' + keys + ']';

        return `${this.type}, lvl: ${this.level}, line ${this.loc.start.line}${keys}`;
    };

/**
 * It's damn near impossible to make WebStorm understand a class hierarchy.
 *
 * @typedef {Statement|Function|Expression|Pattern|Declaration|Node|BaseNode|Esprima.Node} AnnotatedNode
 * @extends BaseNode
 * @extends Node
 * @extends VariableDeclarator
 * @extends Statement
 * @extends Declaration
 * @extends Pattern
 * @extends Expression
 * @extends Function
 * @extends BlockStatement
 * @extends espree.Node
 * @property {number} [index]
 * @property {AnnotatedNode} [parent]
 * @property {?CFGBlock} [cfg]
 * @property {function():string} [toString]
 */

/** */
class AST
{
    /**
     * @param {string} source
     * @param {object} options
     */
    constructor( source, options )
    {
        this.root = this.ast = espree.parse( source, options );

        this.nodesByIndex = [];
        this.functions    = [ get_from_function( this.ast ) ];

        let index = 0,
            labeled = [];

        this.traverse( ( node, parent ) => {
            this.nodesByIndex[ index ] = node;
            node.index                 = index++;
            node.parent                = parent;
            node.cfg                   = null;
            node.toString              = nodeString;
            node.level                 = 0;

            if ( node.type === Syntax.LabeledStatement ) labeled.push( node );

            if ( isBaseFunction( node ) )
                this.functions.push( get_from_function( node ) );

            if ( node.type === Syntax.BlockStatement && node.body.length === 0 )
            {
                node.body.push( {
                    type: Syntax.EmptyStatement,
                    loc: node.loc,
                    range: node.range
                } );
            }

        } );

        const [ , , lvls ] = _BFS( {
            start:      () => 0,
            successors: n => {
                let node  = this.nodesByIndex[ n ],
                    succs = [];

                VisitorKeys[ node.type ].forEach( k => {
                    const s = node[ k ];

                    if ( !s ) return;

                    if ( !array( s ) )
                        succs.push( s.index );
                    else
                        succs = succs.concat( s.map( sn => sn.index ) );
                } );

                return succs;
            }
        } );

        lvls.forEach( ( lvl, i ) => this.nodesByIndex[ i ].level = lvl );

        this.escope = escope.analyze( this.ast, {
            ecmaVersion: 6,
            sourceType:  options.sourceType,
            directive:   true
        } );

        this.associate = new Map();

        labeled.forEach( node => {
                let escope = this.node_to_scope( node ), // get_node( node.body ) ),
                    assoc  = this.associate.get( escope );

                if ( !assoc ) this.associate.set( escope, assoc = { labels: [] } );
                assoc.labels.push( {
                    label: node.label.name,
                    node:  node // get_node( node.body )
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
}

/**
 * @param {object} info
 */
function _BFS( info )
{
    const
        queue      = [],
        preNumber  = [],
        parents    = [],
        preOrder   = [],
        indexOrder = [],
        levels     = [];

    /**
     * @param {number} index
     * @returns {Array<Array<number>,Array<number>,Array<number>>}
     * @private
     */
    function __bfs( index )
    {
        queue.push( index );

        indexOrder[ index ] = preOrder.length;
        preOrder.push( index );

        parents[ index ] = levels[ index ] = 0;

        while ( queue.length )
        {
            let v    = queue.shift(),
                list = info.successors( v );

            list.forEach( w => {
                if ( typeof parents[ w ] !== 'number' )
                {
                    preNumber[ w ] = preOrder.length - 1;
                    preOrder.push( w );

                    parents[ w ] = v;
                    levels[ w ]  = levels[ v ] + 1;
                    queue.push( w );
                }
            } );
        }

        return [ indexOrder, preOrder, levels ];
    }

    return __bfs( info.start() );
}

module.exports = AST;
