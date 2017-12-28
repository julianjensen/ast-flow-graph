/** ******************************************************************************************************************
 * @file Handle LiveOut, UE, and VarKill sets.
 *
 * ### UEVar
 * This is the Upward Exposed variables in a given block. This means that they are live when we enter a given block.
 * Basically, they represent variables that are used in block _n_ before any definition in _n_.
 *
 * ### VarKill
 * The set of all variables defined in a given block, i.e. assigned to or declared.
 *
 * ### VarKill (`not` or "overline")
 * The set of all variables _not_ defined in a given block.
 *
 * `LiveOut` is the union of all successor set defined as
 * LiveOut( n ) = ( UEVar(m) ⋃ ( UEVar(m) ⋂ ~VarKill(m) ) )
 *
 * varKill <= vars defined in _n_ and used after
 * ueVar <= vars defined in _n_ but used before
 * ~varKill <= vars used in _n_ but never defined
 *
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    assert = require( 'assert' ),
    inspect = require( 'util' ).inspect,
    $ = ( o, d = 4 ) => inspect( o, { depth: d, colors: true } ),
    { Syntax } = require( 'espree' ),
    { iterative, frontiers_from_succs, normalize } = require( 'dominators' );

/**
 * @typedef {object} VarInstance
 * @property {string} type          - rhs, def, decl, param
 * @property {string} name          - Variable name
 * @property {Node} node
 */

/**
 * @typedef {object} SymbolTable
 * @property {Array<VarInstance>} defs
 * @property {Array<VarInstance>} decls
 * @property {Array<VarInstance>} params
 * @property {Array<VarInstance>} rhs       - Usage
 * @property {Array<VarInstance>} varKill   - All definitions,d eclarations, and parameters together
 */

/**
 *
 * @param {CFGBlock} block
 * @return {boolean}
 */
function recompute( block )
{
    assert( block.liveOut );
    assert( block.ueVar );
    assert( block.notVarKill );
    assert( block.varKill );

    for ( const s of block.succs )
    {
        // if ( !s.liveOut )
        // {
        //     console.log( $( s ) );
        //     console.log( 'succs:', s.preds.map( p => $( p.succs ) ).join( '\n' ) );
        // }
        assert( s.liveOut );
        assert( s.ueVar );
        assert( s.notVarKill );
        assert( s.varKill );
    }

    const
        prevSet      = block.liveOut,
        curSet       = block.liveOut = block.succs.reduce( ( u, s ) => union( u, union( s.ueVar, intersection( s.liveOut, s.notVarKill ) ) ), new Set() );

    for ( const varName of curSet )
    {
        if ( prevSet.has( varName ) )
            prevSet.delete( varName );
        else
            return true;
    }

    return !!prevSet.size;
}

/**
 * @param {CFGInfo} cfg
 */
function liveOut( cfg )
{
    let initCount = 0;

    cfg.bm.forEach( block => {
        initCount++;
        init( block, block.varList );
    } );

    let changed = true,
        iterCount = 0,
        recompCount = 0;

    while ( changed )
    {
        ++iterCount;
        if ( iterCount > 20 )
        {
            console.log( `Too many iterations for ${cfg.name}` );
            process.exit( 1 );
        }
        changed = false;

        recompCount = 0;
        for ( const block of cfg.bm )
        {
            recompCount++;
            if ( recompute( block ) ) changed = true;
        }

        assert( initCount === recompCount, `Bad counts, init: ${initCount}, recomp: ${recompCount}` );
    }
}

function init( block, varList )
{
    if ( !varList ) return;

    const
        seen    = new Set(),
        used    = new Set(),
        varKill = new Set(),
        ueVar   = new Set();

    for ( const v of varList )
    {
        if ( v.type === 'use' )
        {
            if ( !seen.has( v.name ) )
            {
                seen.add( v.name );
                used.add( v.name );
            }

            if ( !varKill.has( v.name ) )
                ueVar.add( v.name );
        }
        else
        {
            varKill.add( v.name );
            used.delete( v.name );
        }
    }

    block.notVarKill = used;
    block.ueVar      = ueVar;
    block.varKill    = varKill;
    block.liveOut    = new Set();
}

function union( a, b )
{
    b.forEach( name => a.add( name ) );

    return a;
}

function intersection( a, b )
{
    const
        inter    = new Set(),
        smallest = a.size < b.size ? a : b;

    smallest.forEach( name => {
        if ( b.has( name ) )
        {
            inter.add( name );
            b.delete( name );
        }
    } );

    return inter;
}

/**
 * @param {ScopeManager|ModuleScope} scope
 */
function initialize( scope )
{
    if ( !scope ) return;

    if ( scope.variables )
    {
        scope.variables.forEach( v => {
            const varName = v.name;

            if ( v.defs )
                v.defs.forEach( def => define_identifier( varName, def.node ) );

            if ( v.references )
                v.references.filter( ref => v.defs && !v.defs.map( d => d.name ).includes( ref.identifier ) ).forEach( ref => reference_identifier( varName, ref.identifier ) );
        } );
    }

    if ( scope.childScopes )
        scope.childScopes.forEach( initialize );
}

function define_identifier( name, node )
{
    while ( node && !node.cfg )
        node = node.parent;

    if ( !node )
    {
        console.error( `No block found for identifier definition for "${name}" in node: ${node}` );
        return;
    }

    node.cfg.varList.push( { type: 'def', name, line: node.loc.start.line } );
}

function reference_identifier( name, node )
{
    const verdict = is_def( node );

    if ( verdict === 'def' ) return define_identifier( name, node );
    else if ( verdict === 'ignore' ) return;

    while ( node && !node.cfg )
        node = node.parent;

    if ( !node )
    {
        console.error( `No block found for identifier reference for "${name}" in node: ${node}` );
        return;
    }

    node.cfg.varList.push( { type: 'use', name, line: node.loc.start.line } );
}

function is_def( node )
{
    if ( !node || !node.parent ) return 'unknown';

    const
        parent = node.parent,
        ptype = parent && parent.type;

    switch ( ptype )
    {
        case Syntax.AssignmentExpression:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
            if ( parent.left === node ) return 'def';
            if ( parent.right === node ) return 'use';
            break;

        case Syntax.VariableDeclarator:
            if ( parent.id === node ) return 'def';
            if ( parent.init === node ) return 'use';
            break;

        case Syntax.UpdateExpression:
            if ( parent.argument === node ) return 'def';
            break;

        case Syntax.MemberExpression:
            return 'ignore';
    }

    return is_def( parent );
}

function compute_globals( bm )
{
    const
        globals = new Set(),
        varToBlocks = Object.create( null ),
        succs = [];

    bm.forEach( b => {
        succs.push( b.succs.map( b => b.id ) );
        b.globalVarKill = new Set();
    } );

    bm.idoms = iterative( succs );
    bm.frontiers = frontiers_from_succs( succs, bm.idoms );

    for ( const block of bm )
    {
        if ( !block.varList ) continue;

        const
            seen    = new Set(),
            used    = new Set();

        for ( const v of block.varList )
        {
            if ( v.type === 'use' )
            {
                if ( !seen.has( v.name ) )
                {
                    seen.add( v.name );
                    used.add( v.name );
                }

                if ( !block.globalVarKill.has( v.name ) )
                    globals.add( v.name );
            }
            else
            {
                block.globalVarKill.add( v.name );
                used.delete( v.name );
            }

            if ( !varToBlocks[ v.name ] ) varToBlocks[ v.name ] = new Set();
            if ( typeof varToBlocks[ v.name ].add !== 'function' )
            {
                console.log( 'v:', v );
                console.log( 'vtb[vn]:', varToBlocks[ v.name ] );
            }
            varToBlocks[ v.name ].add( block );
        }

        globals.forEach( name => {
            const worklist = [ ...varToBlocks[ name ] ];

            while ( worklist.length )
            {
                const
                    b = worklist.pop();

                bm.frontiers[ b.id ].forEach( d => {
                    d = bm.blocks[ d ];
                    if ( !d.hasPhi( name ) )
                    {
                        d.addPhi( name, b );
                        worklist.push( d );
                    }
                } );
            }
        } );

    }
}

module.exports = {
    initialize,
    liveOut,
    compute_globals
};
