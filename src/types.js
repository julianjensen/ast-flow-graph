/** ******************************************************************************************************************
 * @file Think types.h
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 03-Jan-2018
 *********************************************************************************************************************/
"use strict";

/**
 * @param {object<string,number>} names
 * @return {Block|Edge|SymbolFlags|ModifierFlags}
 * @private
 */
function make_enum_from_object( names ) // , start = 0, bitWise = false )
{
    let __enum = {};

    Object.entries( names ).forEach( ( [ name, val ] ) => __enum[ __enum[ name ] = val ] = name );

    return __enum;
}


/**
 * @enum {number}
 * @name Block
 */
export let Block                = {
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
        THROW:     1024,
        CLEAR:     3,
        EXCLUSIVE: 15
    };
    /**
     * @type {Block}
     * @private
     */
    Block               = make_enum_from_object( Block );
    /**
     * @enum {number}
     * @name Edge
     */
export let    Edge                 = {
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

    };
    /**
     * @type {Edge}
     * @private
     */
    Edge                = make_enum_from_object( Edge );
    /**
     * The default display options for table and string output.
     */
export let    defaultOutputOptions = {
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

export const outputOptions = defaultOutputOptions;

/**
 * Override display options.
 *
 * @param options
 */
export function output( options = {} )
{
    Object.assign( outputOptions, defaultOutputOptions, options );
}

/**
 * Turns an `enum` into an array of strings.
 *
 * @param {enum} enumType
 * @param {number} val
 * @return {Array<string>}
 * @private
 */
export function enum_to_string( enumType, val )
{
    let vals = [];

    for ( let i = 1; i < 1 << 30; i = i << 1 )
    {
        if ( !( val & ~( i - 1 ) ) ) break;
        if ( val & i ) vals.push( enumType[ val & i ] );
    }

    return vals;
}
