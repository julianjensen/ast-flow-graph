/** ******************************************************************************************************************
 * @file Describe what ast does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    // _inspect                                     = require( 'util' ).inspect,
    // inspect                                      = ( o, d ) => _inspect( o, { depth: typeof d === 'number' ? d : 2, colors: true } ),
    {
        VisitorKeys,
        Syntax,
        checks: { isFunction }
    }                  = require( './defines' ),
    escope             = require( 'escope' ),
    { Scopes }         = require( './scopes' ),
    { traverse }       = require( 'estraverse' ),
    { parseModule }    = require( 'esprima' ),
    { isArray: array } = Array,
    nodeString         = function() {
        let keys = VisitorKeys[ this.type ].map( key => `${key}${array( this[ key ] ) ? '(' + this[ key ].length + ')' : ''}` ).join( ', ' );

        if ( keys ) keys = ': [' + keys + ']';

        return `${this.type}, lvl: ${this.level}, line ${this.loc && this.loc.start && this.loc.start.line}${keys}`;
    };

/**
 * @name ESTree
 * @alias Esprima
 */

/**
 * @typedef {Statement|Function|Expression|Pattern|Declaration} AnnotatedNode
 * @extends BaseNode
 * @extends Node
 * @extends VariableDeclarator
 * @extends Statement
 * @extends Declaration
 * @extends Pattern
 * @extends Expression
 * @extends Function
 * @implements ESTree.Node
 * @extends Esprima.Node
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
     * @param {boolean} [isModule=true]
     */
    constructor( source, isModule = true )
    {
        this.root = this.ast =
            parseModule( source,
                {
                    loc:   true,
                    range: true
                } );

        this.escope =
            escope.analyze( this.ast,
                {
                    ecmaVersion: 6,
                    sourceType:  isModule ? 'module' : 'script',
                    directive:   true
                } );

        this.associate = new Map();

        this.nodesByIndex = [];
        this.functions    = [ this.ast ];

        let index    = 0;
        //     topScope = {
        //         type:   isModule ? 'module' : 'script',
        //         ast:    this.ast,
        //         first:  0,
        //         last:   0,
        //         outer:  null,
        //         inner:  [],
        //         labels: []
        //     },
        //     scope    = topScope;
        //
        // this.ast.scope = topScope;

        this.traverse( ( node, parent ) => {
            this.nodesByIndex[ index ] = node;
            node.index                 = index++;
            node.parent                = parent;
            node.cfg                   = null;
            node.toString              = nodeString;
            node.level                 = 0;

            // if ( node.type !== Syntax.Program && createsScope.has( node.type ) )
            // {
            //     node.scope = {
            //         type:   Scopes.get_type( node.type ),
            //         ast:    node,
            //         first:  index - 1,
            //         last:   index - 1,
            //         outer:  scope,
            //         inner:  [],
            //         labels: []
            //     };
            //
            //     if ( node.parent && loopNode.has( node.parent.type ) && !node.parent.type.startsWith( 'For' ) )
            //         node.scope.type = 'loop';
            //
            //     scope.inner.push( node.scope );
            //     scope = node.scope;
            // }

            if ( node.type === Syntax.LabeledStatement )
            {
                // if ( scope.labels.includes( node.label ) )
                //     throw new SyntaxError( `Duplicate label definition of "${node.label}"` );
                // scope.labels.push( node.label );

                let escope = this.escope.acquire( node ),
                    assoc  = this.associate.get( escope );

                if ( !assoc ) this.associate.set( escope, assoc = { labels: [] } );
                assoc.labels.push( {
                    label: node.label,
                    node
                } );
            }

            if ( isFunction( node ) )
                this.functions.push( node );

        } );

        // this.scope = topScope;

        const [ io, po, lvls ] = _BFS( {
            start: () => 0,
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
        this.indexOrder  = io;
        this.bfsPreOrder = po;
    }

    *forFunctions()
    {
        yield *this.functions;
    }

    /**
     * @param {AnnotatedNode} node
     * @returns {*}
     */
    next_sibling( node )
    {
        return this.nodesByIndex[ this.bfsPreOrder[ this.indexOrder[ node.index ] ] ];
    }

    set_root( node )
    {
        this.root = node;
        return this;
    }

    reset_root()
    {
        this.root = this.ast;
        return this;
    }

    create_scopes()
    {
        const scopes = new Scopes( this.scope.type, this.scope.ast );


        function _make_scope( s )
        {
            const cur = scopes.push_scope( s.type, s.ast );
            cur.add_labels( ...s.labels );
            s.inner.forEach( _make_scope );
            scopes.pop_scope();
        }

        this.scope.inner.forEach( _make_scope );

        return scopes;
    }

    /**
     * @param {AnnotatedNode} start
     * @param {string} label
     * @return {?CFGBlock}
     */
    find_label( start, label )
    {
        let scope = this.escope.acquire( start );

        while ( scope )
        {
            const assoc = this.associate.get( scope );

            if ( assoc && assoc.labels )
            {
                const la = assoc.labels.find( la => la.label === label );
                if ( la ) return la.node.cfg || la.node;
            }

            scope = scope.outer;
        }

        return null;
    }

    /**
     * @param {Program|Node} [ast]
     * @return {*}
     */
    top( ast = this.ast )
    {
        return ast;
        // return { top: ast, start: ast.type === Syntax.Program ? ast : ( ast.body || ast.value ) };
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
            node = this.root;
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

    /**
     * @param {?(AnnotatedNode|Array<AnnotatedNode>)} node
     * @returns {Array<AnnotatedNode>}
     */
    nodelist( node )
    {
        if ( array( node ) ) return node;

        if ( !node ) return [];

        if ( VisitorKeys[ node.type ].includes( 'body' ) )
            return array( node.body ) ? node.body : node.body ? [ node.body ] : [];

        // console.warn( `Attempting to get a list of node but finding none: ${node}` );

        return [ node ];
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
