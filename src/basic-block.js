/** ******************************************************************************************************************
 * @file Describe what basic-block does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    assert                  = require( 'assert' ),
    { VisitorKeys, Syntax } = require( './defines' ),
    ExtArray                = require( './utils/ext-array' ),
    BlockArray              = require( './utils/pred-succ' ),
    num                     = n => typeof n === 'number' ? n : n ? n.pre : '-';

/**
 * @implements SimpleNode
 */
class BasicBlock
{
    /**
     * @param {number} id
     * @param {BasicBlockList} bl
     */
    constructor( id, bl )
    {
        this.id   = id;
        this.name = 'NODE ' + ( id + 1 );
        /** @type {?BasicBlockList} */
        this.blockList = bl;
    }

    /**
     * @param {BasicBlock[]} preds
     * @return {BasicBlock}
     */
    reset( ...preds )
    {
        /** @type {string} */
        this.blockType = 'block';

        // this.resetLT();
        this.pre      = null;
        this.post     = null;
        this.rpost    = null;
        this.rpre     = null;
        this._isStart = false;
        this._isExit  = false;

        this.nodes = [];
        this.scope = null;

        // this.allocator = new Error().stack.split( /[\r\n]\s+at\s+/ ).slice( 3 ).join( ', ' );

        /** @type {ExtArray<Node>} */
        this.nodes = new ExtArray();

        // /** @type {BlockArray} */
        // this.preds = new BlockArray();
        // this.preds.init( this, 'succs' );
        // /** @type {BlockArray} */
        // this.succs = new BlockArray();
        // this.succs.init( this, 'preds' );

        // this.preds.add( ...preds );

        this.succs = [];
        this.preds = [];
        this.add_preds( ...preds );

        this.isTest = false;
        /** @type {BasicBlock} */
        this.isTrue = null;
        /** @type {BasicBlock} */
        this.isFalse = null;
        /** @type {BasicBlock} */
        this.isEntry = false;
        /** @type {BasicBlock} */
        this.isExit = false;
        // this.scope  = BasicBlock.scopes ? BasicBlock.scopes.current : null;
        this.unique = 'ORG-???';
        return this;
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
     * @param {...Node} succs
     * @return {BasicBlock}
     */
    add_succs( ...succs )
    {
        succs.forEach( s => {
            this.add_succ( s );
            s.add_pred( this );
        } );

        return this;
    }

    /**
     * @param {BasicBlock} s
     * @return {BasicBlock}
     */
    add_succ( s )
    {
        if ( s && !this.succs.includes( s ) ) this.succs.push( s );

        return this;
    }

    /**
     * @param {...Node} _preds
     * @return {BasicBlock}
     */
    add_preds( ..._preds )
    {
        _preds.forEach( p => {
            this.add_pred( p );
            p.add_succ( this );
        } );

        return this;
    }

    /**
     * @param {BasicBlock} p
     * @return {BasicBlock}
     */
    add_pred( p )
    {
        if ( p && !this.preds.includes( p ) ) this.preds.push( p );

        return this;
    }

    /**
     * @type {Iterable<Node>}
     */
    *[ Symbol.iterator ]()
    {
        yield *this.succs;
    }

    /**
     * @return {BasicBlock}
     */
    test()
    {
        this.isTest = true;
        return this;
    }

    add_node( node )
    {
        if ( node ) this.nodes.push( node );
        return node ? node.block = this : this;
    }

    /**
     * @return {boolean}
     */
    hasNodes()
    {
        return !!this.nodes.length;
    }

    /**
     * @return {?Node}
     */
    get lastNode()
    {
        return this.nodes.length ? this.nodes[ this.nodes.length - 1 ] : null;
    }

    /**
     * @return {?Node}
     */
    get firstNode()
    {
        return this.nodes.length ? this.nodes[ 0 ] : null;
    }

    /** ***********************************************************************************************************************
     *
     * PRINT DEBUG METHODS
     *
     **************************************************************************************************************************/

    /**
     * @return {string}
     */
    sids()
    {
        return '[' + this.succs.map( s => s === this.isTrue ? `>${s.pre}` : s === this.isFalse ? `<${s.pre}` : s.pre ).join( ' ' ) + ']';
    }

    /**
     * @return {string}
     */
    pids()
    {
        return '[' + this.preds.map( s => s.pre ).join( ' ' ) + ']';
    }

    /**
     * For the edges.
     *
     * @return {string}
     */
    node_label()
    {
        return !this.description && this.isTest ? 'TEST' : !this.description ? 'no desc ' + ( this.nodes.length ? this.nodes[ 0 ].type : '-' ) : null;
    }

    /**
     * For the vertices.
     *
     * @return {string}
     */
    graph_label()
    {
        let
            txt = this.description && this.description.length < 16 ? this.description.replace( 'consequent', 'cons' ) : '',
            ln  = this.nodes.length && this.nodes[ 0 ].loc && this.nodes[ 0 ].loc.start.line;

        if ( this.isEntry || this.isExit ) txt += ':' + this.pre;
        return txt ? `${txt}:${this.pre}@${ln}` : `unk:${this.pre}@${ln || ''}`;
    }

    /**
     * @return {string}
     */
    get_class_name()
    {
        if ( !BasicBlock.scopes || !this.scope ) return '';

        const
            s = BasicBlock.scopes,
            c = s.current;

        s.current = this.scope;

        const classScope = BasicBlock.scopes.get_scope_by_type( 'class' );

        if ( !classScope )
        {
            s.current = c;
            return '';
        }

        let className = classScope.name();

        s.current = c;

        return className;
    }

    /**
     * @return {string}
     */
    toString()
    {
        let nodeStr   = this.nodes.map( n => `${n}` ).join( ', ' ),
            ps        = this.pred_succ(),
            rep       = ' '.repeat( Math.max( 0, this.indent * 4 ) ),
            className = this.get_class_name(),
            doms      = `${num( this.dom )}/${num( this.idomParent )}/${this.preNumber}/${this.postNumber}:${this.rpost}`;

        if ( className ) className = className + '.';

        if ( !this.description && this.isTest ) this.description = 'TEST';
        else if ( !this.description ) this.description = 'no desc ' + ( this.nodes.length ? this.nodes[ 0 ].type : '-' );

        const desc = typeof this.description === 'string' ? this.description : this.description();

        nodeStr = `${ps} ${this.isEntry ? '==>' : this.isExit ? '<==' : '='} ${className}${desc} // doms: ${doms}, nodes: ${nodeStr}`;

        return `${this.unique}: ${rep}${nodeStr}`;
    }

    // /**
    //  * @return {string}
    //  */
    // toString()
    // {
    //     const
    //         wkNums   = `${this.chkDomTreeNodes()}`,
    //         fronts   = [ ...this.frontier ].map( n => n.pre + 1 ).join( ', ' ),
    //         ltFronts = '', // ( this.ltFrontier || [] ).map( n => n.pre + 1 ).join( ', ' ),
    //         preds    = this.preds.length ? this.preds.map( n => n.pre + 1 ).join( ' ' ) : ' ',
    //         succs    = this.succs.length ? this.succs.map( n => n.pre + 1 ).join( ' ' ) : ' ',
    //         pre      = this.pre + 1,
    //         post     = this.post + 1,
    //         rpost    = this.rpost + 1,
    //         domBy    = '';
    //
    //     return `${this.name} (${preds} < > ${succs}) => pre: ${pre}, post: ${post}, rpost: ${rpost}, domTree => ${wkNums}, frontier: ${fronts}, lt fronts: ${ltFronts}, dom. by: ${domBy}`;
    // }

    /**
     * @return {string[]}
     */
    toTable()
    {
        const
            preds = this.preds.length ? this.preds.map( n => n.id + 1 ).join( ' ' ) : ' ',
            succs = this.succs.length ? this.succs.map( n => n.id + 1 ).join( ' ' ) : ' ',
            pre   = this.pre + 1,
            post  = this.post + 1,
            rpost = this.rpost + 1;

        return [ this.name, succs, preds, pre, post, rpost ];
        //  [ ...this.strictDominatorsOf() ].map( b => b.pre + 1 ) ];
    }

    /**
     * @return {string}
     */
    pred_succ()
    {
        let tmp = [];

        if ( this.preds.size ) tmp.push( this.pids(), ' <- ' );
        tmp.push( this.isEntry || this.isExit ? `{${this.pre}}` : this.pre );
        if ( this.succs.size ) tmp.push( ' -> ', this.sids() );
        tmp.push( ' (' + this.nodes.length + ')' );
        return tmp.join( '' );
    }

    /**
     * @param {string} str
     * @return {BasicBlock}
     */
    desc( str )
    {
        this.description = str || this.source_info.bind( this );
        return this;
    }

    /**
     * @return {boolean}
     */
    endsInBreak()
    {
        return this.nodes.last.type === Syntax.BreakStatement;
    }

    /**
     * @param {BasicBlock} [block]
     * @return {BasicBlock}
     */
    consequent( block )
    {
        block       = block || this.blockList.block( this );
        this.isTest = true;
        this.isTrue = block;
        this.add_succs( block );
        return block;
    }

    /**
     * @param {BasicBlock} [block]
     * @return {BasicBlock}
     */
    alternate( block )
    {
        block        = block || this.blockList.block( this );
        this.isTest  = true;
        this.isFalse = block;
        this.add_succs( block );
        return block;
    }

    /**
     * @param {Node} node
     */
    add( node )
    {
        assert( node.type );
        assert( VisitorKeys[ node.type ] );
        assert( VisitorKeys[ node.type ].every( k => node.hasOwnProperty( k ) ) );

        this.nodes.push( node );
        node.block = this;
    }

    /**
     * @param {BasicBlock[]} blocks
     * @return {*[]}
     */
    add_succs( ...blocks )
    {
        return this.succs.add( ...blocks );
    }

    /**
     * @param {BasicBlock[]} blocks
     * @return {*[]}
     */
    add_preds( ...blocks )
    {
        return this.preds.add( ...blocks );
    }

    /**
     * @param {string} name
     * @param {string} type
     * @param {?SourceLocation} [loc]
     * @param {?[number, number]} [range]
     */
    source( name, type, loc, range )
    {
        this.name  = name || 'anonymous';
        this.type  = type;
        this.loc   = loc;
        this.range = range;
    }

    pred_edges()
    {
        return this.preds.map( p => this.blockList.edgeList.get( p, this ) );
    }

    succ_edges()
    {
        return this.succs.map( s => this.blockList.edgeList.get( this, s ) );
    }

    /**
     * @return {string}
     */
    source_info()
    {
        let typed = this.type || ( this.nodes.length && this.nodes[ 0 ].type ) || '',
            loc   = ( this.loc && this.loc.start && this.loc.start.line && `, line ${this.loc.start.line}` ) || ( this.range && this.range.offset && `, offset: ${this.range.offset}` ) || '';

        if ( this.loc && this.loc.end )
            loc += `( ${this.loc.end.line - this.loc.start.line + 1} lines )`;

        return `[ ${typed} ] ${this.name}${loc}`;
    }

    /**
     * @param {BasicBlock} oldBlock
     * @param {BasicBlock[]} newBlocks
     */
    pred_replace( oldBlock, ...newBlocks )
    {
        // console.log( `In ${this.pre}, we're replacing ${oldBlock.pre} in predecessors with [ ${newBlocks.map( nb => nb.pre )} ]` );
        this.preds.delete( oldBlock );
        let added = this.preds.add( ...newBlocks );
        added     = Array.isArray( added ) ? added : added ? [ added ] : [];
        added.forEach( p => this.blockList.edgeList.add( p, this ) );
    }

    /**
     * @param {BasicBlock} oldBlock
     * @param {BasicBlock[]} newBlocks
     */
    succ_replace( oldBlock, ...newBlocks )
    {
        // console.log( `In ${this.pre}, we're replacing ${oldBlock.pre} in successors with [ ${newBlocks.map( nb => nb.pre )} ]` );
        if ( this.isTrue === oldBlock )
            this.isTrue = newBlocks[ 0 ];
        else if ( this.isFalse )
            this.isFalse = newBlocks[ 0 ];

        this.succs.delete( oldBlock );
        let added = this.succs.add( ...newBlocks );
        added     = Array.isArray( added ) ? added : added ? [ added ] : [];
        added.forEach( s => this.blockList.edgeList.add( this, s ) );
    }

    /**
     */
    unhook()
    {
        if ( !this.preds.size || this.hasNodes() || this.isEntry || this.succs.size !== 1 ) return;

        const
            succs = this.succs.one();

        // console.log( `Unhooking ${this.pre}` );
        //
        // this.preds.filter( p => p.isTest ).forEach( p => {
        //     if ( p.isTrue === this ) p.isTrue = succs;
        //     else if ( p.isFalse === this ) p.isFalse = succs;
        // } );

        this.preds.forEach( p => this.blockList.edgeList.delete_by_key( p, this ) );
        this.succs.forEach( s => this.blockList.edgeList.delete_by_key( this, s ) );
        this.preds.slice().forEach( p => p.succ_replace( this, succs ) );
        this.succs.slice().forEach( s => s.pred_replace( this, ...this.preds ) );

        this.blockList.blocks.delete( this );
        this.blockList.isDirty = true;
        this.blockList.force_refresh();
    }

    /**
     * @param {string} t
     * @return {?string|BasicBlock}
     */
    block_type( t )
    {
        if ( t )
        {
            this.blockType = t;
            return this;
        }
        return t;
    }
}

BasicBlock.scopes = null;

module.exports = BasicBlock;
