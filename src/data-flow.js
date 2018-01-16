/** ******************************************************************************************************************
 * @file Generic data-flow solver thingy.
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
 * h(x) = c1 op1 ( x op2 c2 )
 * g(y) = ( x op2 c2 ) => op2( current.x, current.c2 )
 * f( c1, op1, result, op2, c2 ) => op1( current.c1, g(y) )
 * ∀block result = op0( ∀adj -> f( c1, op1, adj.result, op2, c2 ) )
 */

function right_side_expr( result, op2, c2 )
{
    return current => op2( current[ result ], current[ c2 ] );
}

function left_and_right( c1, op1, rhs )
{
    return current => op1( current[ c1 ], rhs( current ) );
}

function accumulate( op0, rest_calc )
{
    return ( accum, current ) => op0( accum, rest_calc( current ) );
}

export default function create_data_flow( { c1, result, c2, op0, op1, op2, start = new Set() } )
{
    const
        rhs = right_side_expr( result, operators[ op2 ], c2 ),
        lar = left_and_right( c1, operators[ op1 ], rhs ),
        accum = accumulate( operators[ op0 ], lar );

    return blocks => blocks.reduce( accum, start );
}



