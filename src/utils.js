/** ******************************************************************************************************************
` * @file Describe what utils does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 01-Jan-2018
 *********************************************************************************************************************/
"use strict";

import chalk from 'chalk';

const
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
    string             = s => typeof s === 'string';

export const
    { isArray: array } = Array;

export const
    obj = o => typeof o === 'object' && !array( o ) && o !== null,
    has = ( o, name ) => obj( o ) && Reflect.has( o, name ),
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
