/** ******************************************************************************************************************
 * @file Miscellaneous function that take some of the nitty-gritty work out of the major functions.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 17-Dec-2017
 *********************************************************************************************************************/
"use strict";

import assert from 'assert';
import { Syntax } from 'espree';
import { flatten } from './utils';
// const
//     assert         = require( 'assert' ),
//     { Syntax }     = require( 'espree' ),
//     { flatten }    = require( './utils' ),
const circ           = { prop: () => circ, index: () => circ, assign: () => circ };

export const isBaseFunction = ( { type } ) => type === Syntax.FunctionDeclaration || type === Syntax.FunctionExpression || type === Syntax.ArrowFunctionExpression;

    /**
 * @param {AnnotatedNode|BaseNode|Node} node
 * @return {*}
 */
function is_constant_expr( node )
{
    let l,
        r,
        sneaky = str => {
            try
            {
                return ( () => {} ).constructor( 'return ' + str )();
            }
            catch ( err )
            {
                return void 0;
            }
        };

    switch ( node.type )
    {
        case Syntax.Literal:
            return node.value;

        case Syntax.Identifier:
            return node.name === 'Symbol' ? 'Symbol' : void 0;

        case Syntax.BinaryExpression:
            l = is_constant_expr( node.left );
            r = is_constant_expr( node.right );
            if ( l === void 0 || r === void 0 ) return void 0;
            return sneaky( l + node.operator + r );

        case Syntax.AssignmentExpression:
            throw new Error( `Dude, fix this` );
            assignment( node, node.cfg );
            return is_constant_expr( node.right );

        case Syntax.MemberExpression:
            l = is_constant_expr( node.object );
            r = is_constant_expr( node.property );
            if ( l === void 0 || r === void 0 ) return void 0;
            return l + '.' + r;

        case Syntax.ConditionalExpression:
            l = is_constant_expr( node.test );
            if ( l === void 0 )
            {
                l       = is_constant_expr( node.consequent );
                r       = is_constant_expr( node.alternate );
                let res = [];
                if ( l ) res.push( l );
                if ( r ) res.push( r );
                return res.length ? res : void 0;
            }
            if ( l ) return is_constant_expr( node.consequent );
            return is_constant_expr( node.alternate );

        case Syntax.SequenceExpression:
            return node.expressions.reduce( ( _, expr ) => is_constant_expr( expr ) );

        case Syntax.TemplateLiteral:
            let exprs = node.expressions.map( is_constant_expr );
            if ( exprs.some( x => x === void 0 ) ) return void 0;
            return node.quasis[ 0 ].value.cooked + exprs.map( ( x, i ) => x + node.quasis[ i + 1 ].value.cooked ).join( '' );
    }
}

/**
 * @param {AssignmentPattern|Identifier|ObjectPattern|ArrayPattern|RestElement|MemberExpression|Expression|AnnotatedNode|Property} node
 * @param {string} type
 * @param {object} rhs
 * @return {VarAccess|VarAccess[]}
 */
function from_assignment_pattern( node, type, rhs )
{
    const
        objectName = me => me.object.type === Syntax.ThisExpression ? 'this' : me.object.type === Syntax.Super ? 'super' : me.object.type === Syntax.Identifier ? me.object.name : void 0,
        qt         = ( name, preName ) => {

            return preName ? { type, names: [ preName, name ], index: node.index } : { type, names: [ name ], index: node.index };
        };

    switch ( node.type )
    {
        case Syntax.Identifier:
            rhs.assign();
            return qt( node.name );

        case Syntax.ObjectPattern:
            return node.properties.map( assignProp => from_assignment_pattern( assignProp, type, rhs ) );

        case Syntax.Property:
            rhs = rhs.prop( node.key );
            return from_assignment_pattern( node.value, type, rhs );

        case Syntax.ArrayPattern:
            rhs.assign();
            return node.elements.map( ( n, i ) => {
                rhs.index( i ).assign();
                return from_assignment_pattern( n, type, rhs );
            } );

        case "ExperimentalRestProperty":
        case "ExperimentalSpreadProperty":
            return from_assignment_pattern( node.argument, type, rhs );

        case Syntax.RestElement:
            return from_assignment_pattern( node.argument, type, rhs );

        case Syntax.AssignmentPattern:
            return from_assignment_pattern( node.left, type, rhs );

        case Syntax.MemberExpression:
            let con = is_constant_expr( node );
            if ( con !== void 0 )
            {
                rhs.assign();
                return qt( con );
            }

            let base = objectName( node );

            if ( base && !node.computed )
            {
                rhs.assign();
                return qt( node.property.name, base );
            }

            if ( node.computed ) return void 0;

            if ( node.object.type === Syntax.Identifier && node.property.type === Syntax.Identifier )
            {
                rhs.assign();
                return qt( node.property.name, node.object.name );
            }

            return void 0;
    }
}

function all_non_computed_members( node )
{
    if ( node.computed )
    {
        if ( node.object.type === Syntax.Identifier )
            return [ node.object.name ];

        return [];
    }

    if ( node.object.type === Syntax.Identifier && node.property.type === Syntax.Identifier )
        return [ node.object.name, node.property.name ];

    if ( node.object.type === Syntax.MemberExpression )
        return [ ...all_non_computed_members( node.object ), node.property.name ];

    return [];
}

function rhs( block, start )
{
    if ( !start || ![ Syntax.Identifier, Syntax.ObjectExpression, Syntax.ArrayExpression, Syntax.MemberExpression ].includes( start.type ) )
        return circ;

    const
        isId = start.type === Syntax.Identifier;

    let baseName = isId ? start.name : 'anonymous';

    if ( isId )
        return rhs_tracker( isId ? [ baseName ] : [], start );
    else if ( start.type === Syntax.MemberExpression )
        return rhs_tracker( all_non_computed_members( start ), start );
    else
        return rhs_tracker( [], start );


    function rhs_tracker( _nameChain, current )
    {
        const nameChain = _nameChain.slice();

        function prop( name )
        {
            if ( typeof name !== 'string' ) name = name.name;

            if ( !isId && current && current.type === Syntax.ObjectExpression )
            {
                let p = current.properties.find( _p => _p.type === Syntax.Property && _p.key.type === Syntax.Identifier && _p.key.name === name );

                return rhs_tracker( [ ...nameChain, name ], p );
            }

            return rhs_tracker( [ ...nameChain, name ], current );
        }

        function index( num )
        {
            if ( !isId && current && current.type === Syntax.ArrayExpression )
            {
                if ( num >= current.elements.length )
                    return rhs_tracker( [ ...nameChain, num ], current );

                return rhs_tracker( [ ...nameChain, num ], current.elements[ num ] );
            }

            return rhs_tracker( [ ...nameChain, num ], current );
        }

        function assign()
        {
            if ( !nameChain.length ) return;

            use_one_var( block, { type: 'use', names: nameChain, index: current.index } );
        }

        return { prop, index, assign };
    }
}

function declarator( ast, block, node, recurse )
{
    let _rhs,
        lhs,
        rhsFunc = circ;

    if ( node.id.type === Syntax.ObjectPattern || node.id.type === Syntax.ArrayPattern )
    {
        rhsFunc = rhs( block, node.init );
        lhs     = from_assignment_pattern( node.id, 'def', rhsFunc );

        determine_read_write( block, lhs, void 0, true );

        if ( rhsFunc === circ ) ast.call_visitors( node.init, recurse );

        return;
    }

    lhs = from_assignment_pattern( node.id, 'def', rhsFunc );
    determine_read_write( block, lhs, void 0, true );

    if ( node.init )
    {
        _rhs = from_assignment_pattern( node.init, 'use', rhsFunc );
        determine_read_write( block, _rhs );
    }
}

function assignment_node( ast, block, node, recurse )
{
    let lhs;

    lhs = from_assignment_pattern( node.left, 'def', circ );
    if ( node.operator !== '=' )
        determine_read_write( block, lhs, lhs );
    else
        determine_read_write( block, lhs );

    ast.call_visitors( node.right, recurse );
}

/**
 * @param {AST} ast
 * @param {CFGBlock} block
 * @param {AnnotatedNode|Pattern|VariableDeclarator|AssignmentExpression|AssignmentPattern|UpdateExpression} node
 * @param {function} recurse
 */
export function assignment( ast, block, node, recurse )
{
    let lhs;

    switch ( node.type )
    {
        case Syntax.VariableDeclaration:
            node.declarations.forEach( decl => assignment( ast, block, decl, recurse ) );
            break;

        case Syntax.ExpressionStatement:
            assignment( ast, block, node.expression, recurse );
            break;

        case Syntax.VariableDeclarator:
            return declarator( ast, block, node, recurse );

        case Syntax.AssignmentPattern:
        case Syntax.AssignmentExpression:
            return assignment_node( ast, block, node, recurse );

        case Syntax.UpdateExpression:
            lhs       = from_assignment_pattern( node.argument, 'def', circ );
            let self  = Object.assign( {}, lhs );
            self.type = 'use';
            determine_read_write( block, self );
            determine_read_write( block, lhs );
            break;

        case Syntax.Identifier:
            let varType = /Function/.test( node.parent.type ) ? 'def' : 'use';
            determine_read_write( block, { type: varType, names: [ node.name ], index: node.index }, void 0, varType === 'def' );
            break;

        case Syntax.MemberExpression:
            lhs = from_assignment_pattern( node, 'use', circ );
            determine_read_write( block, lhs );
            break;

        default:
            if ( !/Function|Class/.test( node.type ) )
                ast.call_visitors( node, recurse );
            break;

    }
}

/**
 * @param {CFGBlock} block
 * @param {VarAccess|VarAccess[]} lhs
 * @param {VarAccess|VarAccess[]} [rhs]
 * @param {boolean} [isDecl=false]
 */
function determine_read_write( block, lhs, rhs, isDecl )
{
    let impliedRead = lhs === rhs;

    if ( impliedRead ) rhs = void 0;

    if ( lhs ) lhs = flatten( lhs );
    if ( rhs ) rhs = flatten( rhs );

    const
        def      = va => def_one_var( block, va, isDecl ),
        use      = va => use_one_var( block, va ),
        forceUse = va => use_one_var( block, va, true ),
        mark     = ( va, fn ) => {
            if ( Array.isArray( va ) )
                va.forEach( fn );
            else if ( va )
                fn( va );
        };

    if ( impliedRead )
        mark( lhs, forceUse );

    mark( lhs, def );
    mark( rhs, use );
}

function use_one_var( block, va, force )
{
    if ( !force && va.type === 'def' ) return def_one_var( block, va );

    const
        useNames = va.names;

    if ( useNames.length > 1 )
    {
        let preNames = '';

        for ( let i = 0; i < useNames.length; i++ )
        {
            if ( !i )
                preNames = useNames[ i ];
            else
                useNames[ i ] = preNames = preNames + '.' + useNames[ i ];
        }
    }

    for ( const name of useNames )
        add_to_block( block, name, 'use', va.index, false, name !== useNames[ useNames.length - 1 ], name === useNames[ useNames.length - 1 ] );
}

function def_one_var( block, va, isDecl )
{
    if ( va.type === 'use' ) return use_one_var( block, va );

    const
        defName  = va.names.pop(),
        useNames = va.names;

    if ( useNames.length )
    {
        let preNames = '';

        for ( let i = 0; i < useNames.length; i++ )
        {
            if ( !i )
                preNames = useNames[ i ];
            else
                useNames[ i ] = preNames = preNames + '.' + useNames[ i ];
        }
    }

    for ( const name of useNames )
    {
        assert( !isDecl, `Should not be a declaration for properties: ${useNames.join( '.' ) + '.' + defName}` );
        add_to_block( block, name, 'use', va.index, false, true, false );
    }

    add_to_block( block, useNames.length ? useNames[ useNames.length - 1 ] + '.' + defName : defName, 'def', va.index, isDecl, false, true );
}

/**
 * @param {CFGBlock} block
 * @param {string} name
 * @param {string} type
 * @param {number} index
 * @param {boolean} isDecl
 * @param {boolean} implied
 * @param {boolean} renameTarget
 */
function add_to_block( block, name, type, index, isDecl, implied, renameTarget ) // eslint-disable-line max-params
{
    block.add_var( name, type, index, isDecl, implied, renameTarget );
}

/**
 * @param {FunctionDeclaration|FunctionExpression|MethodDefinition|ArrowFunctionExpression|Property|Node} node
 * @param {string} [whatToGet='all']
 * @return {Array<Node>|string|CFGInfo}
 */
export function get_from_function( node, whatToGet = 'all' )
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
        return get_from_function( node.value, whatToGet );
    else if ( !isBaseFunction( node ) )
        throw new SyntaxError( `No function found near ${node.type}, unable to find ${whatToGet}` );

    return grab_info();

    /**
     * @param {AnnotatedNode|BaseFunction|MethodDefinition|Program} node
     * @returns {?(AnnotatedNode|Array<AnnotatedNode>)}
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

module.exports = {
    assignment,
    isBaseFunction,
    get_from_function
};
