/** ******************************************************************************************************************
 * @file Describe what ext-array does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

const
    SORT = Symbol( 'sort' );

/**
 * @template T
 */
class ExtArray extends Array
{
    /**
     * @param {*[]} args
     */
    constructor( ...args )
    {
        super( ...args );
        Object.defineProperty( this, SORT, { enumerable: false, writable: true, value: null } );
    }

    /**
     * @param {function} predicate
     * @return {*[]}
     */
    partition( predicate )
    {
        let matches    = new this.constructor(),
            mismatches = new this.constructor(),
            both       = [ matches, mismatches ];

        this.forEach( el => both[ predicate( el ) ? 0 : 1 ].push( el ) );

        return both;
    }

    /**
     * @return {number}
     */
    get size()
    {
        return this.length;
    }

    /**
     * @param {T[]} el
     * @return {ExtArray}
     */
    delete( ...el )
    {
        el.forEach( e => {
            if ( !e ) return;
            const i = this.indexOf( e );
            if ( i === -1 ) return;
            this.splice( i, 1 );
        } );

        return this;
    }

    /**
     * @param {T[]} el
     */
    add( ...el )
    {
        const added = [];

        el.forEach( e => e && !this.includes( e ) && ( added[ added.length ] = this[ this.length ] = e ) );
        if ( this[ SORT ] ) this.sort( this[ SORT ] );

        return added.length === 1 ? added[ 0 ] : added;
    }

    /**
     * @param {T[]} el
     */
    addr( ...el )
    {
        const r = this.add( ...el );

        return Array.isArray( r ) ? r : r ? [ r ] : [];
    }

    /** */
    order()
    {
        if ( this[ SORT ] )
            this.sort( this[ SORT ] );
        else
            this.sort();

        return this;
    }

    /**
     * @param {T} el
     * @return {boolean}
     */
    has( el )
    {
        return this.includes( el );
    }

    /**
     * @return {?T}
     */
    one()
    {
        return this.length ? this[ 0 ] : null;
    }

    /**
     * @return {?T}
     */
    get last()
    {
        return this.length ? this[ this.length - 1 ] : null;
    }

    /**
     * @return {boolean}
     */
    empty()
    {
        return !this.length;
    }

    /**
     * @return {boolean}
     */
    notEmpty()
    {
        return !!this.length;
    }

    /**
     * @return {ExtArray}
     */
    clear()
    {
        this.length = 0;
        return this;
    }
}

ExtArray.SORT = SORT;

module.exports = ExtArray;
