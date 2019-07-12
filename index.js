/** ******************************************************************************************************************
 * @file Description of file here.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date Sat Dec 16 2017
 *********************************************************************************************************************/
"use strict";

require               = require( 'esm' )( module, { mode: 'auto' } );   // eslint-disable-line no-native-reassign
const CFG             = require( './src/cfg' ).default;
const { Block, Edge } = require( './src/types' );
const {
          load_plugins,
          plugin,
          current
      }               = require( './src/utils' );

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
        plugin( 'general', 'postload', current );
    }

    return new CFG( s, o );
}

load.Block = Block;
load.Edge = Edge;

module.exports = load;

