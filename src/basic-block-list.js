/** ******************************************************************************************************************
 * @file Describe what basic-block-list does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    assert            = require( 'assert' ),
    ExtArray          = require( './utils/ext-array' ),
    BlockArray        = require( './utils/pred-succ' ),
    EdgeList          = require( './edge-list' ),
    BasicBlock        = require( './basic-block' ),
    { DominatorTree } = require( './dominator-block' ),
    { DFS }           = require( 'traversals' ),
    dot               = require( './utils/dot' );

/**
 * @typedef {object} BlockEdge
 * @property {number} from
 * @property {number} to
 */

/**
 */
class BasicBlockList
{
    /**
     */
    constructor()
    {
        BasicBlock.reset();
        this._asArray       = [];
        this._asPostOrder   = [];
        this._edges         = [];
        this._conditional   = [];
        this._unconditional = [];
        this.isDirty        = true;
        this.edgeList       = new EdgeList();
        this.blocks         = [];
        this.name           = 'Unnamed';
        this.id             = 0;
    }

    /** */
    done()
    {
        const
            cbs = {
                edge:  {
                    tree: ( from, to ) => {
                        to.parent = from;
                    }
                },
                pre:   ( nodeId, preNum ) => this.blocks[ nodeId ].pre = preNum,
                rpre:  ( nodeId, rPreNum ) => this.blocks[ nodeId ].rpre = rPreNum,
                post:  ( nodeId, postNum ) => this.blocks[ nodeId ].post = postNum,
                rpost: ( nodeId, rPostNum ) => this.blocks[ nodeId ].rpost = rPostNum
            };

        this.init_in_out();

        DFS( this.blocks.map( b => b.succs ),  );

        this.preOrder  = cbs.preOrder;
        this.postOrder  = cbs.postOrder;
        this.rPreOrder  = cbs.revPreOrder;
        this.rPostOrder = cbs.revPostOrder;

        this.dominators = new DominatorTree( this.blocks, 'CHK Dominator Tree' );

        // this.chkTree = new DominatorTree( this, IterativeDoms( this ), 'CHK Dominator Tree', postDom ).toTable();
        // this.yaltTree = new DominatorTree( this, YALT( this ), 'YALT Dominator Tree', postDom ).toTable();
    }

    /**
     * @return {[ BasicBlock, BasicBlock ]}
     */
    entry_and_exit()
    {
        return [ this.entry = this.block().right().entry(), this.exit = this.block().exit() ];
    }

    /**
     * @param {BasicBlock[]} preds
     * @return {BasicBlock}
     */
    block( ...preds )
    {
        const b = new BasicBlock( this.id++, this ).reset( ...preds );
        this.blocks.add( b );
        return b;
    }

    /**
     * @return {string}
     */
    toString()
    {
        return this.asArray.map( b => `${b}` ).join( '\n' );
    }

    /**
     * @param {number|BasicBlock} index
     * @return {BasicBlock}
     */
    get( index )
    {
        return typeof index === 'number' ? this.asArray[ index ] : index; // this.asArray.find( b => b.pre === index );
    }

    /** */
    force_refresh()
    {
        this.__refresh( true );
    }

    /**
     * @param {boolean} [force=false]
     * @private
     */
    __refresh( force )
    {
        if ( !force && ( !this.entry || !this.isDirty ) ) return;
        this.isDirty      = false;
        this._asArray     = this.map_to_array();
        this._asPostOrder = this._asArray.sort( ( a, b ) => a.postNumber - b.postNumber );
        this._edges       = this._map_to_edges();
        this._partition();
    }

    /**
     * @return {Array<BasicBlock>}
     */
    get asArray()
    {
        this.__refresh();
        return this._asArray;
    }

    /**
     * @return {Array<BasicBlock>}
     */
    get asPostOrder()
    {
        this.__refresh();
        return this._asPostOrder;
    }

    /**
     * @return {Array<BlockEdge>}
     */
    get edges()
    {
        this.__refresh();
        return this._edges;
    }

    /**
     * @return {Array<BlockEdge>}
     */
    get conditional()
    {
        this.__refresh();
        return this._conditional;
    }

    /**
     * @return {Array<BlockEdge>}
     */
    get unconditional()
    {
        this.__refresh();
        return this._unconditional;
    }

    /**
     * @private
     */
    _partition()
    {
        [ this._conditional, this._unconditional ] = this.edges.partition( ( { from, to } ) => from.isTrue === to );
        // [ this._conditional, this._unconditional ] = partition( this.edges.map( e => e.asIndex() ), ( { from, to } ) => this.get( from ).isTrue === this.get( to ) );
    }

    /**
     * @private
     */
    _renumber()
    {
        const blocks = this.map_to_array( true );

        // This is a `for` loop because the built-ins skip holes in sparse arrays
        for ( let offset = 0,
                  n      = 0; n < blocks.length; n++ )
        {
            if ( !blocks[ n ] ) offset--;
            else if ( offset )
            {
                blocks[ n ].pre += offset;
                blocks[ n ].rpost += offset;
                blocks[ n ].semi = blocks[ n ].pre;
            }
        }

        this.edgeList.renumber();
        this.force_refresh();
        BasicBlock.pre = this.asArray.length;
        return this;
    }

    /**
     * Drop empty blocks under certain conditions
     */
    drop()
    {
        this.asArray.forEach( b => b.unhook() );
        return this._renumber();
    }

    /**
     * Pre-order walk
     *
     * @param {function} fn
     */
    walk( fn )
    {
        const _ = new Set();

        /**
         * @param {BasicBlock} _bb
         * @private
         */
        function _walk( _bb )
        {
            _.add( _bb );
            fn( _bb );
            _bb.succs.forEach( b => !_.has( b ) && _walk( b ) );
        }

        _walk( this.entry );

        return this;
    }

    /**
     * @param {BasicBlock} block
     */
    delete_edges( block )
    {
        this.edgeList.delete( block );
    }

    /**
     * @return {Array<BasicBlock>}
     */
    _map_to_edges()
    {
        return this._asArray.reduce( ( edges, b ) => edges.concat( b.succ_edges() ), new ExtArray() );
    }

    /**
     * @param {boolean} sparse
     * @return {Array<BasicBlock>}
     */
    map_to_array( sparse = false )
    {
        const _blocks = new BlockArray();

        this.walk( sparse ? b => _blocks[ b.pre ] = b : b => _blocks.push( b ) );
        // this.walk( b => _blocks[ b.pre - 1 ] = b );

        return _blocks;
        // return sparse ? _blocks : _blocks.order(); // sort( ( a, b ) => a.pre - b.pre );
    }

    /**
     * @return {[ BasicBlock, BasicBlock ]}
     */
    entryExit()
    {
        let en,
            ex;

        this.walk( b => {
            if ( b.isEntry ) en = b;
            else if ( b.isExit ) ex = b;
        } );

        assert( !!en && !!ex && en === this.entry && ex === this.exit );
        return [ en.pre, ex.pre ];
    }

    /**
     * @return {string}
     */
    lines()
    {
        const loc = this.entry.loc; // this.asArray[ 0 ].loc;

        return loc ? `${loc.start.line}-${loc.end.line}` : '';
    }

    /**
     * @type {Iterable<BasicBlock>}
     */
    *[ Symbol.iterator ]()
    {
        yield *this.asArray;
    }

    /**
     * @return {BasicBlockList}
     */
    initial_walk()
    {
        const _ = new Set();

        // console.log( 'early:', [ ...this.blocks ].map( b => b.debug_str() ).join( '\n' ) );

        let preorder  = 1,
            postorder = 0,
            count     = 0,
            _this     = this;

        /**
         * @param {BasicBlock} n
         */
        ( function pre_walk( n ) {

            if ( _.has( n ) ) return;

            _.add( n );

            if ( !_this.blocks.has( n ) ) throw new Error( `Initializing an unknown node ${n}` );

            n.preds.order();
            n.succs.order();

            count++;
            n.rpost = n.pre = 0;
            n.succs.order().forEach( pre_walk );
        } )( this.entry );

        postorder = count;

        /**
         * @param {BasicBlock} n
         */
        ( function dfs( n ) {
            n.initialize( preorder );
            n.pre = preorder++;
            n.succs.forEach( S => {
                if ( S.pre === 0 )
                {
                    S.parent = n;
                    // S.pre = preorder;
                    S.initialize( preorder );
                    _this.edgeList.classify_edge( n, S, 'tree edge' );
                    dfs( S );
                }
                else if ( S.rpost === 0 ) _this.edgeList.classify_edge( n, S, 'back edge' );
                else if ( n.pre < S.pre ) _this.edgeList.classify_edge( n, S, 'forward edge' );
                else _this.edgeList.classify_edge( n, S, 'cross edge' );
            } );
            n.rpost = postorder--;
        } )( this.entry );

        // this.asArray.forEach( b => console.log( b.debug_str() ) );

        // console.log( `before drop:\n\n${this}\n` );
        this.drop();
        // console.log( `after drop:\n\n${this}\n` );
        process.stdout.write( `Start dominator calculations for "${this.name}"... ` );
        // console.log( `Start dominator calculations for "${this.name}"... ` );
        this.lentar_dominators();
        // this.dominators = new Dominators( this );
        console.log( 'done' );
        return this;
    }

    do_chk( postDom = false )
    {
        this.dominators = new DominatorTree( [ ...this ].map( n => n.succs ), 'CHK Dominator Tree' );
    }

    /**
     * @param {boolean} postDom
     */
    do_yalt( postDom = false )
    {
        this.yaltTree = new DominatorTree( this, LT( this ), 'YALT Dominator Tree', postDom ).toTable();
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
    *[ Symbol.iterator ]()
    {
        yield *this.nodes;
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
        let r         = `          ┌─────────┐
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

    /**
     * @param {string} title
     */
    create_dot( title )
    {
        return dot( {
            title,
            nodeLabels:    [ ...this ].map( b => b.graph_label() ),
            edgeLabels:    [ ...this ].map( b => b.node_label() ),
            start:         this.startNode.id,
            end:           this.exitNode.id,
            conditional:   this.conditional,
            unconditional: this.unconditional
        } );
    }
}


module.exports = BasicBlockList;
