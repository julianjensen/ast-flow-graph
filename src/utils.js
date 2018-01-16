/** ******************************************************************************************************************
` * @file Describe what utils does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 01-Jan-2018
 *********************************************************************************************************************/
"use strict";

import DFS from 'traversals';
import { create_dom_tree, iterative, reverse_graph } from 'dominators';
import { inspect as _inspect } from 'util';
import chalk from 'chalk';

const
    union              = ( a, b ) => [ ...b ].reduce( ( s, name ) => s.add( name ), a ),
    _intersection      = ( small, large ) => [ ...small ].reduce( ( s, name ) => large.has( name ) ? s.add( name ) : s, new Set() ),
    intersection       = ( a, b ) => _intersection( ...( a.size < b.size ? [ a, b ] : [ b, a ] ) ),

    getset             = o => o.hasOwnProperty( 'get' ) || o.hasOwnProperty( 'set' );
export const
    /**
     * Checks for `typeof f === 'function'`
     * @param {*} f
     */
    func               = f => typeof f === 'function',
    /**
     * Checks for boolean type.
     * @param {*} b
     * @return {Boolean}
     */
    bool               = b => typeof b === 'boolean',
    number             = n => typeof n === 'number',
    isNumber           = n => /^[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?$/.test( n ),
    // _inspect            = require( 'util' ).inspect,
    string             = s => typeof s === 'string',
    toStr              = x => Object.prototype.toString.call( x );

export const
    { isArray: array } = Array;

export const
    obj = o => typeof o === 'object' && !array( o ) && o !== null,
    has = ( o, name ) => obj( o ) && Reflect.has( o, name ),
    inspect = ( o, d ) => _inspect( o, number( d ) ? { depth: d } : obj( d ) ? d : {} ),
    warn               = s => chalk.hex( '#ffd700' )( s ), // xterm( 220 ),
    error              = s => chalk.hex( '#ff0000' )( s ), // xterm( 196 ),
    info               = s => chalk.hex( '#87d7ff' )( s ), // xterm( 117 ),
    log                = console.log.bind( console );

export const
    colors             = {
        dark:  {
            green:  s => chalk.hex( '#00af00' )( s ), // 34
            blue:   s => chalk.hex( '#005fd7' )( s ), // 26
            cyan:   s => chalk.hex( '#00d7ff' )( s ), // 45
            purple: s => chalk.hex( '#5f00ff' )( s ), // 57
            red:    s => chalk.hex( '#d7005f' )( s ), // 161
            orange: s => chalk.hex( '#d75f5f' )( s ), // 167
            yellow: s => chalk.hex( '#d7d700' )( s ), // 184
            pink:   s => chalk.hex( '#d75fd7' )( s ), // 170
            gray:   s => chalk.hex( '#a8a8a8' )( s ) // 248
        },
        light: {
            green:  s => chalk.hex( '#87ff00' )( s ), // 118
            blue:   s => chalk.hex( '#00afff' )( s ), // 39
            cyan:   s => chalk.hex( '#87ffff' )( s ), // 123
            purple: s => chalk.hex( '#afafff' )( s ), // 147
            red:    s => chalk.hex( '#ff0000' )( s ), // 196
            orange: s => chalk.hex( '#ff8700' )( s ), // 208
            yellow: s => chalk.hex( '#ffff00' )( s ), // 226
            pink:   s => chalk.hex( '#ff87ff' )( s ), // 213
            gray:   s => chalk.hex( '#d0d0d0' )( s ) // 252
        },
        white: s => chalk.hex( '#ffffff' )( s )
    };

_inspect.defaultOptions = { depth: 4, colors: true };

export function make_flow( blocks, _idoms )
{
    const
        tree = {};

    tree.succs    = blocks.map( b => b.succs );
    tree.preds    = reverse_graph( tree.succs );
    tree.idoms    = _idoms || iterative( tree.succs );
    tree.domSuccs = create_dom_tree( tree.idoms );
    tree.domPreds = reverse_graph( tree.domSuccs );

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


        function _flow( index )
        {
            const
                prevSize = result[ index ] ? result[ index ].size : -1,
                curSet   = result[ index ] =
                    tree[ adjacent ][ index ].reduce( ( u, i ) => accumulate( u, op1( constant1[ i ], op2( result[ i ] || new Set(), constant2[ i ] ) ) ), result && result[ index ] || new Set() );

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
export function flatten( arr, result = [], deep = true )
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
            const rx   = new RegExp( value, regexpFlags( value ) );
            rx.source  = value.source;
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

export function assign( ...objs )
{
    return objs.reduce( ( all, cur ) => deep_copy( cur, all ), {} );
}

function trace_class( cls )
{
    const
        done     = new Set(),
        p        = cls.prototype,
        stringer = x => {
            if ( has( x, 'id' ) )
                return '' + x.id;
            else if ( has( x, '_preds' ) )
                return 'Edges';
            else if ( obj( x ) )
                return _inspect( x, { depth: 0, colors: false } );
            else if ( array( x ) )
            {
                x = x.map( stringer );
                if ( x.length > 20 )
                    return '[ ' + x.slice( 0, 20 ).join( ', ' ) + ', ... ]';
                else
                    return `[ ${x.join( ', ' )} ]`;
            }
            else if ( number( x ) )
                return '' + x;
            else if ( x === void 0 )
                return 'void';
            else
                return toStr( x );
        },
        callLine = ( lns, lnum ) => {
            let ln = lns.slice( lnum, lnum + 1 )[ 0 ],
                m  = ln.match( /^\s*at\s([^(]+)\(.*\/([-_a-zA-Z]+\.js):(\d+)/ );

            if ( !m )
            {
                ln = lns.slice( lnum - 1, lnum )[ 0 ];
                m  = ln.match( /^\s*at\s([^(]+)\(.*\/([-_a-zA-Z]+\.js):(\d+)/ );
            }

            return { site: m[ 1 ].trim(), file: m[ 2 ], line: m[ 3 ] };
        };

    for ( const [ name, desc ] of Object.entries( Object.getOwnPropertyDescriptors( p ) ) )
    {
        if ( !string( name ) || !func( desc.value ) || done.has( desc.value ) || name === 'toString' ) continue;

        done.add( desc.value );

        const fn = p[ name ];

        p[ name ] = function( ...args ) {
            const
                __args = args.slice(),
                debStr = cls.name + '::' + name + '( ',
                caller = callLine( new Error().stack.split( /\r?\n/ ), 3 );

            for ( const [ i, x ] of __args.entries() )
                __args[ i ] = stringer( x );


            const
                r = fn.call( this, ...args );

            if ( !name.startsWith( '_' ) ) log( debStr + __args.join( ', ' ) + ' ) -> ' + stringer( r ) + `(from function "${caller.site}" in ${caller.file} on line ${caller.line})` );
            return r;
        };
    }
}

/**
 *
 * @param {object} obj
 * @param {string} path
 * @param {*} [value]
 * @return {*}
 */
export function deep_object_set( obj, path, value )
{
    if ( !obj || !string( path ) ) throw new Error( `deep_object_set() has bad parameters, obj = ${obj}, path = ${path}` );

    const
        p     = path.split( '.' ),
        field = p.pop();

    let tip = obj;

    for ( const part of p )
        tip = tip[ part ] = tip[ part ] || {};

    if ( arguments.length === 2 ) return tip[ field ];

    tip[ field ] = string( value ) && isNumber( value ) ? Number( value ) : value;

    return obj;
}

export const clone = deep_copy;

// module.exports = {
//     // colors,
//     // warn,
//     // info,
//     // error,
//     // flatten,
//     // make_flow,
//     // clone: deep_copy,
//     // assign,
//     // trace_class,
//     deep_object_set,
//     // inspect,
//     // array,
//     // obj,
//     // func
// };
