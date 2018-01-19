/** ******************************************************************************************************************
 ` * @file Describe what utils does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 01-Jan-2018
 *********************************************************************************************************************/
"use strict";

import chalk from 'chalk';
import PluginManager from './plugins';

/**
 * @type {PluginManager}
 */
let pluginManager;

export const
    { isArray: array } = Array,

    warn               = s => chalk.hex( '#ffd700' )( s ), // xterm( 220 ),
    error              = s => chalk.hex( '#ff0000' )( s ), // xterm( 196 ),
    info               = s => chalk.hex( '#87d7ff' )( s ), // xterm( 117 ),
    log                = console.log.bind( console ),

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
    },

    dull               = {
        LEFT_EDGES:  ' <-- ', // ' ←── ',
        RIGHT_EDGES: ' --> ', // ' ──→ ',
        AST_NODES:   ' => ',
        TRUE_EDGE:   '+', // '✔',
        FALSE_EDGE:  '-', // '✖',
        START_NODE:  '+', // '→',
        EXIT_NODE:   '$' // '⛔',
    },
    nice               = {
        LEFT_EDGES:  ' ←── ',
        RIGHT_EDGES: ' ──→ ',
        AST_NODES:   ' => ',
        TRUE_EDGE:   colors.dark.green( '✔' ),
        FALSE_EDGE:  colors.light.red( '✖' ),
        START_NODE:  colors.dark.orange( '→' ),
        EXIT_NODE:   '⛔'
    },
    display_options    = function( fancy ) {
        return Object.assign( { SPACE_PER_EDGE: 4, MAX_EDGES: 7 }, fancy ? nice : dull );
    },
    current = {
        cfg: null,
        blockManager: null,
        ast: null,
        block: null
    },
    /**
     * @param {Array<string>} list
     * @private
     */
    load_plugins = function( list ) {
        pluginManager = new PluginManager( list || [] );
        pluginManager.load_plugins();
    },
    /**
     * @param {string} topKey
     * @param {?string} subKey
     * @param {...*} args
     * @return {*}
     * @private
     */
    plugin = function( topKey, subKey, ...args ) {
        if ( pluginManager ) return pluginManager.callback( topKey, subKey, ...args );
    };
