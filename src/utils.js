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

    getset = o => o.hasOwnProperty( 'get' ) || o.hasOwnProperty( 'set' ),
    /**
     * Checks for `typeof f === 'function'`
     * @param {*} f
     */
    func = f => typeof f === 'function',
    /**
     * Checks for boolean type.
     * @param {*} b
     * @return {Boolean}
     */
    bool = b => typeof b === 'boolean',
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

/**
 * @param {?Array} arr
 * @param {Array} [result=[]]
 * @param {Boolean} [deep=true]
 * @return {Array}
 */
function flatten( arr, result = [], deep = true )
{
    if ( !Array.isArray( arr ) ) return [ arr ];

    const
        length = arr && arr.length;

    if ( !length ) return result;

    let index = -1;

    while ( ++index < length )
    {
        const value = arr[ index ];

        if ( Array.isArray( value ) )
        {
            if ( deep )
                flatten( value, result, true );
            else
                result.push( ...value );
        }
        else
            result[ result.length ] = value;
    }

    return result;
}

/**
 * Proper deep copy.
 *
 * @param {object} src      - source
 * @param {object} [_dest]  - Optional destination, if not present a new object will be created
 * @param {function(string, object):?object} [cb=null]
 * @param {boolean} [includeSymbols=false]  - Set this to also copy `Symbol` keyed values. You generally don't ever want this.
 */
function _deep_copy( src = {}, _dest = {}, cb = null, includeSymbols = false )
{
    const dest = _dest;

    let fields = [ ...Object.getOwnPropertyNames( src ) ];

    if ( includeSymbols ) fields = fields.concat( [ ...Object.getOwnPropertySymbols( src ) ] );

    for ( let name of fields )
    {
        let descriptor = Object.getOwnPropertyDescriptor( src, name );

        if ( !getset( descriptor ) )
            descriptor.value = copy_value( src[ name ], cb, includeSymbols );

        if ( cb !== null )
        {
            let resp = cb( name, descriptor );

            if ( resp )
            {
                if ( resp.name ) name = resp.name;
                if ( resp.descriptor ) descriptor = resp.descriptor;
            }
        }
        delete dest[ name ];
        Object.defineProperty( dest, name, descriptor );
    }

    return dest;
}

/**
 *
 * @param {RegExp} rx
 * @return {string}
 */
function regexpFlags( rx )
{
    return ( rx.global && 'g' ) + ( rx.ignoreCase && 'i' ) + ( rx.multiline && 'm' ) + ( rx.sticky && 'y' );
}

/**
 *
 * @param {*} value
 * @param {function} cb
 * @param {boolean} incl
 * @return {*}
 */
function copy_value( value, cb, incl )
{
    const kls = toString.call( value ).slice( 8, -1 ).toLowerCase();

    switch ( kls )
    {
        case 'object':
            return deep_copy( value, {}, cb, incl );
        case 'array':
            return value.map( v => copy_value( v, cb, incl ) );
        case 'regexp':
            const rx = new RegExp( value, regexpFlags( value ) );
            rx.source = value.source;
            rx.unicode = value.unicode;
            return rx;
        case 'date':
            return new Date( value.getTime() );
        case 'map':
            return new Map( [ ...value ] );
        case 'set':
            return new Set( [ ...value ] );
        default:
            return value;
    }
}

/**
 * Proper deep copy.
 *
 * @param {object} src      - source
 * @param {object|boolean|function(string, object):?object} [dest={}]  - Optional destination, if not present a new object will be created
 * @param {boolean|function(string, object):?object} [cb=null]
 * @param {boolean} [includeSymbols=false]
 */
function deep_copy( src, dest = {}, cb = null, includeSymbols = false )
{
    if ( arguments.length > 1 )
    {
        if ( arguments.length === 2 )
        {
            if ( func( dest ) )
            {
                cb   = dest;
                dest = {};
            }
            else if ( bool( dest ) )
            {
                includeSymbols = dest;
                dest           = {};
                cb             = null;
            }
        }
        else if ( arguments.length === 3 )
        {
            if ( func( dest ) )
            {
                cb   = dest;
                dest = {};
            }
            else if ( bool( cb ) )
            {
                includeSymbols = cb;
                cb             = null;
            }
        }
    }

    return _deep_copy( src, dest, cb, includeSymbols );
}

function assign( ...objs )
{
    return objs.reduce( ( all, cur ) => deep_copy( cur, all ), {} );
}

module.exports = {
    colors,
    warn,
    info,
    error,
    flatten,
    make_flow,
    clone: deep_copy,
    assign
};
