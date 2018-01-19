/** ******************************************************************************************************************
 * @file Description of file here.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date Sat Dec 16 2017
 *********************************************************************************************************************/
"use strict";

require                        = require( '@std/esm' )( module, { esm: 'js', cjs: true, sourceMap: true } );
const CFG                      = require( './src/cfg' ).default;
const { Block, Edge }          = require( './src/types' );
const { load_plugins, plugin } = require( './src/utils' );

let loaded = false;

/**
 * @param {string} s
 * @param {object} [o]
 * @return {CFG}
 */
function load( s, o )
{
    if ( !loaded && o && o.plugins )
    {
        loaded = true;
        load_plugins( o.plugins );
        plugin( 'general', 'postload' );
    }

    return new CFG( s, o );
}

module.exports = { CFG: load, Block, Edge };

