/** ******************************************************************************************************************
 * @file Describe what defines does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 24-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    /**
     * @enum {string}
     */
    Syntax          = {
        AssignmentExpression:     'AssignmentExpression',
        AssignmentPattern:        'AssignmentPattern',
        ArrayExpression:          'ArrayExpression',
        ArrayPattern:             'ArrayPattern',
        ArrowFunctionExpression:  'ArrowFunctionExpression',
        AwaitExpression:          'AwaitExpression',
        BlockStatement:           'BlockStatement',
        BinaryExpression:         'BinaryExpression',
        BreakStatement:           'BreakStatement',
        CallExpression:           'CallExpression',
        CatchClause:              'CatchClause',
        ClassBody:                'ClassBody',
        ClassDeclaration:         'ClassDeclaration',
        ClassExpression:          'ClassExpression',
        ConditionalExpression:    'ConditionalExpression',
        ContinueStatement:        'ContinueStatement',
        Directive:                'Directive',                  // @todo Probably not right, possibly just a string literal
        DoWhileStatement:         'DoWhileStatement',
        DebuggerStatement:        'DebuggerStatement',
        EmptyStatement:           'EmptyStatement',
        ExportAllDeclaration:     'ExportAllDeclaration',
        ExportDefaultDeclaration: 'ExportDefaultDeclaration',
        ExportNamedDeclaration:   'ExportNamedDeclaration',
        ExportSpecifier:          'ExportSpecifier',
        ExpressionStatement:      'ExpressionStatement',
        ForStatement:             'ForStatement',
        ForOfStatement:           'ForOfStatement',
        ForInStatement:           'ForInStatement',
        FunctionDeclaration:      'FunctionDeclaration',
        FunctionExpression:       'FunctionExpression',
        Identifier:               'Identifier',
        IfStatement:              'IfStatement',
        Import:                   'Import',
        ImportDeclaration:        'ImportDeclaration',
        ImportDefaultSpecifier:   'ImportDefaultSpecifier',
        ImportNamespaceSpecifier: 'ImportNamespaceSpecifier',
        ImportSpecifier:          'ImportSpecifier',
        Literal:                  'Literal',
        LabeledStatement:         'LabeledStatement',
        LogicalExpression:        'LogicalExpression',
        MemberExpression:         'MemberExpression',
        MetaProperty:             'MetaProperty',
        MethodDefinition:         'MethodDefinition',
        NewExpression:            'NewExpression',
        ObjectExpression:         'ObjectExpression',
        ObjectPattern:            'ObjectPattern',
        Program:                  'Program',
        Property:                 'Property',
        RestElement:              'RestElement',
        ReturnStatement:          'ReturnStatement',
        SequenceExpression:       'SequenceExpression',
        SpreadElement:            'SpreadElement',
        Super:                    'Super',
        SwitchCase:               'SwitchCase',
        SwitchStatement:          'SwitchStatement',
        TaggedTemplateExpression: 'TaggedTemplateExpression',
        TemplateElement:          'TemplateElement',
        TemplateLiteral:          'TemplateLiteral',
        ThisExpression:           'ThisExpression',
        ThrowStatement:           'ThrowStatement',
        TryStatement:             'TryStatement',
        UnaryExpression:          'UnaryExpression',
        UpdateExpression:         'UpdateExpression',
        VariableDeclaration:      'VariableDeclaration',
        VariableDeclarator:       'VariableDeclarator',
        WhileStatement:           'WhileStatement',
        WithStatement:            'WithStatement',
        YieldExpression:          'YieldExpression'
    },
    fromKey         = key => key.type === Syntax.Identifier
        ? key.name
        : key.type === Syntax.MemberExpression && !key.computed && key.object.type === Syntax.Identifier && key.property.type === Syntax.Identifier
                                 ? `[${key.object.name}.${key.property.name}]`
                                 : 'anonymous',

    addsBlocks      = [
        Syntax.BlockStatement,
        Syntax.BreakStatement,
        Syntax.CatchClause,
        Syntax.ContinueStatement,
        Syntax.DoWhileStatement,
        Syntax.ForStatement,
        Syntax.ForInStatement,
        Syntax.ForOfStatement,
        Syntax.IfStatement,
        Syntax.LabeledStatement,
        Syntax.ReturnStatement,
        Syntax.SwitchCase,
        Syntax.SwitchStatement,
        Syntax.ThrowStatement,
        Syntax.TryStatement,
        Syntax.VariableDeclarator,
        Syntax.WhileStatement
    ],
    newGraphTypes   = [
        Syntax.ArrowFunctionExpression
    ],
    jumpTypes       = [
        Syntax.BreakStatement
    ],
    specialTypes    = {
        [ Syntax.ClassBody ]: node => add_entries( node, node.body )
    },
    VisitorKeys     = {
        AssignmentExpression:     [ 'left', 'right' ],
        AssignmentPattern:        [ 'left', 'right' ],
        ArrayExpression:          [ 'elements' ],
        ArrayPattern:             [ 'elements' ],
        ArrowFunctionExpression:  [ 'params', 'body' ],
        AwaitExpression:          [ 'argument' ],
        BlockStatement:           [ 'body' ],
        BinaryExpression:         [ 'left', 'right' ],
        BreakStatement:           [ 'label' ],
        CallExpression:           [ 'callee', 'arguments' ],
        CatchClause:              [ 'param', 'body' ],
        ClassBody:                [ 'body' ],
        ClassDeclaration:         [ 'id', 'superClass', 'body' ],
        ClassExpression:          [ 'id', 'superClass', 'body' ],
        ConditionalExpression:    [ 'test', 'consequent', 'alternate' ],
        ContinueStatement:        [ 'label' ],
        DoWhileStatement:         [ 'body', 'test' ],
        DebuggerStatement:        [],
        DirectiveStatement:       [],
        EmptyStatement:           [],
        ExportAllDeclaration:     [ 'source' ],
        ExportDefaultDeclaration: [ 'declaration' ],
        ExportNamedDeclaration:   [ 'declaration', 'specifiers', 'source' ],
        ExportSpecifier:          [ 'exported', 'local' ],
        ExpressionStatement:      [ 'expression' ],
        ForStatement:             [ 'init', 'test', 'update', 'body' ],
        ForInStatement:           [ 'left', 'right', 'body' ],
        ForOfStatement:           [ 'left', 'right', 'body' ],
        FunctionDeclaration:      [ 'id', 'params', 'body' ],
        FunctionExpression:       [ 'id', 'params', 'body' ],
        Identifier:               [],
        IfStatement:              [ 'test', 'consequent', 'alternate' ],
        ImportDeclaration:        [ 'specifiers', 'source' ],
        ImportDefaultSpecifier:   [ 'local' ],
        ImportNamespaceSpecifier: [ 'local' ],
        ImportSpecifier:          [ 'imported', 'local' ],
        Literal:                  [],
        LabeledStatement:         [ 'label', 'body' ],
        LogicalExpression:        [ 'left', 'right' ],
        MemberExpression:         [ 'object', 'property' ],
        MetaProperty:             [ 'meta', 'property' ],
        MethodDefinition:         [ 'key', 'value' ],
        ModuleSpecifier:          [],
        NewExpression:            [ 'callee', 'arguments' ],
        ObjectExpression:         [ 'properties' ],
        ObjectPattern:            [ 'properties' ],
        Program:                  [ 'body' ],
        Property:                 [ 'key', 'value' ],
        RestElement:              [ 'argument' ],
        ReturnStatement:          [ 'argument' ],
        SequenceExpression:       [ 'expressions' ],
        SpreadElement:            [ 'argument' ],
        Super:                    [],
        SwitchStatement:          [ 'discriminant', 'cases' ],
        SwitchCase:               [ 'test', 'consequent' ],
        TaggedTemplateExpression: [ 'tag', 'quasi' ],
        TemplateElement:          [],
        TemplateLiteral:          [ 'quasis', 'expressions' ],
        ThisExpression:           [],
        ThrowStatement:           [ 'argument' ],
        TryStatement:             [ 'block', 'handler', 'finalizer' ],
        UnaryExpression:          [ 'argument' ],
        UpdateExpression:         [ 'argument' ],
        VariableDeclaration:      [ 'declarations' ],
        VariableDeclarator:       [ 'id', 'init' ],
        WhileStatement:           [ 'test', 'body' ],
        WithStatement:            [ 'object', 'body' ],
        YieldExpression:          [ 'argument' ]
    },
    SpecialNodeType = {
        AsyncArrowFunctionExpression: Syntax.ArrowFunctionExpression,
        AsyncFunctionExpression:      Syntax.FunctionExpression,
        ComputedMemberExpression:     Syntax.MemberExpression,
        RegexLiteral:                 Syntax.Literal,
        StaticMemberExpression:       Syntax.MemberExpression,
        AsyncFunctionDeclaration:     Syntax.FunctionDeclaration
    },
    /** @enum {string} */
    OpType          = {
        JUMP:                      'JUMP',
        BRANCH:                    'BRANCH',
        SWITCH:                    'SWITCH',
        ENTRY_SWITCH:              'ENTRY_SWITCH',
        RETURN:                    'RETURN',
        TAIL_CALL:                 'TAIL_CALL',
        DIRECT_TAIL_CALL:          'DIRECT_TAIL_CALL',
        TAIL_CALL_VARARGS:         'TAIL_CALL_VARARGS',
        TAIL_CALL_FORWARD_VARARGS: 'TAIL_CALL_FORWARD_VARARGS',
        UNREACHABLE:               'UNREACHABLE',
        THROW:                     'THROW',
        THROW_STATIC_ERROR:        'THROW_STATIC_ERROR'
    },
    /*
     groupType       = {
     Expression:                   [
     Syntax.ArrayExpression,
     Syntax.ArrowFunctionExpression,
     Syntax.AssignmentExpression,
     SpecialNodeType.AsyncArrowFunctionExpression,
     Syntax.AsyncFunctionExpression,
     Syntax.AwaitExpression,
     Syntax.BinaryExpression,
     Syntax.CallExpression,
     Syntax.ClassExpression,
     SpecialNodeType.ComputedMemberExpression,
     Syntax.ConditionalExpression,
     Syntax.Identifier,
     Syntax.FunctionExpression,
     Syntax.Literal,
     Syntax.NewExpression,
     Syntax.ObjectExpression,
     SpecialNodeType.RegexLiteral,
     Syntax.SequenceExpression,
     Syntax.StaticMemberExpression,
     Syntax.TaggedTemplateExpression,
     Syntax.ThisExpression,
     Syntax.UnaryExpression,
     Syntax.UpdateExpression,
     Syntax.YieldExpression
     ],
     ArgumentListElement:          [
     groupType.Expression,
     Syntax.SpreadElement
     ],
     ArrayExpressionElement:       [
     groupType.Expression,
     Syntax.SpreadElement, null
     ],
     ArrayPatternElement:          [
     Syntax.AssignmentPattern,
     groupType.BindingIdentifier,
     groupType.BindingPattern,
     Syntax.RestElement, null
     ],
     BindingIdentifier:            [
     Syntax.Identifier
     ],
     BindingPattern:               [
     Syntax.ArrayPattern,
     Syntax.ObjectPattern
     ],
     Declaration:                  [
     Syntax.AsyncFunctionDeclaration,
     Syntax.ClassDeclaration,
     groupType.ExportDeclaration,
     Syntax.FunctionDeclaration,
     Syntax.ImportDeclaration,
     Syntax.VariableDeclaration
     ],
     ExportableDefaultDeclaration: [
     groupType.BindingIdentifier,
     groupType.BindingPattern,
     Syntax.ClassDeclaration,
     groupType.Expression,
     Syntax.FunctionDeclaration
     ],
     ExportableNamedDeclaration:   [
     Syntax.AsyncFunctionDeclaration,
     Syntax.ClassDeclaration,
     Syntax.FunctionDeclaration,
     Syntax.VariableDeclaration
     ],
     ExportDeclaration:            [
     Syntax.ExportAllDeclaration,
     Syntax.ExportDefaultDeclaration,
     Syntax.ExportNamedDeclaration
     ],
     FunctionParameter:            [
     Syntax.AssignmentPattern,
     groupType.BindingIdentifier,
     groupType.BindingPattern
     ],
     ImportDeclarationSpecifier:   [
     Syntax.ImportDefaultSpecifier,
     Syntax.ImportNamespaceSpecifier,
     Syntax.ImportSpecifier
     ],
     ObjectExpressionProperty:     [
     Syntax.Property,
     Syntax.SpreadElement
     ],
     ObjectPatternProperty:        [
     Syntax.Property,
     Syntax.RestElement
     ],
     Statement:                    [
     Syntax.AsyncFunctionDeclaration,
     Syntax.BreakStatement,
     Syntax.ContinueStatement,
     Syntax.DebuggerStatement,
     Syntax.DoWhileStatement,
     Syntax.EmptyStatement,
     Syntax.ExpressionStatement,
     Syntax.Directive,
     Syntax.ForStatement,
     Syntax.ForInStatement,
     Syntax.ForOfStatement,
     Syntax.FunctionDeclaration,
     Syntax.IfStatement,
     Syntax.ReturnStatement,
     Syntax.SwitchStatement,
     Syntax.ThrowStatement,
     Syntax.TryStatement,
     Syntax.VariableDeclaration,
     Syntax.WhileStatement,
     Syntax.WithStatement
     ],
     PropertyKey:                  [
     Syntax.Identifier,
     Syntax.Literal
     ],
     PropertyValue:                [
     Syntax.AssignmentPattern,
     Syntax.AsyncFunctionExpression,
     groupType.BindingIdentifier,
     groupType.BindingPattern,
     Syntax.FunctionExpression
     ],
     StatementListItem:            [
     groupType.Declaration,
     groupType.Statement
     ]
     },
     */
    ignoreTypes     = [ Syntax.ClassDeclaration, Syntax.ClassExpression, Syntax.FunctionDeclaration, Syntax.FunctionExpression, Syntax.ArrowFunctionExpression, Syntax.MethodDefinition ],
    exprTypes       = [ Syntax.Literal, Syntax.TemplateLiteral, Syntax.MetaProperty, Syntax.Identifier ],
    patternTypes    = [ Syntax.Identifier, Syntax.ObjectPattern, Syntax.ArrayPattern, Syntax.RestElement, Syntax.AssignmentPattern, Syntax.MemberExpression ],

    checks          = {
        isExpression:     ( { type } ) => type.endsWith( 'Expression' ) || exprTypes.includes( type ),
        isStatement:      ( { type } ) => type.endsWith( 'Statement' ) || type === 'Declaration',
        isDeclaration:    ( { type } ) => type === Syntax.FunctionDeclaration || type === Syntax.VariableDeclaration || type === Syntax.ClassDeclaration,
        isFunction:       ( { type } ) => type === Syntax.FunctionDeclaration || type === Syntax.FunctionExpression || type === Syntax.ArrowFunctionExpression || type === Syntax.MethodDefinition,
        isBaseFunction:   ( { type } ) => type === Syntax.FunctionDeclaration || type === Syntax.FunctionExpression || type === Syntax.ArrowFunctionExpression,
        isClass:          ( { type } ) => type === Syntax.ClassDeclaration || type === Syntax.ClassExpression,
        isCallsite:       ( { type } ) => type === Syntax.CallExpression || type === Syntax.NewExpression,
        isPattern:        ( { type } ) => patternTypes.includes( type ),
        isComplexPattern: ( { type } ) => type.endsWith( 'Pattern' ),
        isBlock:          ( { type } ) => type === Syntax.BlockStatement,

        hasBlockBody: ( { body } ) => body && ( body.type === Syntax.BlockStatement || body.type === Syntax.ClassBody ),

        catchClauseName: node => node.type === Syntax.CatchClause ? 'catch' : null,

        functionDeclarationName: node => {
            if ( node.type !== Syntax.FunctionDeclaration ) return null;

            return fromKey( node.id );
        },

        methodName: node => {
            if ( node.type !== Syntax.MethodDefinition && node.parent && node.parent.type === Syntax.MethodDefinition ) node = node.parent;

            if ( node.type !== Syntax.MethodDefinition ) return null;

            return fromKey( node.key );
        },

        functionExpressionName: node => {
            if ( node.type !== Syntax.FunctionExpression && node.type !== Syntax.ClassDeclaration && node.type !== Syntax.ClassExpression ) return null;

            if ( node.id ) return fromKey( node.id );

            if ( !node.parent ) return null;

            if ( node.parent.type === Syntax.VariableDeclarator && node.parent.init === node )
                return fromKey( node.parent.id );
            else if ( node.parent.type === Syntax.AssignmentExpression && node.parent.right === node )
                return fromKey( node.parent.left );
            else
                return null;
        },

        arrowFunctionExpressionName: null,
        functionName:                node => checks.functionDeclarationName( node ) || checks.methodName( node ) || checks.functionExpressionName( node ) || checks.arrowFunctionExpressionName( node ) || 'anonymous'
    },
    cfgBlocks       = new Set( [
            Syntax.BlockStatement,
            Syntax.BreakStatement,
            Syntax.CatchClause,
            Syntax.ContinueStatement,
            Syntax.DoWhileStatement,
            Syntax.ForStatement,
            Syntax.ForInStatement,
            Syntax.ForOfStatement,
            Syntax.IfStatement,
            Syntax.LabeledStatement,
            Syntax.ReturnStatement,
            Syntax.SwitchStatement,
            Syntax.SwitchCase,
            Syntax.ThrowStatement,
            Syntax.TryStatement,
            Syntax.WhileStatement,
            Syntax.ConditionalExpression
        ]
    ),
    causesUnreachable = new Set( [
        Syntax.ThrowStatement,
        Syntax.ContinueStatement,
        Syntax.BreakStatement
    ] ),
    createsScope = new Set( [
        Syntax.FunctionExpression,
        Syntax.FunctionDeclaration,
        Syntax.ArrowFunctionExpression,
        Syntax.MethodDefinition,
        Syntax.ClassDeclaration,
        Syntax.SwitchStatement,
        Syntax.CatchClause,
        Syntax.WithStatement,
        Syntax.ForStatement,
        Syntax.ForOfStatement,
        Syntax.ForInStatement,
        Syntax.BlockStatement,
        Syntax.Program
    ] ),
    mayHaveName = new Set( [
        Syntax.FunctionExpression,
        Syntax.FunctionDeclaration,
        Syntax.ArrowFunctionExpression,
        Syntax.MethodDefinition,
        Syntax.ClassDeclaration,
        Syntax.VariableDeclarator
    ] ),
    loopNode = new Set( [
        Syntax.ForInStatement,
        Syntax.ForOfStatement,
        Syntax.ForStatement,
        Syntax.DoWhileStatement,
        Syntax.WhileStatement
    ] );

checks.arrowFunctionExpressionName = checks.functionExpressionName;

module.exports = { ignoreTypes, exprTypes, patternTypes, checks, Syntax, VisitorKeys, cfgBlocks, causesUnreachable, createsScope, mayHaveName, loopNode };
