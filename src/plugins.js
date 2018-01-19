/** ******************************************************************************************************************
 * @file Manage all the plugins.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Jan-2018
 *********************************************************************************************************************/
"use strict";

import { parse } from 'espree';

const
    func               = fn => typeof fn === 'function',
    obj                = o => typeof o === 'object' && !Array.isArray( o ) && o !== null,
    { isArray: array } = Array,
    isTop              = topKey => [ 'parse', 'cfg', 'ast', 'cfgblock', 'manager', 'general' ].includes( topKey.toLowerCase() ),
    forKeys            = ( o, cb ) => obj( o ) && Object.keys( o ).forEach( k => cb( o[ k ], k ) );

export default class PluginManager
{
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

    static load_module( moduleName )
    {
        try
        {
            return require( moduleName );
        }
        catch ( err )
        {
            return null;
        }
    }

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
        const
            top = this.callMap[ topKey ],
            sub = subKey && top[ subKey ];

        if ( func( top ) )
            return top( topKey, subKey, ...args );
        else if ( array( top ) && top.fn.length )
            top.fn.length.forEach( cb => cb( topKey, subKey, ...args ) );

        if ( func( sub ) )
            return sub( topKey, subKey, ...args );
        else if ( array( sub ) && sub.length )
            sub.length.forEach( cb => cb( topKey, subKey, ...args ) );
    }
}
