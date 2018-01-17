/** ******************************************************************************************************************
 * @file Standard unit test.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date Sat Dec 16 2017
 *********************************************************************************************************************/
"use strict";

import { expect } from 'chai';
import fs from 'fs';
import CFG from '../src/cfg';

const
    testFiles       = [
        fs.readFileSync( './test-data/cfg-test-01.js', 'utf8' ),
        fs.readFileSync( './test-data/cfg-test-02.js', 'utf8' ),
        fs.readFileSync( './test-data/cfg-test-03.js', 'utf8' ),
        fs.readFileSync( './test-data/cfg-test-04.js', 'utf8' ),
        fs.readFileSync( './test-data/cfg-test-05.js', 'utf8' )
    ],
    a01             = [
        { id: 0, nodes: [], types: 1, createdBy: '' },
        {
            id:        1,
            nodes:     [ 'EmptyStatement' ],
            types:     16,
            createdBy: 'For.body'
        },
        { id: 2, nodes: [], types: 0, createdBy: 'For.conv' },
        { id: 3, nodes: [], types: 4, createdBy: '' },
        { id: 4, nodes: [], types: 2, createdBy: '' }
    ],
    a02             = [
        { id: 0, nodes: [], types: 1, createdBy: '' },
        {
            id:        1,
            nodes:     [ 'VariableDeclaration' ],
            types:     4,
            createdBy: 'For.init'
        },
        { id: 2, nodes: [], types: 0, createdBy: 'For.conv' },
        {
            id:        3,
            nodes:     [ 'EmptyStatement', 'UpdateExpression' ],
            types:     16,
            createdBy: 'CFG: BlockStatement'
        },
        { id: 4, nodes: [], types: 4, createdBy: '' },
        { id: 5, nodes: [], types: 2, createdBy: '' }
    ],
    a03             = [
        { id: 0, nodes: [], types: 1, createdBy: '' },
        {
            id:        1,
            nodes:     [ 'Identifier' ],
            types:     8,
            createdBy: 'For.test'
        },
        {
            id:        2,
            nodes:     [ 'ExpressionStatement' ],
            types:     16,
            createdBy: 'For.body'
        },
        { id: 3, nodes: [], types: 4, createdBy: '' },
        { id: 4, nodes: [], types: 2, createdBy: '' }
    ],
    b01             =
        [
            { id: 0, nodes: [], types: 1, createdBy: '' },
            { id: 1, nodes: [ 'CallExpression' ], types: 8, createdBy: '' },
            {
                id:        2,
                nodes:     [ 'Identifier' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        3,
                nodes:     [ 'ContinueStatement' ],
                types:     16,
                createdBy: ''
            },
            {
                id:        4,
                nodes:     [ 'UnaryExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        5,
                nodes:     [ 'EmptyStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            { id: 6, nodes: [], types: 4, createdBy: '' },
            { id: 7, nodes: [], types: 2, createdBy: '' }
        ],
    b02             =
        [
            { id: 0, nodes: [], types: 1, createdBy: '' },
            { id: 1, nodes: [ 'CallExpression' ], types: 8, createdBy: '' },
            {
                id:        2,
                nodes:     [ 'Identifier' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        3,
                nodes:     [ 'ContinueStatement' ],
                types:     16,
                createdBy: ''
            },
            {
                id:        4,
                nodes:     [ 'UnaryExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            { id: 5, nodes: [ 'BreakStatement' ], types: 16, createdBy: '' },
            { id: 6, nodes: [], types: 4, createdBy: '' },
            { id: 7, nodes: [], types: 2, createdBy: '' }
        ],
    b03             =
        [
            { id: 0, nodes: [], types: 1, createdBy: '' },
            {
                id:        1,
                nodes:     [ 'VariableDeclaration' ],
                types:     4,
                createdBy: ''
            },
            { id: 2, nodes: [ 'CallExpression' ], types: 8, createdBy: '' },
            {
                id:        3,
                nodes:     [ 'Identifier' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        4,
                nodes:     [ 'ContinueStatement' ],
                types:     16,
                createdBy: 4096
            },
            {
                id:        5,
                nodes:     [ 'UnaryExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        6,
                nodes:     [ 'ExpressionStatement', 'BreakStatement' ],
                types:     16,
                createdBy: ''
            },
            { id: 7, nodes: [], types: 4, createdBy: '' },
            { id: 8, nodes: [], types: 2, createdBy: '' }
        ],
    _constructor    =
        [
            { id: 0, nodes: [], types: 1, createdBy: '' },
            {
                id:        1,
                nodes:
                           [
                               'VariableDeclaration',
                               'ExpressionStatement',
                               'BinaryExpression'
                           ],
                types:     8,
                createdBy: ''
            },
            {
                id:        2,
                nodes:     [ 'ExpressionStatement' ],
                types:     4,
                createdBy: 'If.cons'
            },
            {
                id:        3,
                nodes:
                           [
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'ReturnStatement',
                               'VariableDeclaration',
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'ExpressionStatement'
                           ],
                types:     4,
                createdBy: ''
            },
            { id: 4, nodes: [], types: 2, createdBy: '' }
        ],
    pp$1parseClass3 =
        [
            { id: 0, nodes: [], types: 1, createdBy: '' },
            {
                id:        1,
                nodes:
                           [
                               'VariableDeclaration',
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'VariableDeclaration',
                               'VariableDeclaration',
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'ReturnStatement'
                           ],
                types:     4,
                createdBy: ''
            },
            { id: 2, nodes: [ 'UnaryExpression' ], types: 8, createdBy: '' },
            {
                id:        3,
                nodes:     [ 'CallExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        4,
                nodes:
                           [
                               'VariableDeclaration',
                               'VariableDeclaration',
                               'VariableDeclaration',
                               'VariableDeclaration',
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'MemberExpression'
                           ],
                types:     24,
                createdBy: ''
            },
            {
                id:        5,
                nodes:     [ 'ExpressionStatement', 'ContinueStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        6,
                nodes:     [ 'ExpressionStatement', 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        7,
                nodes:     [ 'LogicalExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        8,
                nodes:     [ 'ExpressionStatement', 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        9,
                nodes:
                           [
                               'ExpressionStatement',
                               'VariableDeclaration',
                               'UnaryExpression'
                           ],
                types:     24,
                createdBy: ''
            },
            {
                id:        10,
                nodes:     [ 'VariableDeclaration', 'LogicalExpression' ],
                types:     24,
                createdBy: ''
            },
            {
                id:        11,
                nodes:
                           [
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'Identifier'
                           ],
                types:     24,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        12,
                nodes:     [ 'LogicalExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        13,
                nodes:     [ 'Identifier' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        14,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        15,
                nodes:     [ 'Identifier' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        16,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        17,
                nodes:     [ 'Identifier' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        18,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        19,
                nodes:     [ 'Identifier' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        20,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        21,
                nodes:     [ 'ExpressionStatement', 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        22,
                nodes:     [ 'ExpressionStatement', 'Identifier' ],
                types:     24,
                createdBy: ''
            },
            {
                id:        23,
                nodes:     [ 'VariableDeclaration', 'BinaryExpression' ],
                types:     24,
                createdBy: ''
            },
            {
                id:        24,
                nodes:     [ 'VariableDeclaration', 'BinaryExpression' ],
                types:     24,
                createdBy: ''
            },
            {
                id:        25,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        26,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        27,
                nodes:     [ 'LogicalExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        28,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            { id: 29, nodes: [], types: 2, createdBy: '' }
        ],
    pp$1parseClass4 =
        [
            { id: 0, nodes: [], types: 1, createdBy: '' },
            {
                id:        1,
                nodes:
                           [
                               'VariableDeclaration',
                               'ExpressionStatement',
                               'ExpressionStatement'
                           ],
                types:     4,
                createdBy: ''
            },
            { id: 2, nodes: [ 'UnaryExpression' ], types: 8, createdBy: '' },
            {
                id:        3,
                nodes:
                           [
                               'VariableDeclaration',
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'VariableDeclaration',
                               'UnaryExpression'
                           ],
                types:     24,
                createdBy: ''
            },
            {
                id:        4,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'If.cons'
            },
            {
                id:        5,
                nodes:     [ 'UnaryExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        6,
                nodes:
                           [
                               'ExpressionStatement',
                               'ExpressionStatement',
                               'VariableDeclaration',
                               'LogicalExpression'
                           ],
                types:     24,
                createdBy: 'If.cons'
            },
            {
                id:        7,
                nodes:     [ 'Identifier' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        8,
                nodes:     [ 'VariableDeclaration', 'BinaryExpression' ],
                types:     24,
                createdBy: ''
            },
            {
                id:        9,
                nodes:     [ 'VariableDeclaration', 'BinaryExpression' ],
                types:     24,
                createdBy: ''
            },
            {
                id:        10,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            {
                id:        11,
                nodes:     [ 'LogicalExpression' ],
                types:     24,
                createdBy: 'If.test'
            },
            {
                id:        12,
                nodes:     [ 'ExpressionStatement' ],
                types:     16,
                createdBy: 'CFG: BlockStatement'
            },
            { id: 13, nodes: [], types: 2, createdBy: '' }
        ],
    blah            =
        [
            { id: 0, nodes: [], types: 1, createdBy: '' },
            {
                id:        1,
                nodes:     [ 'ExpressionStatement' ],
                types:     4,
                createdBy: ''
            },
            {
                id:        2,
                nodes:     [ 'ForOfStatement' ],
                types:     4,
                createdBy: 'ForInOf.update'
            },
            {
                id:        3,
                nodes:     [ 'ExpressionStatement', 'BinaryExpression' ],
                types:     24,
                createdBy: ''
            },
            {
                id:        4,
                nodes:     [ 'ContinueStatement' ],
                types:     16,
                createdBy: 'If.cons'
            },
            {
                id:        5,
                nodes:     [ 'BinaryExpression' ],
                types:     8,
                createdBy: 'If.test'
            },
            {
                id:        6,
                nodes:     [ 'ExpressionStatement' ],
                types:     4,
                createdBy: 'If.cons'
            },
            {
                id:        7,
                nodes:     [ 'BinaryExpression' ],
                types:     8,
                createdBy: 'If.test'
            },
            {
                id:        8,
                nodes:     [ 'ExpressionStatement' ],
                types:     4,
                createdBy: 'If.cons'
            },
            {
                id:        9,
                nodes:     [ 'ExpressionStatement' ],
                types:     4,
                createdBy: 'CFG: BlockStatement'
            },
            { id: 10, nodes: [], types: 4, createdBy: '' },
            { id: 11, nodes: [], types: 2, createdBy: '' }
        ],
    sourceToTests   = [
        { a01, a02, a03, b01, b02, b03 },
        { 'constructor': _constructor },
        { 'pp$1.parseClass': pp$1parseClass3 },
        { 'pp$1.parseClass': pp$1parseClass4 },
        { blah }
    ],
    extract         = bm => bm.blocks.map( b => ( {
        id:        b.id,
        nodes:     b.nodes.map( n => n.type ),
        types:     b.types,
        createdBy: b.createdBy
    } ) );

describe( 'cfg', function() {

    it( 'graph troublesome code', () => {
        const
            cfgs = testFiles.map( src => new CFG( src ) );

        cfgs.forEach( cfg => cfg.generate() );

        sourceToTests.forEach( ( testFns, i ) => {
            const cfg = cfgs[ i ];

            [ ...Object.entries( testFns ) ].forEach( ( [ name, expt ] ) => expect( expt ).to.eql( extract( cfg.by_name( name ).bm ) ) );
        } );
    } );

} );
