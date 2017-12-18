/** ****************************************************************************************************
 * File: dominator-block (dominators)
 * @author julian on 11/29/17
 * @version 1.0.0
 * @copyright Planet3, Inc.
 *******************************************************************************************************/
'use strict';

const
    { LT, iterative, frontiers_from_succs, reverse_flow } = require( 'dominators' ),
    { as_table } = require( './dump' ),
    adder        = s => val => {
        if ( s.has( val ) ) return false;
        s.add( val );
        return true;
    };

/**
 * @interface SimpleNode
 * @property {Array<number>} succs
 * @property {number} id
 * @property {number} pre
 * @property {number} post
 * @property {boolean} isStart
 * @property {boolean} isExit
 */

/**
 * @template T
 */
class DominatorTree
{
    /**
     * postDom is NOT working!
     *
     * @param {Array<SimpleNode>} nodes
     * @param {string} [title]
     * @param {boolean} [postDom]
     * @param {string} [idomFunc='iter']
     */
    constructor( nodes, title = 'Dominator Tree', postDom = false, idomFunc = 'iter' )
    {
        const
            succs = nodes.map( n => n.succs ),
            preds = reverse_flow( succs ),
            doms = postDom ? preds : succs,
            idoms = idomFunc === 'lt' ? LT( doms ) : iterative( doms );

        this.nodes = nodes;
        /** @type {Array<DominatorBlock>} */
        this.domNodes = idoms.map( ( idom, nodeId ) => new DominatorBlock( this, nodeId, idom ) );
        /** @type {T} */
        this._root = null;
        /** @type {T} */
        this._exit = null;
        this.domNodes.forEach( ( db, i ) => {
            db.post_init( this.domNodes[ db.idomId ], nodes[ i ].pre, nodes[ i ].post );
            if ( nodes[ i ].isStart ) this._root = db;
            if ( nodes[ i ].isExit ) this._exit = db;
        } );

        if ( postDom )
            [ this._root, this._exit ] = [ this._exit, this._root ];

        const frontiers = frontiers_from_succs( doms, idoms );

        console.log( 'frontiers:', frontiers );

        frontiers.forEach( ( f, i ) => this.domNodes[ i ].frontier = f );

        /** @type {string} */
        this.name      = title;
    }

    /**
     * @return {T | *}
     */
    get root()
    {
        return this._root;
    }

    /**
     * @return {T | *}
     */
    get start()
    {
        return this._root;
    }

    /**
     * @return {T | *}
     */
    get exit()
    {
        return this._exit;
    }

    /**
     * @return {T | *}
     */
    get end()
    {
        return this._exit;
    }

    /**
     * @param {number} index
     * @return {DominatorBlock}
     */
    get( index )
    {
        return this.domNodes[ index ];
    }

    /**
     * @return {string}
     */
    toString()
    {
        return this.domNodes.map( b => `${b}` ).join( '\n' );
    }

    /**
     * Current columns: `id, pre, post, succs, dominates, frontier, dom. by`
     */
    toTable()
    {
        as_table( this.name, [ 'id', 'pre', 'post', 'succs', 'dominates', 'frontier', 'dominated by' ], this.domNodes.map( b => b.toRow() ) );
        return this;
    }
}

/** */
class DominatorBlock
{
    /**
     * @param {DominatorTree} tree
     * @param {number} node
     * @param {number} idom
     */
    constructor( tree, node, idom )
    {
        this.tree = tree;
        this.id = node;
        this.idomId = idom;
        this.frontier = [];
        this.succs = [];
        this.pre = this.post = -1;
    }

    /**
     * @param {?DominatorBlock} idom
     * @param {number} pre
     * @param {number} post
     */
    post_init( idom, pre, post )
    {
        if ( !idom ) return;

        this.idom     = idom;
        this.pre = pre;
        this.post = post;
        this.idom.succs.push( this );
    }

    /** ****************************************************************************************************************************
     *
     * DOMINATORS UP
     *
     *******************************************************************************************************************************/

    /**
     * @param {function(DominatorBlock)} functor
     */
    forStrictDominators( functor )
    {
        let block = this.idom;

        while ( block )
        {
            functor( block );
            block = block.idom;
        }
    }

    /**
     * Note: This will visit the dominators starting with the 'to' node and moving up the idom tree
     * until it gets to the root.
     *
     * @param {function} functor
     */
    forDominators( functor )
    {
        let block = this;

        while ( block )
        {
            functor( block );
            block = block.idom;
        }
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    strictDominators()
    {
        let block = this.idom;
        const r   = [];

        while ( block )
        {
            r.push( block );
            block = block.idom;
        }

        return r;
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    dominators()
    {
        let block = this;

        const r = [];

        while ( block )
        {
            r.push( block );
            block = block.idom;
        }

        return r;
    }

    /** ****************************************************************************************************************************
     *
     * DOMINATES DOWN
     *
     *******************************************************************************************************************************/

    /**
     * @param {number} [to]
     * @return {boolean|Array<DominatorBlock>}
     */
    strictlyDominates( to )
    {
        if ( typeof to === 'number' )
        {
            const dn = this.tree.get( to );
            return dn.pre > this.pre && dn.post < this.post;
        }

        const result = new Set();

        this.forStrictlyDominates( node => result.add( node ) );

        return [ ...result ];
    }

    /**
     * @param {number} to
     * @return {boolean}
     */
    dominates( to )
    {
        return this.pre === this.tree[ to ].pre || this.strictlyDominates( to );
    }

    /**
     * @param {function} functor
     */
    forStrictlyDominates( functor )
    {
        let worklist = this.succs.slice();

        while ( worklist.length )
        {
            const block = worklist.pop();
            functor( block );
            worklist = worklist.concat( block.succs );
        }
    }

    /**
     * @param {function} functor
     */
    forDominates( functor )
    {
        let worklist = [ this ];

        while ( worklist.length )
        {
            const block = worklist.pop();
            functor( block );
            worklist = worklist.concat( block.succs );
        }
    }

    /** ****************************************************************************************************************************
     *
     * DOMINANCE FRONTIER DOWN
     *
     *******************************************************************************************************************************/

    /**
     * @param {function} functor
     */
    forDominanceFrontier( functor )
    {
        const
            add = adder( new Set() );

        this._forDominanceFrontier( block => add( block ) && functor( block ) );
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    dominanceFrontier()
    {
        const result = new Set();

        this.forDominanceFrontier( node => result.add( node ) );
        return [ ...result ];
    }

    /**
     * @param {function} functor
     */
    forIteratedDominanceFrontier( functor )
    {
        const caller = block => {
            functor( block );
            return true;
        };

        this.forPrunedIteratedDominanceFrontier( caller );
    }

    /**
     * This is a close relative of forIteratedDominanceFrontier(), which allows the
     * given functor to return false to indicate that we don't wish to consider the given block.
     * Useful for computing pruned SSA form.
     *
     * @param {function} functor
     */
    forPrunedIteratedDominanceFrontier( functor )
    {
        const
            set = new Set(),
            add = adder( set );

        this._forIteratedDominanceFrontier( block => add( block ) && functor( block ) );
    }

    /**
     * @return {Array<DominatorBlock>}
     */
    iteratedDominanceFrontier()
    {
        const
            _result = new Set(),
            result  = adder( _result );

        this._forIteratedDominanceFrontier( result );

        return [ ..._result ];
    }

    /**
     * Paraphrasing from http:*en.wikipedia.org/wiki/Dominator_(graph_theory):
     *
     * >    "The dominance frontier of a block 'from' is the set of all blocks 'to' such that
     * >    'from' dominates an immediate predecessor of 'to', but 'from' does not strictly
     * >    dominate 'to'."
     *
     * A useful corner case to remember: a block may be in its own dominance frontier if it has
     * a loop edge to itself, since it dominates itself and so it dominates its own immediate
     * predecessor, and a block never strictly dominates itself.
     *
     * @param {function} functor
     */
    _forDominanceFrontier( functor )
    {
        this.forDominates( block => block.succs.forEach( to => !this.strictlyDominates( to ) && functor( this, to ) ) );
    }

    /**
     * @param {function} functor
     * @private
     */
    _forIteratedDominanceFrontier( functor )
    {
        const worklist = [ this ];

        while ( worklist.length )
            worklist.pop()._forDominanceFrontier( otherBlock => functor( otherBlock ) && worklist.push( otherBlock ) );
    }

    /**
     * @return {string}
     */
    toString()
    {
        const
            doms    = [],
            idComma = arr => arr.map( d => d.id + 1 ).join( ', ' );

        this.forStrictlyDominates( b => doms.push( b ) );

        return `${this.id + 1} -> ${idComma( this.succs )}, doms: ${idComma( doms )}, frontier: ${idComma( this.frontier || [] )}`;
    }

    /**
     * return {Array<string|number>}
     */
    toRow()
    {
        const
            doms    = [],
            idoms   = this.dominators(),
            idComma = arr => arr.map( d => d.id + 1 ).join( ' ' );

        this.forStrictlyDominates( b => doms.push( b ) );
        // this.forDominators( b => idoms.push( b ) );

        return [ this.id + 1, this.node.pre + 1, this.node.post + 1, idComma( this.succs ), idComma( doms ), idComma( this.frontier ), idComma( idoms ) ];
    }
}

module.exports = { DominatorTree, DominatorBlock };
