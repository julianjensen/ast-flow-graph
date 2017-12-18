/** ******************************************************************************************************************
 * @file Miscellaneous function that take some of the nitty-gritty work out of the major functions.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 17-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    { Syntax, checks } = require( '../defines' );

/**
 *
 * @param {?Array} arr
 * @param {Array} [result=[]]
 * @param {Boolean} [deep=true]
 * @return {Array}
 */
function flatten( arr, result = [], deep = true )
{
    const
        length = arr && arr.length;

    if ( !length ) return result;

    let index = -1;

    while ( ++index < length )
    {
        const value = arr[ index ];

        if ( Array.isArray( value ) )
        {
            if ( deep )
                flatten( value, result, true );
            else
                result.push( ...value );
        }
        else
            result[ result.length ] = value;
    }

    return result;
}

function from_assignment_pattern( ap )
{
    const
        node = ap.left;

    switch ( node.type )
    {
        case Syntax.Identifier:
            return node.name;

        case Syntax.ObjectPattern:
            return node.properties.map( assignProp => from_assignment_pattern( assignProp.value ) );

        case Syntax.ArrayPattern:
            return node.elements.map( from_assignment_pattern );

        case Syntax.RestElement:
            return from_assignment_pattern( node.argument );

        case Syntax.AssignmentPattern:
            return from_assignment_pattern( node );

        case Syntax.MemberExpression:
            return !node.computed && ( node.type === Syntax.ThisExpression || node.type === Syntax.Super ) && node.property.type === Syntax.Identifier ? node.property.name : null;
    }

}

function assignment( node )
{
    return flatten( from_assignment_pattern( node ) );
}

/**
 * @param {Node} top
 * @return {*}
 */
function get_start_nodes( top )
{
    if ( top.type === Syntax.Program )
        return { type: 'program', start: top.body };
    else if ( top.type === Syntax.FunctionDeclaration )
        return { type: 'declaration', start: top.body };
    else if ( top.type === Syntax.FunctionExpression )
        return { type: 'expression', start: top.body };
    else if ( top.type === Syntax.MethodDefinition )
        return { type: 'method', start: top.value.body };
    else if ( top.type === Syntax.ArrowFunctionExpression )
        return { type: 'arrow', start: top.body };
    else
        throw new Error( `Don't know how to start: ${top.type}` );
}

/**
 * @param {FunctionDeclaration|FunctionExpression|MethodDefinition|ArrowFunctionExpression|Property|Node} node
 * @param {string} [whatToGet='all']
 * @return {Array<Node>|string|{name:string,node:Array<Node>,body:Array<Node>}}
 */
function get_from_function( node, whatToGet = 'all' )
{
    const
        hopeForName = n => {
            if ( n.type === Syntax.Identifier )
                return n.name;
            else if ( n.type === Syntax.MemberExpression )
            {
                if ( !n.computed || n.object.type !== Syntax.Identifier || n.property.type !== Syntax.Identifier ) return null;
                if ( n.object.name !== 'Symbol' && n.object.name !== 'super' ) return null;

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
                return hopeForName( n.id )
            else if ( n.parent.type === Syntax.Property )
                return hopeForName( n.parent.key );

            return null;
        };

    if ( node.type === Syntax.Property || node.type === Syntax.MethodDefinition )
        return get_from_function( node.value, whatToGet );
    else if ( !checks.isBaseFunction( node ) )
        throw new SyntaxError( `No function found near ${node.type}, unable to find ${whatToGet}` );

    return whatToGet === 'name'
        ? hopeForName( node )
        : whatToGet === 'params'
               ? node.params
               : whatToGet === 'body'
              ? node.body
              : { name: hopeForName( node ), params: node.params, body: node.body };
}

module.exports = {
    assignment,
    get_start_nodes,
    get_from_function
};
