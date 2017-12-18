/*
 * MIT License
 *
 * Copyright (c) 2017 Julian Jensen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/** ******************************************************************************************************************
 * @file Describe what corman does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 02-Dec-2017
 *
 *           ┌─────┐
 *           │     │
 *    ┌──────┤  1  ├──────┐
 *    │      │     │      │
 *    │      └─────┘      │
 *    │                   │
 *    │                   │
 * ┌──v──┐             ┌──v──┐
 * │     │             │     │
 * │  3  │         ┌───┤  2  ├───┐
 * │     │         │   │     │   │
 * └──┬──┘         │   └─────┘   │
 *    │            │             │
 *    │            │             │
 *    │            │             │
 * ┌──v──┐      ┌──v──┐       ┌──v──┐
 * │     ├──────>     ├───────>     │
 * │  4  │      │  5  │       │  6  │
 * │     <──────┤     <───────┤     │
 * └─────┘      └─────┘       └─────┘
 *
 *********************************************************************************************************************/
"use strict";

const
    fs                              = require( 'fs' ),
    { stripIndent }                 = require( 'common-tags' ),
    { DominatorTree }               = require( './src/dominator-block' ),
    traversal                       = require( 'traversals' ),
    { DFS, BFS }                    = traversal,
    { start_table, str_table, log } = require( './src/dump' ),

    r                               = 1,
    x1                              = 2,
    x2                              = 3,
    x3                              = 4,
    y1                              = 9,
    y2                              = 7,
    y3                              = 5,
    z1                              = 10,
    z2                              = 8,
    z3                              = 6,

    labels                          = [
        'r', 'x1', 'x2', 'x3', 'y3', 'z3', 'y2', 'z2', 'y1', 'z1'
    ],
    paper                           = [
        [ r, x1, z1 ],
        [ x1, x2, y1 ],
        [ x2, x3, y2 ],
        [ x3, y3 ],
        [ y3, z3 ],
        [ y2, z2, z3 ],
        [ y1, z1, z2 ],
        [ z1, y1 ],
        [ z2, y2 ],
        [ z3, y3 ]
    ],
    plookup                         = [ 'start', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'end' ],
    slide                           = [
        [ 1, 2, 9 ],    // start    1 8
        [ 2, 3, 4 ],    // a        2 3
        [ 3, 4 ],       // b        3
        [ 4, 5, 6 ],    // c        4 5
        [ 5, 7 ],       // d        6
        [ 6, 7 ],       // e        6
        [ 7, 8, 3 ],    // f        7 2
        [ 8, 9 ],       // g        8
        [ 9 ]           // end
    ],
    front                           = [
        [ 1, 2, 3 ],
        [ 2, 5, 6 ],
        [ 3, 4 ],
        [ 4, 5 ],
        [ 5 ],
        [ 6 ]
    ],
    altx                            = [
        [ 1, 2, 3 ],
        [ 2, 5, 6 ],
        [ 3, 4 ],
        [ 4, 5 ],
        [ 5, 4, 6 ],
        [ 6, 5 ]
    ],
    large                           = [
        [ 1, 2 ],
        [ 2, 3, 4 ],
        [ 3, 6 ],
        [ 4, 5 ],
        [ 5, 6, 9 ],
        [ 6, 7, 9 ],
        [ 7, 8 ],
        [ 8, 6 ],
        [ 9, 10 ],
        [ 10 ]
    ],
    wiki                            = [
        [ 1, 2 ],
        [ 2, 3, 4, 6 ],
        [ 3, 4 ],
        [ 4, 5 ],
        [ 5, 2 ],
        [ 6 ]
    ],
    simple                          = [
        [ 1, 2 ],
        [ 2, 3 ],
        [ 3, 4, 5 ],
        [ 4, 5 ],
        [ 5, 6 ],
        [ 6 ]
    ];

/** */
class Node
{
    /**
     * @param {number} n
     */
    constructor( n )
    {
        this.name = 'NODE ' + n;
        this.id   = n - 1;
        this.reset();
    }

    reset()
    {
        // this.resetLT();
        this.pre      = -1;
        this.post     = -1;
        this.rpost    = -1;
        this.bpre     = -1;
        this._isStart = false;
        this._isExit  = false;
        // this.color = 'white';
        /** @type {Node[]} */
        this.preds = [];
        /** @type {Node[]} */
        this.succs = [];
        /** @type {number} */
        this.generation = -1;

        this.parent   = null;
        this.bucket   = [];
        this.semi     = this;
        this.best     = this;
        this.ancestor = null;
        this.child    = -1;
    }

    /**
     * @return {boolean}
     */
    get isStart()
    {
        return this._isStart;
    }

    /**
     * @param {boolean} v
     */
    set isStart( v )
    {
        this._isStart = v;
    }

    /**
     * @return {boolean}
     */
    get isExit()
    {
        return this._isExit;
    }

    /**
     * @param {boolean} v
     */
    set isExit( v )
    {
        this._isExit = v;
    }

    /**
     * @param {number} gen
     * @returns {?Node}
     */
    get( gen )
    {
        if ( this.generation >= gen ) return null;

        this.generation = gen;
        return this;
    }

    /**
     * @return {Node}
     */
    init_traversal()
    {
        this.generation = -1;
        return this;
    }

    __add_edges( xe, ne, fn )
    {
        const fe = ne.filter( en => !!en && !xe.includes( en ) );

        fe.forEach( fn );

        return xe.concat( fe );
    }

    /**
     * @param {...Node} succs
     * @return {Node}
     */
    add_succs( ...succs )
    {
        succs.forEach( s => {
            this.add_succ( s );
            s.add_pred( this );
        } );
        // this.succs = this.__add_edges( this.succs, succs, n => n.add_pred( n ) );
        return this;
    }

    add_succ( s )
    {
        if ( s && !this.succs.includes( s ) ) this.succs.push( s );
    }

    add_pred( p )
    {
        if ( !p ) return;

        // if ( !this.parent ) this.parent = p;

        if ( !this.preds.includes( p ) ) this.preds.push( p );
    }

    /**
     * @param {...Node} _preds
     * @return {Node}
     */
    add_preds( ..._preds )
    {
        _preds.forEach( p => {
            this.add_pred( p );
            p.add_succ( this );
        } );
        // if ( !this.preds.length && _preds.length )
        //     this.parent = _preds[ 0 ];
        //
        // this.preds = this.__add_edges( this.preds, _preds, n => n.add_succ( n ) );
        return this;
    }

    /**
     * @type {Iterable<Node>}
     */
    * [ Symbol.iterator ]()
    {
        // yield* this.succs.sort( ( a, b, ) => a.id - b.id ).reverse();
        // yield* this.succs.sort( ( a, b, ) => a.id - b.id ).reverse();
        yield* this.succs;
    }

    chkDomTreeNodes()
    {
        if ( !this.domSuccs.length ) return `    ${this.pre + 1} -> ∅`;

        return `${this.chkDom && this.chkDom !== this ? ( this.chkDom.pre + 1 ) + ' ^ ' : '    '}${this.pre + 1} -> ${this.domSuccs.map( c => c.pre + 1 ).join( ' ' )}`;
    }

    /**
     * @return {string}
     */
    toString()
    {
        const
            wkNums   = `${this.chkDomTreeNodes()}`,
            fronts   = [ ...this.frontier ].map( n => n.pre + 1 ).join( ', ' ),
            ltFronts = '', // ( this.ltFrontier || [] ).map( n => n.pre + 1 ).join( ', ' ),
            preds    = this.preds.length ? this.preds.map( n => n.pre + 1 ).join( ' ' ) : ' ',
            succs    = this.succs.length ? this.succs.map( n => n.pre + 1 ).join( ' ' ) : ' ',
            pre      = this.pre + 1,
            post     = this.post + 1,
            rpost    = this.rpost + 1,
            domBy    = '';

        return `${this.name} (${preds} < > ${succs}) => pre: ${pre}, post: ${post}, rpost: ${rpost}, domTree => ${wkNums}, frontier: ${fronts}, lt fronts: ${ltFronts}, dom. by: ${domBy}`;
    }

    /**
     * @return {string[]}
     */
    toTable()
    {
        const
            preds    = this.preds.length ? this.preds.map( n => n.id + 1 ).join( ' ' ) : ' ',
            succs    = this.succs.length ? this.succs.map( n => n.id + 1 ).join( ' ' ) : ' ',
            pre      = this.pre + 1,
            post     = this.post + 1,
            rpost    = this.rpost + 1;

        return [ this.name, succs, preds, pre, post, rpost ];
        //  [ ...this.strictDominatorsOf() ].map( b => b.pre + 1 ) ];
    }
}

/**
 * @template T
 */
class NodeList
{
    do_chk( postDom = false )
    {
        this.chkTree = new DominatorTree( this, 'CHK Dominator Tree', postDom, 'iter' ).toTable();
    }

    /**
     * @param {boolean} postDom
     */
    do_yalt( postDom = false )
    {
        this.yaltTree = new DominatorTree( this, 'YALT Dominator Tree', postDom, 'lt' ).toTable();
    }


    /**
     * @param {Array<Array<number>>} nodeList
     * @param {boolean} [postDom=false]
     */
    constructor( nodeList, postDom = false )
    {
        /** @type {Node[]} */
        this.nodes = nodeList.map( ( n, i ) => new Node( i + 1 ) ).sort( ( a, b ) => a.id - b.id );

        nodeList
            .forEach( lst => this.nodes[ lst[ 0 ] - 1 ].add_succs( ...lst.slice( 1 ).map( si => this.nodes[ si - 1 ] ) ) );

        this.init_in_out();

        const cbs = {
            edge: {
                tree: ( from, to ) => {
                    to.parent  = from;
                    from.child = to;
                }
            },
            pre: n => { console.log( ( n.pre + 1 ) + ' -> pre:' + ( n.id + 1 ) ); },
            rpost: n => console.log( 'rpost:' + ( n.id + 1 ) )
        };

        console.log( '' );
        this.maxPreNum  = DFS( this, cbs );
        this.preOrder   = cbs.preOrder;
        console.log( `raw preOrder: ${this.preOrder.map( n => n.id + 1 )}` );
        this.postOrder  = cbs.postOrder;
        this.rPreOrder  = cbs.revPreOrder;
        this.rPostOrder = cbs.revPostOrder;



        this.bfsOrder = BFS( this.startNode );

        // this.chkTree  = new DominatorTree( this, IterativeDoms( this ), 'CHK Dominator Tree', postDom ).toTable();
        // this.yaltTree = new DominatorTree( this, YALT( this ), 'YALT Dominator Tree', postDom ).toTable();
    }

    /**
     *
     */
    init_in_out()
    {
        const
            start = this.nodes.find( n => !n.preds.length );

        /** @type {Node} */
        this.startNode = start;
        start.isStart = true;
        start.name    = 'start';

        /** @type {?Node} */
        this.exitNode = null;
        this.determine_exit();
    }

    /** */
    determine_exit()
    {
        const possible = this.filter( n => !n.succs.length );

        if ( possible.length === 1 )
            this.exitNode = possible[ 0 ];
        else if ( possible.length > 1 )
        {
            this.exitNode = new Node( this.nodes.length - 1 );
            this.nodes.push( this.exitNode = new Node( this.nodes.length - 1 ) );
            this.exitNode.add_preds( ...possible.map( p => p.id ) );
        }
        else
            return;

        this.exitNode.isExit = true;
        this.exitNode.name   = 'exit';
    }

    /**
     * @type {Iterable<Node>}
     */
    * [ Symbol.iterator ]()
    {
        yield* this.nodes;
    }

    /**
     * @return {Node[]}
     */
    reverse()
    {
        return this.nodes.reverse();
    }

    /**
     * @param {function( T, number, T[]):*} fn
     */
    forEach( fn )
    {
        this.nodes.forEach( fn );
    }

    /**
     * @param {function( T, number, T[]):*} fn
     * @return {*[]}
     */
    map( fn )
    {
        return this.nodes.map( fn );
    }

    /**
     * @param {function( T, number, T[] ):boolean} fn
     * @return {T[]}
     */
    filter( fn )
    {
        return this.nodes.filter( fn );
    }

    /**
     * @param {function( T, number, T[] ):boolean} fn
     * @return {T}
     */
    find( fn )
    {
        return this.nodes.find( fn );
    }

    /**
     * @param {number} id
     * @return {Node}
     */
    get( id )
    {
        return this.nodes[ id ];
    }

    /**
     * @return {string}
     */
    toString()
    {
        const headers = [ 'Name', 'Succs', 'Preds', 'pre', 'post', 'rpost' ];
        let r = `          ┌─────────┐
┌─────────┤ START 0 │
│         └────┬────┘
│              │
│              V
│            ┌───┐
│     ┌──────┤ 1 │
│     │      └─┬─┘
│     │        │
│     │        V
│     │      ┌───┐
│     │      │ 2 │<───────────┐
│     │      └─┬─┘            │
│     │        │              │
│     │        V              │
│     │      ┌───┐            │
│     └─────>│   │            │
│     ┌──────┤ 3 ├──────┐     │
│     │      └───┘      │     │
│     │                 │     │
│     V                 V     │
│   ┌───┐             ┌───┐   │
│   │ 4 │             │ 5 │   │
│   └─┬─┘             └─┬─┘   │
│     │                 │     │
│     │                 │     │
│     │      ┌───┐      │     │
│     └─────>│ 6 │<─────┘     │
│            │   ├────────────┘
│            └─┬─┘
│              │
│              V
│            ┌───┐
│            │ 7 │
│            └─┬─┘
│              │
│              V
│         ┌─────────┐
└────────>│  EXIT 8 │
          └─────────┘
`;
//         let r         = `
//            ┌─────┐
//            │     │
//     ┌──────┤  1  ├──────┐
//     │      │     │      │
//     │      └─────┘      │
//     │                   │
//     │                   │
//  ┌──v──┐             ┌──v──┐
//  │     │             │     │
//  │  3  │         ┌───┤  2  ├───┐
//  │     │         │   │     │   │
//  └──┬──┘         │   └─────┘   │
//     │            │             │
//     │            │             │
//     │            │             │
//  ┌──v──┐      ┌──v──┐       ┌──v──┐
//  │     ├──────>     ├───────>     │
//  │  4  │      │  5  │       │  6  │
//  │     <──────┤     <───────┤     │
//  └─────┘      └─────┘       └─────┘
//
// `;

        // r = r.replace( /(\d+)/g, ( $0, $1 ) => Number( $1 ) + 1 );

        r += str_table( 'Nodes added order', headers, this.nodes.map( n => n.toTable() ) ) + '\n';
        // r += str_table( 'Nodes pre order', headers, this.preOrder.map( n => n.toTable() ) ) + '\n';
        // r += str_table( 'Nodes post order', headers, this.postOrder.map( n => n.toTable() ) ) + '\n';
        // r += str_table( 'Nodes reverse post order', headers, this.rPostOrder.map( n => n.toTable() ) ) + '\n';

        // const
        //     nodesPost = this.nodes.slice().sort( ( a, b ) => b.post - a.post ),
        //     chk       = start_table( [ '', ...this.results.map( ( r, i ) => !i ? 'Inital' : 'Iter #' + i ) ] );
        //
        // chk.push( ...nodesPost.map( node => [ 'Node #' + ( node.post + 1 ), ...this.results.map( ra => typeof ra[ node.post ] === 'number' ? ra[ node.post ] + 1 : 'u' ) ] ) );
        // r += chk.toString();

        return r;
    }

    /**
     * @param {string} title
     * @param {string} type
     * @param {object} [lookup]
     * @return {string}
     */
    toDot( title, type = 'ren', lookup )
    {
        const
            num      = n => {
                n = type === 'name' ? n : n.id;
                switch ( type )
                {
                    case 'ren':
                        return n + 1;
                    case 'asc':
                        return String.fromCharCode( 0x61 + n );
                    case 'off':
                        return !n ? ' ' : String.fromCharCode( 0x61 + n );
                    case 'lup':
                        return lookup[ n ];
                    case 'name':
                        return n.name;
                    default:
                        return n;
                }

            },
            dotNodes = this.nodes.map( node => {
                return !node.pre
                    ? `0 [label="${num( node )}[${node.pre + 1},${node.post + 1}]", color = "#C6AC4D", fontcolor = "#0D3B66", fontname = "arial", style = "rounded", shape = "box"];`
                    : `${node.pre} [label="${num( node )}[${node.pre + 1},${node.post + 1}]"];`;
            } ).join( '\n    ' ),
            edges    = this.nodes.map( node => node.succs.map( s => node.pre + ' -> ' + s.pre ).join( '\n    ' ) ).join( '\n    ' );

        return stripIndent`
            digraph "${title}" {
                default = "#0D3B66";
                bgcolor = "white";
                color = "#0D3B66";
                fontcolor = "#0D3B66";
                fontname = "arial";
                shape = "ellipse";
                nodesep = "1.5";
                margin = "0.5, 0.2";
                labelloc="t";
                label="${title}";
                fontsize=30
                node [color = "#0D3B66", fontcolor = "#0D3B66", fontname = "arial", style = "rounded"];
                ${dotNodes}
            
                // Unconditional edges
                edge [color = "#0D3B65", fontcolor = "#0D3B66", fontname = "arial"];
                ${edges}
            }`;
    }
}

/** @type {NodeList<Node>} */
const one = new NodeList( slide );

log( `${one}` );
if ( process.argv[ 2 ] ) fs.writeFileSync( process.argv[ 2 ], one.toDot( 'slide', 'name', plookup ) );
