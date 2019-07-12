/** ******************************************************************************************************************
 * @file Functions to dump out information as pretty CLI tables.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 03-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    Table              = require( 'cli-table3' ),
    chalk              = require( 'chalk' ),
    string             = s => typeof s === 'string',
    { isArray: array } = Array,
    headline           = s => chalk.yellowBright( s ),
    header             = s => chalk.cyanBright( s ),
    row                = r => r.map( s => chalk.whiteBright( s ) );

export const log = ( ...args ) => console.log( ...args );

/**
 * @param {string|string[]|string[][]} hdr
 * @param {string[]|string[][]} [headers]
 * @param {string[][]} [rows]
 */
function _as_table( hdr, headers, rows )
{
    let output,
        isRows   = a => array( a ) && array( a[ 0 ] ),
        isHeader = a => array( a ) && string( a[ 0 ] ),
        index    = a => isRows( a ) ? 2 : isHeader( a ) ? 1 : 0,
        args     = [];

    if ( hdr ) args[ index( hdr ) ] = hdr;
    if ( headers ) args[ index( headers ) ] = headers;
    if ( rows ) args[ index( rows ) ] = rows;

    [ hdr, headers, rows ] = args;

    if ( hdr ) hdr = headline( hdr );
    if ( headers ) headers = headers.map( header );
    if ( rows ) rows = rows.map( row );

    if ( hdr && headers && rows )
    {
        output = new Table( {
            head: [ { colSpan: rows[ 0 ].length, hAlign: 'center', content: hdr } ]
        } );
        output.push( headers );
    }
    else if ( !hdr && headers )
    {
        output = new Table( {
            head: headers
        } );
    }

    if ( rows )
        output.push( ...rows.map( row ) );

    return output;
}

/**
 * @param {string|string[]|string[][]} hdr
 * @param {string[]|string[][]} [headers]
 * @param {string[][]} [rows]
 * @return {string}
 */
export function str_table( hdr, headers, rows )
{
    return _as_table( hdr, headers, rows ).toString();
}
