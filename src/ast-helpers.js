/** ******************************************************************************************************************
 * @file Miscellaneous function that take some of the nitty-gritty work out of the major functions.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 17-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    { Syntax } = require( 'espree' ),
    isBaseFunction = ( { type } ) => type === Syntax.FunctionDeclaration || type === Syntax.FunctionExpression || type === Syntax.ArrowFunctionExpression;

/**
 *
 * @param {?Array} arr
 * @param {Array} [result=[]]
 * @param {Boolean} [deep=true]
 * @return {Array}
 */
function flatten( arr, result = [], deep = true )
{
    if ( !Array.isArray( arr ) ) return [ arr ];

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

/**
 * @param {AssignmentPattern|Identifier|ObjectPattern|ArrayPattern|RestElement|MemberExpression} ap
 * @returns {string|string[]}
 */
function from_assignment_pattern( node )
{
    switch ( node.type )
    {
        case Syntax.Identifier:
            return node.name;

        case Syntax.ObjectPattern:
            return node.properties.map( assignProp => from_assignment_pattern( assignProp.value ) );

        case Syntax.ArrayPattern:
            return node.elements.map( n => from_assignment_pattern( n ) );

        case Syntax.RestElement:
            return from_assignment_pattern( node.argument );

        case Syntax.AssignmentPattern:
            return from_assignment_pattern( node.left );

        case Syntax.MemberExpression:
            return !node.computed && ( node.type === Syntax.ThisExpression || node.type === Syntax.Super ) && node.property.type === Syntax.Identifier ? node.property.name : null;
    }

}

/**
 * @param {AnnotatedNode|Pattern} node
 * @returns {Array<string>}
 */
function assignment( node )
{
    const
        lister = vars => flatten( from_assignment_pattern( vars ) ).filter( x => !!x ),
        out    = a => !a.length ? '[]' : `[ "${a.join( '", "' )}" ]`;

    switch ( node.type )
    {
        case Syntax.VariableDeclarator:
            // console.log( `${node}, vars: ${out( lister( node.id ) )}` );
            break;
        case Syntax.AssignmentPattern:
        case Syntax.AssignmentExpression:
            // console.log( `left: ${node.left.type}, ${node}, vars: ${out( lister( node.left ) )}` );
            break;
        case Syntax.UpdateExpression:
        case Syntax.UnaryExpression:
            // console.log( `${node}, vars: ${out( lister( node.argument ) )}` );
            break;
    }
    // return flatten( from_assignment_pattern( node ) );
}

/**
 * @param {Node} top
 * @return {*}
 */
function get_start_nodes( top )
{
    if ( top.type === Syntax.Program )
        return {
            type:  'program',
            start: top.body
        };
    else if ( top.type === Syntax.FunctionDeclaration )
        return {
            type:  'declaration',
            start: top.body
        };
    else if ( top.type === Syntax.FunctionExpression )
        return {
            type:  'expression',
            start: top.body
        };
    else if ( top.type === Syntax.MethodDefinition )
        return {
            type:  'method',
            start: top.value.body
        };
    else if ( top.type === Syntax.ArrowFunctionExpression )
        return {
            type:  'arrow',
            start: top.body
        };
    else
        throw new Error( `Don't know how to start: ${top.type}` );
}

/**
 * @param {FunctionDeclaration|FunctionExpression|MethodDefinition|ArrowFunctionExpression|Property|Node} node
 * @param {string} [whatToGet='all']
 * @return {Array<Node>|string|CFGInfo}
 */
function get_from_function( node, whatToGet = 'all' )
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
