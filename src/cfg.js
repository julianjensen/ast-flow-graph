/** ******************************************************************************************************************
 * @file Describe what cfg does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    // _inspect                                     = require( 'util' ).inspect,
    // inspect                                      = ( o, d ) => _inspect( o, { depth: typeof d === 'number' ? d : 2, colors: true } ),
    AST = require( './ast' ),
    CFGBuilder = require( './cfg-builder' ),
    { checks, Syntax } = require( './defines' ),
    all_methods        = cdecl => cdecl.body.body.map( node => node.type === Syntax.MethodDefinition && node ).filter( x => !!x ),
    BasicBlock         = require( './basic-block' ),
    BasicBlockList     = require( './basic-block-list' ),
    Scopes             = require( './scopes' );

/** */
class CFG
{
    /**
     * @param {string} source
     */
    constructor( source )
    {
        this.ast = new AST( source );
        this.cfgs = [];
        this.scopes = this.ast.create_scopes();
    }

    /**
     * @param {boolean} onlyMain
     * @return {Array<CFGBuilder>}
     */
    generate( onlyMain = false )
    {
        const opts = { ast: this.ast.ast, scopes: this.scopes, blockList: new BasicBlockList() };

        if ( !onlyMain ) opts.collector = obj => this.nested( obj );

        this.cfgs.push( new CFGBuilder( opts ) );

        return onlyMain ? this.cfgs[ 0 ] : this.cfgs;
    }

    /**
     * @param {string} name
     * @return {CFGBuilder}
     */
    by_name( name )
    {
        return this.cfgs.find( cfg => cfg.name === name );
    }

    /**
     * @type {Iterable<CFGBuilder>}
     */
    * [ Symbol.iterator ]()
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

    /**
     * @param {Node} node
     * @return {CFGBuilder}
     */
    create_cfg( node )
    {
        return new CFGBuilder( {
            ast: node,
            scopes: this.scopes,
            collector: obj => this.nested( obj ),
            blockList: new BasicBlockList()
        } );
    }

    /**
     * @param {object} obj
     */
    nested( obj )
    {
        const
            pre = BasicBlock.pre;

        switch ( obj.node.type )
        {
            case Syntax.ArrowFunctionExpression:
            case Syntax.FunctionExpression:
            case Syntax.FunctionDeclaration:
                this.cfgs.push( new CFGBuilder( { ast: obj.node, scopes: this.scopes, scope: this.scopes.current, collector: obj => this.nested( obj ), blockList: new BasicBlockList() } ) );
                break;

            case Syntax.MethodDefinition:
                this.cfgs.push( new CFGBuilder( { ast: obj.node, scopes: this.scopes, scope: this.scopes.current, collector: obj => this.nested( obj ), blockList: new BasicBlockList() } ) );
                break;

            case Syntax.ClassExpression:
            case Syntax.ClassDeclaration:
                this.scopes.add( checks.functionExpressionName( obj.node ), obj.current );
                this.scopes.push_scope( 'class', obj.node );
                all_methods( obj.node ).forEach( meth => this.cfgs.push( new CFGBuilder( { ast: meth, scopes: this.scopes, scope: this.scopes.current, collector: obj => this.nested( obj ), blockList: new BasicBlockList() } ) ) );
                this.scopes.pop_scope();
                break;
        }

        BasicBlock.pre = pre;
    }
}

module.exports = CFG;
