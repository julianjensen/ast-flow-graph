/** ******************************************************************************************************************
 * @file Describe what type-helpers does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 15-Jan-2018
 *********************************************************************************************************************/
"use strict";

const
    { Syntax } = require( 'estraverse' );

/**
 * @type {Array<IdentifierContext>}
 */
let contexts = [];

/**
 * @typedef {object} IdentifierContext
 * @property {string} type
 * @property {AnnotatedNode} node
 * @property {boolean|number} [isArrayElement]
 * @property {boolean|number} [isParameter]
 */
/**
 * @param node
 */
function this_context_from_me( node )
{

}

function super_context_from_me( node )
{

}

function super_context( node )
{

}

function is_base_object( node )
{
    return node.field === 'object' && node.parent.type !== Syntax.MemberExpression;
}

function current_context()
{
    return contexts[ contexts.length - 1 ];
}

function push_context( type, node )
{
    contexts.push( { type, node } );
}

function pop_context()
{
    contexts.pop();
}

function annotate_identifier( node )
{
    node.contexts = contexts.map( c => Object.assign( {}, c ) );
}

function exit_context( node, parent, field )
{
    switch ( node.type )
    {
        case Syntax.AssignmentPattern:
            if ( /Function/.test( parent.type ) && field === 'params' )
                pop_context();
            break;

        case Syntax.FunctionExpression:
            if ( parent.type === Syntax.MethodDefinition ) break;
        case Syntax.FunctionDeclaration:
        case Syntax.CatchClause:
        case Syntax.ClassExpression:
        case Syntax.ClassDeclaration:
        case Syntax.ImportDeclaration:
        case Syntax.ObjectExpression:
        case Syntax.Program:
        case Syntax.SwitchStatement:
        case Syntax.WithStatement:
        case Syntax.BlockStatement:
            pop_context();
            break;
    }
}

function enter_context( node, parent, field )
{
    let ctx;

    switch ( node.type )
    {
        case Syntax.ArrayExpression:
            ctx = current_context();
            ctx.isArrayElement = -~ctx.isArrayElement;
            break;

        case Syntax.AssignmentPattern:
            if ( /Function/.test( parent.type ) && field === 'params' )
                push_context( 'param', node );
            break;

        case Syntax.CatchClause:
            push_context( 'catch', node );
            break;

        case Syntax.ClassExpression:
        case Syntax.ClassDeclaration:
            push_context( 'lexical-class', node );
            break;

        case Syntax.FunctionExpression:
            if ( parent.type === Syntax.MethodDefinition ) break;

        case Syntax.FunctionDeclaration:
            push_context( 'function', node );
            break;

        case Syntax.Identifier:
            if ( /Function/.test( parent.type ) && field === 'params' )
            {
                ctx = current_context();
                ctx.functionParam = -~ctx.functionParam;
                annotate_identifier( node );
                --ctx.functionParam;
            }
            // Do we care about `computed`?
            else if ( parent.type === Syntax.MemberExpression )
            {
                if ( is_base_object( node ) )
                    annotate_identifier( node );
                else
                    node.contexts = parent.object;
            }
            break;
        case Syntax.ImportDeclaration:
            push_context( 'import-decl', node );
            break;
        case Syntax.ImportDefaultSpecifier:
            // @todo This will add another symbol in this module, possibly with a new name from `node.local`
            break;
        case Syntax.ImportNamespaceSpecifier:
            // @todo Figure this out.
            break;
        case Syntax.ImportSpecifier:
            // @todo This will add another symbol in this module with a name in `node.imported`
            break;
        case Syntax.MetaProperty:
            // @todo Figure this out.
            break;

        case Syntax.ObjectExpression:
            push_context( 'lexical-object', node );
            break;

        case Syntax.Program:
            push_context( 'module', node ); // Check for script
            break;

        case Syntax.SwitchStatement:
            push_context( 'lexical-switch', node );
            break;

        case Syntax.WithStatement:
            push_context( 'with-dynamic', node.object );
            break;

        case Syntax.BlockStatement:
            push_context( 'lexical-block', node );
            break;
    }
}


