/** ******************************************************************************************************************
 * @file Describe what utils does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 01-Jan-2018
 *********************************************************************************************************************/
"use strict";

const
    { DFS }       = require( 'traversals' ),
    {
        iterative,
        create_dom_tree,
        reverse_graph
    }             = require( 'dominators' ),
    union         = ( a, b ) => [ ...b ].reduce( ( s, name ) => s.add( name ), a ),
    _intersection = ( small, large ) => [ ...small ].reduce( ( s, name ) => large.has( name ) ? s.add( name ) : s, new Set() ),
    intersection  = ( a, b ) => _intersection( ...( a.size < b.size ? [ a, b ] : [ b, a ] ) ),
    assert = require( 'assert' ),
    clc    = require( 'cli-color' ),
    warn   = clc.xterm( 220 ),
    error  = clc.xterm( 196 ),
    info   = clc.xterm( 117 ),

    colors = {
        dark:  {
            green:  clc.xterm( 34 ),
            blue:   clc.xterm( 26 ),
            cyan:   clc.xterm( 45 ),
            purple: clc.xterm( 57 ),
            red:    clc.xterm( 161 ),
            orange: clc.xterm( 167 ),
            yellow: clc.xterm( 184 ),
            pink:   clc.xterm( 170 ),
            gray:   clc.xterm( 248 )
        },
        light: {
            green:  clc.xterm( 118 ),
            blue:   clc.xterm( 39 ),
            cyan:   clc.xterm( 123 ),
            purple: clc.xterm( 147 ),
            red:    clc.xterm( 196 ),
            orange: clc.xterm( 208 ),
            yellow: clc.xterm( 226 ),
            pink:   clc.xterm( 213 ),
            gray:   clc.xterm( 252 )
        },
        white: clc.xterm( 255 )
    };


function make_flow( blocks, _idoms )
{
    const
        tree = {};

    tree.succs    = blocks.map( b => b.succs );
    tree.preds    = reverse_graph( tree.succs );
    tree.idoms    = _idoms || iterative( tree.succs );
    tree.domSuccs = create_dom_tree( tree.idoms );
    tree.domPreds = reverse_graph( tree.domSuccs );

    /**
     * @typedef {object} DataFlow
     * @property {function(Set, Set):Set} op1
     * @property {function(Set, Set):Set} op2
     * @property {function(Set, Set):Set} accumulate
     * @property {string} adjacent
     * @property {Set} constant1
     * @property {Set} constant2
     * @property {string} [direction]
     * @property {boolean} [useDomTree=false]
     */

    /**
     * subscriptNumbers = [ '₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉' ],
     * subscriptPlus = '₊',
     * subscriptMinus = '₋',
     * subscriptEquals = '₌',
     * subscriptParens = [ '₍', '₎' ]
     *
     * ∀i ∈ 𝑉
     *  ∀e ∈ 𝐸ᵢ : 𝑓(x) = 𝘤₁ 𝑜𝑝₁ ( 𝑥 𝑜𝑝₂ 𝘤₂ )
     *
     *  @param {Array<Set>} c1
     *  @param {Array<Set>} c2
     *  @param {Array<Set>} [res=[]]
     *  @param {string} [ops='uui']
     *  @param {object} [opts]
     */
    function analyze( c1, c2, res = [], ops = 'uui', opts = { direction: 'rpost', adjacent: 'succs', useDomTree: false } )
    {
        const
            op = n => ops[ n ] === 'u' ? union : intersection;


        return _analyze( {
            op1:        op( 1 ),
            op2:        op( 2 ),
            accumulate: op( 0 ),
            adjacent:   opts.adjacent || 'succs',
            result:     res,
            constant1:  c1,
            constant2:  c2,
            direction:  opts.direction,
            useDomTree: opts.useDomTree
        } );
    }

    /**
     * @param {DataFlow} dataFlow
     * @return {Array<Set>}
     */
    function _analyze( dataFlow )
    {
        const
            {
                op1,
                op2,
                adjacent: _adjacent,
                constant1,
                constant2,
                accumulate,
                result,
                direction
            }        = dataFlow,
            adjacent = dataFlow.useDomTree ? 'dom' + _adjacent[ 0 ].toUpperCase() + _adjacent.substr( 1 ) : _adjacent;


        // if ( !result.length )
        //     blocks.forEach( () => result.push( new Set() ) );

        function _flow( index )
        {
            const
                prevSize = result[ index ] ? result[ index ].size : -1,
                curSet   = result[ index ] = tree[ adjacent ][ index ].reduce( ( u, i ) => accumulate( u, op1( constant1[ i ], op2( result[ i ] || new Set(), constant2[ i ] ) ) ), result && result[ index ] || new Set() );

            return curSet.size !== prevSize;
        }

        let changed = true;

        while ( changed )
        {
            changed = false;

            if ( !direction )
                changed = blocks.reduce( ( changed, block ) => _flow( block.id ) || changed, false );
            else
            {
                DFS( tree[ adjacent ], {
                    [ direction ]( blockIndex )
                    {
                        if ( _flow( blockIndex ) ) changed = true;
                    }
                } );
            }
        }

        return result;
    }

    return {
        analyze
    };
}

module.exports = {
    colors,
    warn,
    info,
    error,
    make_flow
};
