/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    AST = require( './ast' ),
    create_new_cfg = require( './cfg-leader' ),
    defaultOptions = {
        loc: true,
        range: true,
        ecmaVersion: 9,
        sourceType: 'module',
        ecmaFeatures: {
            impliedStrict: true,
            experimentalObjectRestSpread: true
        }
    };

/** */
class CFG
{
    /**
     * @param {string} source
     */
    constructor( source, options = defaultOptions )
    {
        this.options = Object.assign( {}, defaultOptions, options );
        this.options.ecmaFeatures = Object.assign( {}, defaultOptions.ecmaFeatures, options.ecmaFeatures );

        this.ast = new AST( source, this.options );
        this.cfgs = [];
        this.scopes = this.ast.escope;
    }

    toString()
    {
        return this.cfgs.map( b => `${b}` ).join( '\n\n' ); // .name}:${b.lines[ 0 ]}-${b.lines[ 1 ]}\n${b.bm}` ).join( '\n\n' );
    }

    toTable()
    {
        return this.cfgs.map( b => b.toTable() ).join( '\n\n' );
    }

    /**
     * @param {string} [name]
     * @return {Array<CFGInfo>}
     */
    generate( name )
    {
        if ( !name )
        {
            for ( const func of this.ast.forFunctions() )
                this.cfgs.push( create_new_cfg( func, this.ast ) );
        }
        else
        {
            const func = [ ...this.ast.forFunctions() ].find( cfgInfo => cfgInfo.name === name );

            if ( !func )
                return null;

            return create_new_cfg( func, this.ast );
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
     * @param {function(BasicBlock, number)} fn
     */
    forEach( fn )
    {
        this.cfgs.forEach( fn );
    }

    create_dot( cfg, title = cfg.name + ':' + cfg.lines.join( '-' ) )
    {
        return cfg.bm.create_dot( title );
    }
}

module.exports = CFG;
