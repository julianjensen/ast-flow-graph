/** ******************************************************************************************************************
 * @file Think types.h
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 03-Jan-2018
 *********************************************************************************************************************/
"use strict";

/**
 * @param {Array<string>} names
 * @param {number} [start=0]
 * @param {boolean} [bitWise=false]
 * @return {object<string|number,string|number>}
 */
function make_enum( names, start = 0, bitWise = false )
{
    let __enum = {};

    names.forEach( ( name, i ) => __enum[ __enum[ name ] = ( bitWise ? ( ( start || 1 ) << i ) : ( start + 1 ) ) ] = name );

    return __enum;
}

/**
 * @param {object<string,number>} names
 * @param {number} [start=0]
 * @param {boolean} [bitWise=false]
 * @return {Block|Edge}
 */
function make_enum_from_object( names, start = 0, bitWise = false )
{
    let __enum = {};

    Object.entries( names ).forEach( ( [ name, val ] ) => __enum[ __enum[ name ] = val ] = name );

    return __enum;
}


/**
 * @enum
 */
const Block = {
    NONE:      0,
    START:     1,
    EXIT:      2,
    NORMAL:    4,
    TEST:      8,
    LOOP:      16,
    CONVERGE:  32,
    TEMPORARY: 64,
    DELETED:   128,
    CATCH:     512,
    THROW:     4096,
    CLEAR:     3,
    EXCLUSIVE: 15
},
      /** @type {Block} */
_Block                = make_enum_from_object( Block ),
      /**
       * @enum
       */
      Edge = {
          NONE:      0,
          TREE:      1,
          FORWARD:   2,
          BACK:      4,
          CROSS:     8,
          JUMP:      256,
          EXCEPTION: 512,
          RETURN:    1024,
          BREAK:     2048,
          CONTINUE:  4096,
          TRUE:      8192,
          FALSE:     16384,
          LOOP:      32768,
          CLEAR:     255

      },
      /**
       * @type {Edge}
       */
      _Edge                 = make_enum_from_object( Edge ),
      // {
      //     NONE:      0,
      //     START:     1,
      //     EXIT:      2,
      //     NORMAL:    4,
      //     TEST:      8,
      //     LOOP:      16,
      //     CONVERGE:  32,
      //     TEMPORARY: 64,
      //     DELETED:   128,
      //     CATCH:     512,
      //     THROW:     4096,
      //     CLEAR:     3,
      //     EXCLUSIVE: 15
      // },
      // Edge = {
      //     NONE:      0,
      //     TREE:      1,
      //     FORWARD:   2,
      //     BACK:      4,
      //     CROSS:     8,
      //     JUMP:      256,
      //     EXCEPTION: 512,
      //     RETURN:    1024,
      //     BREAK:     2048,
      //     CONTINUE:  4096,
      //     TRUE:      8192,
      //     FALSE:     16384,
      //     LOOP:      32768,
      //     CLEAR:     255
      //
      // },
      /** */
      defaultOutputOptions = {
          MAX_EDGES_TO_PRINT: 7,
          SPACE_PER_EDGE:     4,
          LEFT_EDGES:         ' <-- ', // ' ←── ',
          RIGHT_EDGES:        ' --> ', // ' ──→ ',
          AST_NODES:          ' => ',
          TRUE_EDGE:          '+', // '✔',
          FALSE_EDGE:         '-', // '✖',
          START_NODE:         '+', // '→',
          EXIT_NODE:          '$' // '⛔',
      };

let outputOptions = defaultOutputOptions;

// BlockManager.TEST      = 'test';
// BlockManager.TRUE      = 'true';
// BlockManager.FALSE     = 'false';
// BlockManager.NORMAL    = 'normal';
// BlockManager.EXCEPTION = 'exception';
// BlockManager.CATCH     = 'catch';
// BlockManager.BREAK     = 'break';
// BlockManager.CONTINUE  = 'continue';
// BlockManager.LOOP      = 'loop';
// BlockManager.THROW     = 'throw';
// BlockManager.START     = 'start';
// BlockManager.EXIT      = 'exit';
// BlockManager.CONVERGE  = 'converge';
// BlockManager.TEMPORARY = 'temporary';
// BlockManager.DELETED   = 'deleted';

function output( options = {} )
{
    Object.assign( outputOptions, defaultOutputOptions, options );
}

function enum_to_string( enumType, val )
{
    let vals = [];

    for ( let i = 1; i < 1 << 30; i = i << 1 )
    {
        if ( !( val & ~( i - 1 ) ) ) break;
        if ( val & i ) vals.push( enumType[ val & i ] );
    }

    return vals;
}

module.exports = {
    Block: _Block, Edge: _Edge, outputOptions,
    enum_to_string,
    output
};
