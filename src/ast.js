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
        createsScope,
        loopNode
    }                  = require( './defines' ),
    escope             = require( 'escope' ),
    { Scopes }         = require( './scopes' ),
    { traverse }       = require( 'estraverse' ),
    { parseModule }    = require( 'esprima' ),
    { isArray: array } = Array,
    nodeString         = function() {
        let keys = VisitorKeys[ this.type ].map( key => `${key}${array( this[ key ] ) ? '(' + this[ key ].length + ')' : ''}` ).join( ', ' );

        if ( keys ) keys = ': [' + keys + ']';

        return `${this.type}, line ${this.loc && this.loc.start && this.loc.start.line}${keys}`;
    };

/** */
class AST
{
    /**
     * @param {string} source
     * @param {boolean} [isModule=true]
     */
    constructor( source, isModule = true )
    {
        this.ast = parseModule( source, { loc: true, range: true } );

        this.escope = escope.analyze( this.ast, { ecmaVersion: 6, sourceType: isModule ? 'module' : 'script', directive: true } );
        this.associate = new Map();

        let index    = 0,
            topScope = {
                type:   isModule ? 'module' : 'script',
                ast:    this.ast,
                first:  0,
                last:   0,
                outer:  null,
                inner:  [],
                labels: []
            },
            scope    = topScope;

        this.ast.scope = topScope;

        this.traverse( ( node, parent ) => {
            node.index    = index++;
            node.parent   = parent;
            node.block    = null;
            node.toString = nodeString;

            if ( node.type !== Syntax.Program && createsScope.has( node.type ) )
            {
                node.scope = {
                    type:   Scopes.get_type( node.type ),
                    ast:    node,
                    first:  index - 1,
                    last:   index - 1,
                    outer:  scope,
                    inner:  [],
                    labels: []
                };

                if ( node.parent && loopNode.has( node.parent.type ) && !node.parent.type.startsWith( 'For' ) )
                    node.scope.type = 'loop';

                scope.inner.push( node.scope );
                scope = node.scope;
            }

            if ( node.type === Syntax.LabeledStatement )
            {
                if ( scope.labels.includes( node.label ) )
                    throw new SyntaxError( `Duplicate label definition of "${node.label}"` );
                scope.labels.push( node.label );

                let escope = this.escope.acquire( node ),
                    assoc = this.associate.get( escope );

                if ( !assoc ) this.associate.set( escope, assoc = { labels: [] } );
                assoc.labels.push( { label: node.label, node } );
            }

        }, node => {
            if ( node.scope )
            {
                node.scope.last = index - 1;
                if ( !node.scope.outer )
                    console.log( `No outer scope:`, node.scope );
                scope = node.scope.outer;
            }
        } );

        this.scope = topScope;
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
     * @param {Node} start
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
                if ( la ) return la.node.cfg;
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
            ast   = this.ast;
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
        /**
         * @param {BaseNode|Array<Node>} node
         * @param {?(BaseNode|Node)} parent
         * @param {?Node} previous
         * @param {string} [field]
         * @param {number} [index]
         * @param {?Node} next
         * @private
         */
        function _walker( node, parent, previous, field, index, next )
        {
            if ( !node ) return;

            const
                isa = Array.isArray( node ),
                er  = !isa ? enter( node, parent, previous, field, index ) : true;

            if ( er !== false )
            {
                VisitorKeys[ node.type ].forEach( key => {
                    if ( Array.isArray( node[ key ] ) )
                    {
                        const arr = node[ key ];

                        arr.forEach( ( n, i ) => _walker( arr[ i ], node, i ? arr[ i - 1 ] : null, key, i, i === arr.length - 1 ? null : arr[ i + 1 ] ) );
                    }
                    else
                        _walker( node[ key ], node, null, key );
                } );
            }

            if ( !isa ) leave( node, parent, previous, field, index );
        }

        _walker( node || this.ast, null, null );
    }
}

module.exports = AST;
