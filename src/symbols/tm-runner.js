/** ******************************************************************************************************************
 * @file Runs a TextMate JSON file against a source file.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 13-Jan-2018
 *********************************************************************************************************************/
"use strict";

const
    EventEmitter = require( 'events' ).EventEmitter,
    symbolEmitter = new EventEmitter(),
    { array, func, deep_object_set: deepSet, obj } = require( '../utils' ),
    Registry = require( 'vscode-textmate' ).Registry,
    registry = new Registry(),
    grammar  = registry.loadGrammarFromPathSync( './data/TypeScript.tmLanguage.json' ),
    // grammar  = registry.loadGrammarFromPathSync( './javascript.tmbundle/Syntaxes/JavaScript.plist' ),
    fs = require( 'fs' ),
    // testSrc = fs.readFileSync( './data/lib.es6.d.ts', 'utf8' ),
    testSrc = fs.readFileSync( './data/lib.es6.d.ts', 'utf8' ),
    lineTokens = grammar.tokenizeLine( testSrc ),  // 'function add(a,b) { return a+b; }' );
    allKeys = {},
    scopeKeys = {},
    follows = {},
    visitors = {
        'meta.interface.ts': make_interface,
        'entity.name.type.interface.ts': interface_name,
        'meta.field.declaration.ts': add_field,
        'variable.object.property.ts': prop_name,
        'support.type.primitive.ts': add_type,
        'meta.type.parameters.ts': type_params,
        'entity.name.type.ts': type_name
    };

let lastStack = [],
    defs = [];

const
    current = () => defs[ defs.length - 1 ];

function stack( token )
{
    const scopes = token.scopes;

    if ( scopes.length < lastStack.length )
    {
        while ( lastStack.length > scopes.length )
        {
            const t = lastStack.pop();

            if ( visitors[ t ] )
                visitors[ t ]( 'close', lastStack.join( ':' ) + ':' + t );
        }
    }
    else
    {
        while ( lastStack.length < scopes.length )
        {
            const t = scopes[ lastStack.length ];

            lastStack.push( t );
            if ( visitors[ t ] )
                visitors[ t ]( 'open', testSrc.substring( token.startIndex, token.endIndex ), lastStack.join( ':' ) );
        }
    }
}


function sub_scopes( paths )
{
    paths.forEach( path => deepSet( scopeKeys, path.split( '.' ).reverse().join( '.' ), true ) );
}

function add_objects( paths, codeStr )
{
    const lastPath = paths[ paths.length - 1 ];

    if ( /^[\s\r\n]*$/.test( codeStr ) || /\bcomment\b/.test( lastPath ) || /^punctuation.terminator.statement.ts$/.test( lastPath ) || /^punctuation.definition.parameters.(?:begin|end).ts$/.test( lastPath ) ) return;
    const
        fo = paths.reduce( ( co, p ) => co[ p ] || ( co[ p ] = {} ), allKeys );

    const dest = fo._values || ( fo._values = [] );

    if ( !dest.includes( codeStr ) ) dest.push( codeStr );
}

let maxScopes = -Infinity,
    ms;

for ( let i = 0; i < lineTokens.tokens.length; i++ )
{
    const
        token = lineTokens.tokens[ i ];

    console.log( `[${token.startIndex}-${token.endIndex}] ${token.scopes.join( ' > ' )} => "${testSrc.substring( token.startIndex, token.endIndex ).replace( /\r/g, '\\r' ).replace( /\n/g, '\\n' )}"` );

    // stack( token );

    // if ( tokens.scopes.length > maxScopes )
    // {
    //     maxScopes = tokens.scopes.length;
    //     ms = tokens.scopes;
    // }
    //
    // let prev;
    //
    // for ( const scope of tokens.scopes )
    // {
    //     if ( /\bcomment\b/.test( scope ) || /^punctuation.terminator.statement.ts$/.test( scope ) ||
    //          /^punctuation.terminator.statement.ts$/.test( scope ) ||
    //          /^punctuation.definition.parameters.(?:begin|end).ts$/.test( scope ) ) continue;
    //
    //     if ( scope === 'source.ts' )
    //     {
    //         prev = scope;
    //         continue;
    //     }
    //
    //     if ( !follows[ prev ] ) follows[ prev ] = [];
    //     if ( !follows[ prev ].includes( scope ) ) follows[ prev ].push( scope );
    //     prev = scope;
    // }
    //
    // sub_scopes( tokens.scopes );
    // add_objects( tokens.scopes, testSrc.substring( tokens.startIndex, tokens.endIndex ) );
}

symbolEmitter.on( 'interface', intr => console.log( `interface ${intr.name} {\n    ${intr.properties.map( p => `${p.name}: ${p.type}` ).join( ';\n    ' )};\n};\n\n` ) );


function make_interface( event, _, path )
{
    if ( event === 'close' )
    {
        const int = defs.pop();
        symbolEmitter.emit( 'interface', int );
        // console.log( `interface ${int.name} {\n    ${int.properties.map( p => `${p.name}: ${p.type}` ).join( ';\n    ' )};\n};\n\n` );
        // console.log( `Closing interface: "${path}"\ninterface ${int.name} {\n    ${int.properties.map( p => `${p.name}: ${p.type}` ).join( ';\n    ' )};\n};\n\n` );
    }
    else
    {
        // console.log( `Opening interface: "${path}"` );
        defs.push( {
            type: 'interface',
            properties: [],
            typeParams: []
        } );
    }
}

function add_field( event )
{
    if ( event === 'close' )
    {
        const field = defs.pop();
        current().properties.push( field );
        symbolEmitter.emit( 'field', field );
    }
    else
    {
        defs.push( {
            name: null,
            modifiers: []
        } );
    }
}

function type_params( event )
{
    if ( event === 'close' )
    {
        const
            type = defs.pop(),
            c = current();

        c.typeParams.push( type );
        symbolEmitter.emit( 'typeparam', type );
    }
    else
    {
        defs.push( {
            name: null
        } );
    }
}

function type_name( event, name )
{
    if ( event === 'open' )
        current().name = name;
}

function interface_name( event, name, path )
{
    if ( event !== 'open' ) return;

    const c = current();

    c.name = name;

    // console.log( `Opening interface name "${name}" for path = "${path}"` );
}

function prop_name( event, name, path )
{
    if ( event !== 'open' ) return;

    const c = current();

    if ( !c.properties ) return;

    // console.log( `Opening prop name "${name}" for path = "${path}"` );
    c.properties.push( { name } );
}

function add_type( event, type, path )
{
    if ( event !== 'open' ) return;

    const c = current();

    if ( !c || !c.properties ) return;

    // console.log( `Opening prop type "${type}" for path = "${path}"` );
    c.properties[ c.properties.length - 1 ].type = type;
}

// console.log( JSON.stringify( { scopeKeys, allKeys, follows }, null, 4 ) );
// console.error( `maxScopes: ${maxScopes}` );
// console.error( ms.join( '\n' ) );
/*
-- FUNCTION
meta.function.ts
	storage.type.function.ts => "function"
	meta.definition.function.ts
		entity.name.function.ts => "name of function"
	meta.parameters.ts
		variable.parameter.ts => "name of parameter"
		meta.type.annotation.ts
			keyword.operator.type.annotation.ts => ":"
			support.type.primitive.ts => "type"
		keyword.operator.optional.ts => "?"
	meta.return.type.ts
		keyword.operator.type.annotation.ts => ":"
		support.type.primitive.ts => "type"

-- VAR
storage.modifier.ts => "declare"
meta.var.expr.ts
	storage.type.ts => "const"
	meta.var-single-variable.expr.ts
		meta.definition.variable.ts
			variable.other.readwrite.ts => "var name"
		meta.type.annotation.ts
			keyword.operator.type.annotation.ts => ":"
			support.type.primitive.ts => "type"

-- INTERFACE
meta.interface.ts
	storage.type.interface.ts => "interface"
	entity.name.type.interface.ts => "name of interface"
	meta.field.declaration.ts
		meta.definition.property.ts
			variable.object.property.ts => "name"
		keyword.operator.optional.ts => "?"
		meta.type.annotation.ts
			keyword.operator.type.annotation.ts => ":"
			support.type.primitive.ts => "type"
			meta.object.type.ts
				[meta.field.declaration.ts]
		storage.modifier.ts => "readonly"
	meta.method.declaration.ts
		keyword.operator.new.ts => "new"
		meta.return.type.ts
			keyword.operator.type.annotation.ts => ":"
			entity.name.type.ts => "name"
		meta.parameters.ts
			variable.parameter.ts => "name"
			keyword.operator.optional.ts
			meta.type.annotation.ts
				keyword.operator.type.annotation.ts => ":"
				support.type.primitive.ts => "name"
				string.quoted.double.ts => "name"
					punctuation.definition.string.begin.ts
					punctuation.definition.string.end.ts
				keyword.operator.type.ts => "|"
				[meta.object.type.ts]
				entity.name.type.ts
				meta.type.paren.cover.ts
					entity.name.type.ts => "name"
					keyword.operator.type.ts => "|"
					support.type.primitive.ts => "type"
				meta.type.tuple.ts
					meta.brace.square.ts
			punctuation.separator.parameter.ts
	storage.type.property.ts => "get"
	keyword.operator.ternary.ts => "?" | ":"
	meta.arrow.ts
		meta.return.type.arrow.ts
			keyword.operator.type.annotation.ts => ":"
 */

