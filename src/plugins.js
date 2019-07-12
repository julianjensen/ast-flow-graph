/** ******************************************************************************************************************
 * @file Manage all the plugins.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Jan-2018
 *********************************************************************************************************************/
"use strict";

import { parse } from 'espree';
import { format } from 'util';

let debugTrack = false;

const
    func               = fn => typeof fn === 'function',
    obj                = o => typeof o === 'object' && !Array.isArray( o ) && o !== null,
    { isArray: array } = Array,
    isTop              = topKey => [ 'parse', 'cfg', 'ast', 'cfgblock', 'manager', 'general' ].includes( topKey.toLowerCase() ),
    forKeys            = ( o, cb ) => obj( o ) && Object.keys( o ).forEach( k => cb( o[ k ], k ) ),
    dout               = ( ...args ) => debugTrack && process.stdout.write( format( ...args ) ),
    dlog               = ( ...args ) => debugTrack && console.log( ...args );

/** */
export default class PluginManager
{
    /**
     * @param {Array<string>} pluginList
     */
    constructor( pluginList )
    {
        this.pluginList   = pluginList;
        this.callMap      = {
            cfg:          {
                fn:       [],
                init:     [],
                postInit: [],
                finish:   []
            },
            ast:          {
                fn:       [],
                init:     [],
                postInit: [],
                finish:   []
            },
            cfgblock:     {
                fn:         [],
                init:       [],
                finish:     [],
                postFinish: []
            },
            blockmanager: {
                fn:         [],
                init:       [],
                postInit:   [],
                finish:     [],
                postFinish: []
            },
            output:       {
                tableheaders: [],
                tablerows:    [],
                asstring:     [],
                json:         []
            },
            general:      {
                postload: [],
                preexit:  []
            },
            parse:        ( tk, sk, source, options ) => parse( source, options )
        };
        this.allFunctions = [];
    }

    /**
     * @param {string} moduleName
     * @static
     */
    static load_module( moduleName )
    {
        try
        {
            dout( `Attempting to load "${moduleName}"...` );
            const m = require( moduleName );
            dlog( 'ok' );
            return m;
        }
        catch ( err )
        {
            dlog( 'fail:', err );
            return null;
        }
    }

    /** */
    load_plugins()
    {
        const
            add_function = fn => this.allFunctions.includes( fn ) || this.allFunctions.push( fn );

        this.plugins = this.pluginList.map( pluginModule => PluginManager.load_module( pluginModule ) ).filter( m => !!m );

        this.plugins.forEach( plugin => {
            const
                cbs   = func( plugin ) ? plugin() : plugin,
                all   = {},
                group = key => all[ key ] || ( all[ key ] = {} ),
                _add  = grp => key => grp[ key ] || ( grp[ key ] = [] );

            if ( typeof cbs !== 'object' || Array.isArray( cbs ) || cbs === null ) return;

            forKeys( cbs, ( value, topKey ) => {

                if ( !isTop( topKey ) ) return;

                let add    = _add( group( topKey ) ),
                    add_fn = ( fn, subKey ) => {
                        add( subKey || 'fn' ).push( fn );
                        add_function( fn );
                    };

                if ( func( value ) )
                {
                    value = value();

                    if ( func( value ) )
                        return add_fn( value );
                }

                if ( obj( value ) )
                    forKeys( value, add_fn );
            } );
        } );
    }

    /**
     * @param {string} topKey
     * @param {?string} subKey
     * @param { ...*} args
     * @return {*}
     */
    callback( topKey, subKey, ...args )
    {
        dout( `Plugin callback for ${topKey}.${subKey || '*'} = ` );
        const
            top = this.callMap[ topKey ],
            sub = subKey && top[ subKey ];

        dout( `top func? ${func( top )}, top array? ${array( top.fn )} [${array( top.fn ) && top.fn.length}]` );
        if ( func( top ) )
        {
            dlog( ' done' );
            return top( topKey, subKey, ...args );
        }
        else if ( array( top ) && top.fn.length )
            top.fn.length.forEach( cb => cb( topKey, subKey, ...args ) );

        dout( `, sub func? ${func( top )}, top array? ${array( top.fn )} [${array( top.fn ) && top.fn.length}]` );
        if ( func( sub ) )
        {
            dlog( ' done' );
            return sub( topKey, subKey, ...args );
        }
        else if ( array( sub ) && sub.length )
            sub.length.forEach( cb => cb( topKey, subKey, ...args ) );

        dlog( ' done' );
    }
}
