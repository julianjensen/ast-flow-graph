/** ******************************************************************************************************************
 * @file Description of file here.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date Sat Dec 16 2017
 *********************************************************************************************************************/
"use strict";

require = require( '@std/esm' )( module, { esm: 'js', cjs: true, sourceMap: true } );
const { CFG } = require( './src/cfg' ).default;
const { Block, Edge } = require( './src/types' );
module.exports = { CFG, Block, Edge };
// module.exports = require( './src/cfg' ).default;

