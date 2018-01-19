/** ******************************************************************************************************************
 * @file The main CFG definition class. Generally, you start here.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/

"use strict";

import AST            from './ast';
import create_new_cfg from './leader';
import { plugin, current }     from './utils';

const
    defaultOptions = {
        plugins:   [],
        ssaSource: false,
        parser:    {
            loc:          true,
            range:        true,
            comment:      true,
            tokens:       true,
            ecmaVersion:  9,
            sourceType:   'module',
            ecmaFeatures: {
                impliedStrict:                true,
                experimentalObjectRestSpread: true
            }
        }
    };

/**
 * @param {string} source
 * @param {object} [options]
 */
export default class CFG
{
    /**
     * @param {string} source
     * @param {object} [options]
     */
    constructor( source, options = defaultOptions )
    {
        const
            ecma = Object.assign( {}, defaultOptions.parser.ecmaFeatures, options.parser && options.parser.ecmaFeatures || {} ),
            p    = Object.assign( {}, defaultOptions.parser, options.parser || {} );

        this.options                     = Object.assign( {}, defaultOptions, options );
        this.options.parser              = p;
        this.options.parser.ecmaFeatures = ecma;

        current.cfg = this;
        plugin( 'cfg', 'init', this );
        this.ast  = new AST( source, this.options.parser );
        this.cfgs = [];
        plugin( 'cfg', 'postinit', this );
        this.preGen = false;
        this.preGenName = new Set();
    }

    /**
     * @return {string}
     */
    toString()
    {
        return this.cfgs.map( b => `${b}` ).join( '\n\n' );
    }

    /**
     * @return {string}
     */
    toTable()
    {
        return this.cfgs.map( b => b.toTable() ).join( '\n\n' );
    }

    /**
     * @param {string} [name]
     * @return {Array<CFGInfo>|CFG}
     */
    generate( name )
    {
        current.cfg = this;

        if ( !name )
        {
            for ( const func of this.ast.forFunctions() )
                this.cfgs.push( create_new_cfg( func, this.ast, this.options ) );

            if ( !this.preGen )
            {
                this.preGen = true;
                plugin( 'cfg', 'finish', this );
            }

            return this;
        }
        else
        {
            const func = [ ...this.ast.forFunctions() ].find( cfgInfo => cfgInfo.name === name );

            if ( !func )
                return null;

            const cfgInfo = create_new_cfg( func, this.ast, this.options );

            if ( !this.preGenName.has( name ) )
            {
                this.preGenName.add( name );
                plugin( 'cfg', 'finish', this );
            }

            return cfgInfo;
        }

    }

    /**
     * @param {string} name
     * @return {CFGInfo}
     */
    by_name( name )
    {
        return this.cfgs.find( cfg => cfg.name === name );
    }

    /**
     * @type {Iterable<CFGInfo>}
     */
    *[ Symbol.iterator ]()
    {
        yield *this.cfgs;
    }

    /**
     * @param {function(CFGInfo, number)} fn
     */
    forEach( fn )
    {
        this.cfgs.forEach( fn );
    }

    /**
     * @param {CFGInfo} cfg
     * @param {string} [title]
     * @return {string}
     */
    create_dot( cfg, title = cfg.name + ':' + cfg.lines.join( '-' ) )
    {
        return cfg.bm.create_dot( title );
    }
}
