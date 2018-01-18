/** ******************************************************************************************************************
 * @file Describe what ast-test does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 17-Jan-2018
 *********************************************************************************************************************/
"use strict";

import { expect } from 'chai';
import fs         from 'fs';
import AST        from '../src/ast';
import { traverse, VisitorOption, Syntax } from 'estraverse';
const
    src = fs.readFileSync( './test-data/cfg-test-01.js', 'utf8' ),
    src2 = fs.readFileSync( './test-data/cfg-test-02.js', 'utf8' );

let ast, ast2, root, root2;

const
    findType = ( t, r ) => {
        let found;

        traverse( r || root, {
            enter( node ) {
                if ( node.type === t )
                {
                    found = node;
                    return VisitorOption.Break;
                }
            }
        } );

        return found;
    };

describe( 'AST', function() {

    it( 'should compile a source module', () => {
        ast = new AST( src, {
            loc:          true,
            range:        true,
            comment:      true,
            tokens:       true,
            ecmaVersion:  9,
            sourceType:   'module',
            ecmaFeatures: {
                impliedStrict:                true,
                experimentalObjectRestSpread: true
            }
        } );

        root = ast.ast;

        ast2 = new AST( src2, {
            loc:          true,
            range:        true,
            comment:      true,
            tokens:       true,
            ecmaVersion:  9,
            sourceType:   'module',
            ecmaFeatures: {
                impliedStrict:                true,
                experimentalObjectRestSpread: true
            }
        } );

        root2 = ast2.ast;

        expect( ast ).to.be.instanceof( AST );
        expect( ast.ast ).to.be.an( 'object' );
        expect( ast.ast ).to.have.property( 'type', Syntax.Program );
    } );

    it( 'should display a node as a string', () => {
        const str = `${root}`;

        expect( str ).to.be.a( 'string' );
        expect( str ).to.eql( 'Program, lvl: 0, line 7: [body(7)]' );
    } );

    it( 'should get function information', () => {

        const
            fnames = ast.functions.map( f => ( { name: f.name, node: f.node } ) ),
            a02 = fnames.find( n => n.name === 'a02' ),
            a03 = fnames.find( n => n.name === 'a03' );

        expect( fnames ).to.be.an( 'array' );
        expect( fnames ).to.have.length( 7 );

        expect( ast.get_from_function( a02.node, 'name' ) ).to.eql( 'a02' );
        expect( ast.get_from_function( a03.node, 'params' ) ).to.be.an( 'array' );
        expect( ast.get_from_function( a03.node, 'body' ) ).to.be.an( 'array' );
        expect( ast.get_from_function( a03.node, 'lines' ) ).to.eql( [ 16, 19 ] );
    } );

    it( 'should do various utility functions', () => {
        const
            fe = findType( Syntax.AssignmentExpression, root2 ),
            className = findType( Syntax.ClassDeclaration, root2 ),
            lr = {};
        // console.log( Object.keys( node ).map( k => `${k} => ${typeof node[ k ] === 'string' ? `"${node[ k ]}"` : ( node[ k ] + '' )}` + ( k === 'loc' ? JSON.stringify( node[ k ] ) : '' ) ) );

        ast.call_visitors( fe, node => {
            expect( node ).to.have.property( 'parent', fe );
            if ( fe.left === node )
            {
                lr.left = node.type;
                expect( node ).to.have.property( 'type', Syntax.Identifier );
                expect( node ).to.have.property( 'name', 'u' );
            }
            else if ( fe.right === node )
            {
                lr.right = node.type;
                expect( node ).to.have.property( 'type', Syntax.MemberExpression );
                expect( node ).to.have.property( 'object' );
                expect( node.object ).to.have.property( 'type', Syntax.Identifier );
                expect( node.object ).to.have.property( 'name', 'someBase' );

            }
            else
                expect( true ).to.equal( false, "Bad node field" );
        } );

        ast2.rename( className.id, 'B' );
        ast2.add_line( 8, 'export default' );
        const astSrc = ast2.as_source();
        expect( astSrc ).to.be.a( 'string' );
        expect( /class B/.test( astSrc ) ).to.be.true;
        expect( /export default\n\s\s9.\sclass B/.test( astSrc ) ).to.be.true;

        const func = findType( Syntax.FunctionExpression, root2 );
        expect( ast.get_from_function( func.parent, 'name' ) ).to.eql( 'constructor' );

    } );
} );
