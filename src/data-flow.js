/** ******************************************************************************************************************
 * @file Generic data-flow solver thingy.
 * @description
 *
 * Data flows are generally solved using something that looks like this:
 * 𝑓(𝑥) = 𝐶₁ op₁ (𝑋ₐ op₂ 𝐶₂)
 * or, more specifically:
 * 𝑓(𝐵ₓ) = ∀𝑋ₐ 𝑜𝑝₀ (𝐶₁ 𝑜𝑝₁ (𝑋ₐ 𝑜𝑝₂ 𝐶₂))
 *
 * In other words, to calculate a set 𝑋 on Block 𝐵 we go through every
 * set 𝑋 of the adjacent blocks (successors or predecessors) and combine
 * them using some operator 𝑜𝑝₀ where set 𝑋ₐ is built using 𝐶₁ 𝑜𝑝₁ (𝑋ₐ 𝑜𝑝₂ 𝐶₂)
 * with the various operators usually being union or intersection.
 *
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 01-Jan-2018
 *********************************************************************************************************************/
"use strict";

const
    _intersection = ( small, large ) => [ ...small ].reduce( ( s, name ) => large.has( name ) ? s.add( name ) : s, new Set() ),
    operators = {
        union: ( a, b ) => [ ...b ].reduce( ( s, name ) => s.add( name ), a ),
        intersection: ( a, b ) => _intersection( ...( a.size < b.size ? [ a, b ] : [ b, a ] ) ),
        subtract: ( a, b ) => [ ...a ].reduce( ( newSet, name ) => b.has( name ) ? newSet : newSet.add( name ), new Set() )
    };

/**
 * @param result
 * @param {function(Set, Set): Set} op2
 * @param {string} c2
 * @return {function(BlockThing):Set}
 */
function right_side_expr( result, op2, c2 )
{
    return current => op2( current[ result ], current[ c2 ] );
}

/**
 * @param {string} c1
 * @param {function(Set, Set): Set} op1
 * @param {function(BlockThing): Set} rhs
 * @return {function(BlockThing): Set}
 */
function left_and_right( c1, op1, rhs )
{
    return current => op1( current[ c1 ], rhs( current ) );
}

/**
 * @param {function(Set, Set): Set} op0
 * @param {function(BlockThing): Set} rest_calc
 * @return {function(Set, BlockThing): Set}
 */
function accumulate( op0, rest_calc )
{
    return ( accum, current ) => op0( accum, rest_calc( current ) );
}

/**
 * @param {string} c1
 * @param {string} result
 * @param {string} c2
 * @param {string} op0
 * @param {string} op1
 * @param {string} op2
 * @param {function(): Set} start
 * @return {function(Array<BlockThing>): Set}
 */
export default function create_data_flow( { c1, result, c2, op0, op1, op2, start = () => new Set() } )
{
    const
        triOp = ( op, lhs, rhs ) => operators[ op ]( lhs, rhs ),
        accum1 = ( acc, current ) => operators[ op0 ]( acc, triOp( op1, current[ c1 ], triOp( op2, current[ result ], current[ c2 ] ) ) ),
        accum = accumulate( operators[ op0 ], left_and_right( c1, operators[ op1 ], right_side_expr( result, operators[ op2 ], c2 ) ) );

    return blocks => blocks.reduce( accum1, start() );
}



