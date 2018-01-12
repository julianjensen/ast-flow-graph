/** ******************************************************************************************************************
 * @file Describe what variables does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 29-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    assign        = require( './utils' ).assign,
    { DFS }       = require( 'traversals' ),
    {
        iterative,
        frontiers_from_succs,
        make_dom,
        create_dom_tree,
        reverse_graph
    }             = require( 'dominators' ),

    union         = ( a, b ) => [ ...b ].reduce( ( s, name ) => s.add( name ), a ),
    _intersection = ( small, large ) => [ ...small ].reduce( ( s, name ) => large.has( name ) ? s.add( name ) : s, new Set() ),
    intersection  = ( a, b ) => _intersection( ...( a.size < b.size ? [ a, b ] : [ b, a ] ) ),
    subtract      = ( a, b ) => [ ...a ].reduce( ( newSet, name ) => b.has( name ) ? newSet : newSet.add( name ), new Set() ),

    /**
     *
     * @param {CFGBlock} block
     * @return {BlockThing}
     */
    blockVars     = block => ( {
        ueVar:      null,
        varKill:    null,
        notVarKill: null,
        liveOut:    null,
        varList:    [],
        declNames:  new Set(),
        phi:        new Map(),
        succs:      block.succs.map( b => b.id ),
        id:         block.id,
        block
    } );

/**
 * @param {BlockManager} bm
 * @param {AST} ast
 * @param {Scope} topScope
 */
function variables( bm, ast, topScope )
{
    const
        /** @type {Scope} */
        stopScope    = topScope.upper,
        /** @type {Set<string>} */
        shadows      = new Set(),
        /** @type {Map<Scope, VarRef>} */
        scopeToDecls = new Map(),
        /** @type {Array<BlockThing>} */
        blocks       = bm.map( blockVars ),
        /** @type {Map<string,Set<number>>} */
        defSet       = new Map(),
        /** @type {Map<string, Set>} */
        all          = new Map();

    let dom,
        idoms,
        frontiers,
        domTree,
        preds,
        postDoms,
        postDomFrontiers,
        options = {
            ssaSource: true
        };

    options = assign( {}, options, bm.options );

    reverse_graph( blocks.map( b => b.succs ) ).forEach( ( p, i ) => blocks[ i ].preds = p );

    /**
     * This adds a variable to the block. The type will be either 'use' or 'def'. For array indexing
     * and object properties, it will add every step of the chain, as follows. For a 'use' of, for example,
     * `a.b.c` it will add 'use' entries for `a`, `a.b`, and `a.b.c`. For a 'def', it will add 'use' entries
     * for `RHS`, `RHS.a`, `RHS.a.b`, and a 'def' antry for `RHS.a.b.c`.
     * NOTE: It doesn't currently add the `RHS` part. Working on it.
     *
     * We also make a note of whether or not it's a declaration since we need to worry about scope in those
     * cases. For scoped variables that shadow some variable in an outher scope, I rename those in inner
     * scopes, which is the simplest way of making everything work.
     *
     * @param {CFGBlock} _block
     * @param {string} name     - Variable name
     * @param {string} type     - Either 'use' or 'def'
     * @param index             - AST node index
     * @param {boolean} isDecl  - If this is a declaration, it may shadow a similarly named variable in an outer scope
     * @param {boolean} [implied=false]
     * @param {boolean} [renameTarget=false]
     */
    function add_var( _block, { name, type, index, isDecl, implied = false, renameTarget } )
    {
        /** @type {BlockThing} */
        const block = blocks[ _block.id ];

        if ( !name ) return;

        const hasVar = block.varList.find( av => av.name === name && av.type === type && av.index === index );

        if ( hasVar ) return;

        const
            node = ast.nodesByIndex[ index ],
            va   = { name, type, index, isDecl, node, scope: node.scope, implied, renameTarget };

        block.varList.push( va );

        if ( !isDecl )
            _is_use( va );
        else
        {
            if ( !block.declNames.has( name ) )
                block.declNames.add( name );

            _is_decl( va );
        }

        if ( !all.has( va.scopedName || va.name ) )
            all.set( va.scopedName || va.name, new Set() );
    }

    /**
     * We're done with the CFG and can go ahead and finalize whatever information was left unfinished
     * during our generation phase.
     */
    function finish()
    {
        bm.forEach( _block => {
            /**
             * @type {BlockThing}
             */
            const block = blocks[ _block.id ];

            block.varList.forEach( va => {
                va.node       = ast.nodesByIndex[ va.index ];
                va.scope      = va.node.scope;
                va.line       = va.node.loc.start.line;
                va.scopedName = va.scopedName || va.name;

            } );

            /**
             * The sorting here looks a bit weird. Here's why:
             *
             * For the SSA use-def to work properly, we need the nodes to be evaluated in order, so we
             * sort them by AST node index. In case the index is the same as that of another node, no harm is done,
             * since it will invariably be of the same type ('use' or 'def) with one exception, namely
             * assignment operators other than `=`. For example, `a += b` is a definition of `a` but is also
             * a read ('use') with the identifier `a` at the same index for both 'use' and 'def'. In that case,
             * we favor 'use' before 'def' since the read of `a` is technically an RHS 'read' and, hencem happens
             * before the definition.
             *
             * In all of those cases, the name will be same same and therefore the same length. However, we get
             * multiple reads from the same lcoation in cases like this `[ a, b, c ] = d` where the reads are
             * stored as reads from `d`, `d.0`, `d.1`, and `d.2`. In those cases, I short them by the shortest name
             * solely for printout purposes becuase it reflects the source more accurate. Another way of printing
             * it out would be something like `[ a, b, c ] = [ d[ 0 ], d[ 1 ], d[ 2 ] ]` but that gets a bit
             * long-winded and looks nothing like the source, even if it is more accurate.
             */
            block.varList.sort( ( a, b ) => {
                if ( a.index === b.index )
                {
                    if ( a.name.length === b.name.length )
                        return a.type === 'use' ? -1 : 1;

                    return a.name.length - b.name.length;
                }
                else
                    return a.index - b.index;
            } );
        } );
    }

    /**
     * Calculate a liveout set. These are all the variables that are alive exiting this block. We use this to
     * generate a pruned SSA later on. For a more in-depth discussion, see sections 8.6.1 and 9.2.2 of
     * "Keith D. Cooper and Linda Torczon. 2012. Engineering a compiler, Burlington, MA: Morgan Kaufmann."
     */
    function live_out()
    {
        init();

        // const
        //     liveOuts = analyze( blocks.map( b => b.ueVar ), blocks.map( b => b.notVarKill ), [], 'uui', { adjacent: 'succs', direction: 'rpost' } );

        // liveOuts.forEach( ( lo, i ) => blocks[ i ].liveOut = lo );

        let changed = true;

        while ( changed )
        {
            changed = false;

            DFS( blocks.map( b => b.succs ), {
                rpost( blockIndex )
                {
                    if ( recompute( blocks[ blockIndex ] ) ) changed = true;
                }
            } );
        }

        // Use iterated dominance frontiers to inserted phi functions.
        insert_phi();

        // Print out the source code showing SSA names and phi functions, if requested.
        if ( options.ssaSource ) console.log( ast.as_source() );
    }

    /**
     * See citation for this in the comment for {@link live_out}
     *
     * @see {@link live_out}
     * @param {BlockThing} block
     * @return {boolean}
     */
    function recompute( block )
    {
        const
            prevSize = block.liveOut,
            curSet   = block.liveOut = block.succs.map( si => blocks[ si ] ).reduce( ( u, s ) => union( u, union( s.ueVar, intersection( s.liveOut, s.notVarKill ) ) ), new Set() );

        return curSet.size > prevSize;
    }

    /**
     * Declares a variable. Same as a 'def' except we need to deal with scope and shadowing.
     *
     * @param {VarRef} va
     * @private
     */
    function _is_decl( va )
    {
        let decls = scopeToDecls.get( va.scope );

        if ( decls && decls.has( va.name ) )
            throw new SyntaxError( `Duplicate declaration of "${va.name}" on line ${va.line}` );

        if ( !decls ) scopeToDecls.set( va.scope, decls = new Map() );

        decls.set( va.name, va );

        let scope = _get_decl_scope_from_name( va.name, va.scope.upper );

        if ( !scope ) return;

        shadows.add( va.name );

        va.scopedName = va.name + '#' + va.scope.block.index;
    }

    /**
     * A 'use' reference to an identifier.
     *
     * @param {VarRef} va
     * @private
     */
    function _is_use( va )
    {
        if ( !shadows.has( va.name ) ) return;

        let declScope = _get_decl_scope_from_name( va.name, va.scope );

        if ( !declScope ) return;

        const decl = scopeToDecls.get( declScope ).get( va.name );

        va.scopedName = decl.scopedName;
    }

    /**
     * Temporary hacky way to get the scope of an identifier instance.
     *
     * @param {string} name
     * @param {Scope} scope
     * @return {?Scope}
     * @private
     */
    function _get_decl_scope_from_name( name, scope )
    {
        while ( scope && scope !== stopScope )
        {
            const decls = scopeToDecls.get( scope );

            if ( decls && decls.has( name ) )
                break;

            scope = scope.upper;
        }

        return scope === stopScope ? null : scope;
    }

    /**
     * Initializes all the things. It calculates the immediate dominators of the CFG and pre-caclulates
     * the dominanace frontiers, which is not really necessary, and also creates the dominator tree, which
     * we'll need when creating the SSA form.
     *
     * Finally, it initializes the upward exposed variables and the kill set. These will be refined when
     * we calculate the liveout set.
     */
    function init()
    {
        const
            succs = blocks.map( b => b.succs );


        idoms     = iterative( succs );
        frontiers = frontiers_from_succs( succs, idoms );
        domTree   = create_dom_tree( idoms );

        preds            = reverse_graph( succs );
        postDoms         = iterative( preds );
        postDomFrontiers = frontiers_from_succs( preds, postDoms );

        dom = make_dom( {
            nodes: succs,
            idoms,
            frontiers
        } );

        // analyze = make_flow( blocks, idoms ).analyze;

        for ( const block of blocks )
        {
            block.varKill = new Set();
            block.ueVar   = new Set();

            if ( !block.varList ) continue;

            for ( const v of block.varList )
            {
                all.get( v.scopedName || v.name ).add( block.id );

                if ( v.type === 'use' )
                {
                    if ( !block.varKill.has( v.scopedName ) )
                        block.ueVar.add( v.scopedName );
                }
                else
                {
                    block.varKill.add( v.scopedName );
                    if ( !defSet.has( v.scopedName ) ) defSet.set( v.scopedName, new Set() );
                    defSet.get( v.scopedName ).add( block.id );
                }
            }

            block.notVarKill = subtract( new Set( [ ...all.keys() ] ), block.varKill ); // used;
            block.liveOut    = new Set();
        }
    }

    /**
     * Using our pruned set of variables, we'll iterate through the dominance frontiers
     * of the union of the blocks that define those variables, one at a time.
     */
    function insert_phi()
    {
        for ( const [ name, blockSet ] of all )
        {
            if ( blockSet.size > 1 ) continue;
            defSet.delete( name );
        }

        for ( const [ name, blockSet ] of defSet )
        {
            dom.forIteratedDominanceFrontier( id => {
                const block = blocks[ id ];
                if ( !block.phi.has( name ) )
                    block.phi.set( name, { phiName: name, args: [] } );

            }, [ ...blockSet ] );
        }

        // Rename all non-local variable according to SSA rules.
        ssa_rename();
    }

    /**
     * Rename every variable that crosses block boundaries according to SSA form rules.
     * We rename by adding `@n` to the end of the variable scoped name, where `n` is replaced
     * by a number unique to each definition.
     */
    function ssa_rename()
    {
        const
            renameList = new Map(),
            astRename  = ( node, va ) => {
                if ( !renameList.has( node ) ) renameList.set( node, new Set() );
                renameList.get( node ).add( va );
                // console.log( `Added to rename list: "${va.name}" => "${va.ssaName}" @${va.node.type}:${va.node.loc.start.line}, type: ${va.type}` );
            },
            /**
             * This function will return a new name for a variable by incremneting the index.
             * @param {string} sname
             * @return {string}
             */
            newName    = function( sname, node ) {
                const i = this.counter++;
                this.stack.push( i );
                this.nodes.push( node );
                return sname + '@' + i;

            },
            /**
             * This returns the index on the top of the stack.
             * @return {number}
             */
            top        = function() {
                return this.stack.length ? this.stack[ this.stack.length - 1 ] : 0;
            },
            /** @type {object<string,SSAName>} */
            ssa        = {};

        // Reset everything to start with for each non-local variable
        [ ...defSet.keys() ].forEach( name => ssa[ name ] = { counter: 0, defs: [], stack: [], nodes: [], newName, top } );

        /**
         * Rename everything in this one block.
         *
         * @param {BlockThing} block
         */
        function rename( block )
        {
            const
                newPhi = new Map();

            /**
             * This keeps track of how many new names we make so we can pop them off the stack later.
             * @type {object<string,number>}
             */
            let popCounts = {};
            [ ...defSet.keys() ].forEach( name => popCounts[ name ] = 0 );

            // First, rename the defintion that results from all (if any) phi functions
            // So, `const x = φ( x, x )` becomes `const x@1 = φ( x, x )`, if our current index was `1`.
            for ( const [ name, { args } ] of block.phi )
            {
                popCounts[ name ]++;

                newPhi.set( name, { phiName: ssa[ name ].newName( name, block.block.first ), args } );
            }

            block.phi = newPhi;

            // Rename all variable references, both 'use' and 'def'
            for ( const va of block.varList )
            {
                if ( !defSet.has( va.scopedName ) ) continue;

                if ( va.type === 'use' )
                {
                    // Rename uses to the last definition name
                    va.ssaName = va.scopedName + '@' + ssa[ va.scopedName ].top();
                    astRename( va.node, va );
                    // ast.rename( va.node, va.ssaName );
                    // if ( !va.implied ) ast.rename( va.node, va.ssaName );
                }
                else
                {
                    // Rename definitions to a new unique name
                    popCounts[ va.scopedName ]++;
                    va.ssaName = ssa[ va.scopedName ].newName( va.scopedName, va.node );
                    astRename( va.node, va );
                    // ast.rename( va.node, va.ssaName );
                    // if ( !va.implied ) ast.rename( va.node, va.ssaName );
                }
            }

            // For each successor block, rename each phi function argument.
            // Phi function arguments appear in the same order as the predeccessors,
            // one per edge.
            for ( const s of block.succs )
            {
                const
                    sblock = blocks[ s ];

                for ( const [ sname, { args } ] of sblock.phi.entries() )
                {
                    let blockIndex = sblock.preds.indexOf( block.id );

                    args[ blockIndex ] = sname + '@' + ssa[ sname ].top();
                }
            }

            // Recursively call the rename function by walking the dominator tree
            for ( const s of domTree[ block.id ] )
            {
                rename( blocks[ s ] );
            }

            // Finally, we "pop" the stack of names that have been generated
            // but we keep the count where it is becase all definitions must
            // be unique.
            for ( const [ name, count ] of Object.entries( popCounts ) )
            {
                ssa[ name ].stack.length -= count;
                ssa[ name ].nodes.length -= count;
            }
        }

        // Start the circus at the root
        rename( blocks[ 0 ] );

        // Add our SSA names, if requested
        if ( options.ssaSource )
        {
            for ( const block of blocks )
            {
                let addPhis = 0,
                    line;

                for ( const [ name, { phiName, args } ] of block.phi )
                {
                    if ( !block.block.nodes.length ) continue;

                    line = block.block.nodes[ 0 ].loc.start.line - 1;

                    addPhis++;
                    ast.add_line( line, `        let ${phiName} = φ( ${args.join( ', ' )} ); // for actual name ${name}` );
                }

                if ( addPhis > 0 )
                    ast.add_line( line, '' );
            }
        }

        for ( const [ node, vaSet ] of renameList )
        {
            const vas = [ ...vaSet ];

            if ( vaSet.size === 1 )
                ast.rename( node, vas[ 0 ].ssaName );
            else
            {
                // console.log( `multi-names (${node.type}): [ "${vas.map( v => v.ssaName ).join( '" "' )}" ]` );
                ast.rename( node, vas.sort( ( a, b ) => b.name.length - a.name.length )[ 0 ].ssaName );
            }
        }
    }

    return {
        add_var,
        live_out,
        finish,
        get: b => blocks.find( lb => lb.block === b )
    };
}

module.exports = variables;
