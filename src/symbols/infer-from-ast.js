/** ******************************************************************************************************************
 * @file Describe what infer-from-ast does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 15-Jan-2018
 *********************************************************************************************************************/
"use strict";

const
    { Syntax } = require( 'estraverse' );

/**
 * @param {string} op
 * @param {AnnotatedNode} node
 * @return {string}
 */
function type_from_binary_expression( op, node )
{
    return '';
}

function type_from_object_property( obj, propName )
{
    return '';
}


function _get_type_from( node, typer )
{
    return type_by_ast( node, typer );
}

let get_type_from;

/**
 * @param {AnnotatedNode|BaseNode|Node} node
 */
function type_by_ast( node )
{
    const p = node.parent;

    switch ( p.type )
    {
        case Syntax.AssignmentExpression:
            if ( node.field === 'right' )
                return type_by_ast( node.field === 'right' ? p.left : p.right );
            break;

        case Syntax.ArrayExpression:
            return type_by_ast( p.elements[ node.fieldIndex ] );

        case Syntax.AwaitExpression:
            return 'Promise';

        case Syntax.BinaryExpression:
            return type_from_binary_expression( p.operator, node.field === 'right' ? p.left : p.right );

        case Syntax.BreakStatement:
            return 'label_reference';

        case Syntax.CallExpression:
            break;
        case Syntax.CatchClause: break;
        case Syntax.ClassBody: break;
        case Syntax.ClassDeclaration: break;
        case Syntax.ClassExpression: break;
        case Syntax.ConditionalExpression: break;
        case Syntax.ContinueStatement: break;
        case Syntax.DebuggerStatement: break;
        case Syntax.DoWhileStatement: break;
        case Syntax.EmptyStatement: break;
        case Syntax.ExportAllDeclaration: break;
        case Syntax.ExportDefaultDeclaration: break;
        case Syntax.ExportNamedDeclaration: break;
        case Syntax.ExportSpecifier: break;
        case Syntax.ExpressionStatement: break;
        case Syntax.ForStatement: break;
        case Syntax.ForInStatement: break;
        case Syntax.ForOfStatement: break;
        case Syntax.FunctionDeclaration: break;
        case Syntax.FunctionExpression: break;
        case Syntax.GeneratorExpression: break;
        case Syntax.Identifier: break;
        case Syntax.IfStatement: break;
        case Syntax.ImportDeclaration: break;
        case Syntax.ImportDefaultSpecifier: break;
        case Syntax.ImportNamespaceSpecifier: break;
        case Syntax.ImportSpecifier: break;
        case Syntax.Literal: break;
        case Syntax.LabeledStatement: break;
        case Syntax.LogicalExpression: break;
        case Syntax.MemberExpression:
            if ( node.field === 'object' )
            {
                let propType = type_by_ast( p.property );

                if ( p.computed )
                {
                    if ( propType === 'Number' )
                        return 'Array';
                    else if ( propType === 'String' )
                        return 'Object';
                }
                else
                {
                    if ( propType === 'string' )
                        return 'Object';
                }
            }
            else
            {
                let objType = type_by_ast( p.object );

                return type_from_object_property( objType, node.name );
            }
            break;
        case Syntax.MetaProperty: break;
        case Syntax.MethodDefinition: break;
        case Syntax.ModuleSpecifier: break;
        case Syntax.NewExpression: break;
        case Syntax.ObjectExpression: break;
        case Syntax.ObjectPattern: break;
        case Syntax.Program: break;
        case Syntax.Property: break;
        case Syntax.RestElement: break;
        case Syntax.ReturnStatement: break;
        case Syntax.SequenceExpression: break;
        case Syntax.SpreadElement:
            return 'Iterable';

        case Syntax.Super: break;
        case Syntax.SwitchStatement: break;
        case Syntax.SwitchCase: break;
        case Syntax.TaggedTemplateExpression: break;
        case Syntax.TemplateElement: break;
        case Syntax.TemplateLiteral: break;
        case Syntax.ThisExpression: break;
        case Syntax.ThrowStatement: break;
        case Syntax.TryStatement: break;
        case Syntax.UnaryExpression: break;
        case Syntax.UpdateExpression: break;
        case Syntax.VariableDeclaration: break;
        case Syntax.VariableDeclarator: break;
        case Syntax.WhileStatement: break;
        case Syntax.WithStatement: break;
        case Syntax.YieldExpression: break;

        case Syntax.ArrayPattern:
            break;
        case Syntax.AssignmentPattern:
            break;

        // case Syntax.ArrowFunctionExpression:
        // case Syntax.BlockStatement:
        default:

            break;
    }
}

