/** ******************************************************************************************************************
 * @file Describe what symbol does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 15-Jan-2018
 *********************************************************************************************************************/
"use strict";

const
    { SymbolFlags } = require( '../types' );

/**
 * @implements ISymbol
 */
class Symbol
{
    /**
     * @param {?ISymbol} [sym]
     * @return {*}
     */
    constructor( sym )
    {
        if ( sym )
            this.copy_constructor( sym );
        else
            this.init();
    }

    /**
     * @param {Symbol} sym
     */
    copy_constructor( sym )
    {
        this.flags = sym.flags;
        this.name = sym.name;
        this.declarations = sym.declarations.slice();
        this.valueDeclaration = sym.valueDeclaration;
        this.members = sym.members.slice();
        this.exports = sym.exports;
        this.globalExports = sym.globalExports;
        this.id = ++Symbol.ID;
        this.mergeId = sym.mergeId;
        this.parent = sym.parent;
        this.exportSymbol = sym.exportSymbol;
        this.constEnumOnlyModule = sym.constEnumOnlyModule;
        this.isReferenced = sym.isReferenced;
        this.isReplaceableByMethod = sym.isReplaceableByMethod;
        this.isAssigned = sym.isAssigned;
    }

    init()
    {
        this.flags = SymbolFlags.None;
        this.name = null;
        this.declarations = [];
        this.valueDeclaration = null;
        this.members = new Map();
        this.exports = new Map();
        this.globalExports = new Map();
        this.id = ++Symbol.ID;
        this.mergeId = 0;
        this.parent = null;
        this.exportSymbol = null;
        this.constEnumOnlyModule = false;
        this.isReferenced = false;
        this.isReplaceableByMethod = false;
        this.isAssigned = false;
    }
}

Symbol.ID = 0;

module.exports = Symbol;
