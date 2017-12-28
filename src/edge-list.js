/** ******************************************************************************************************************
 * @file Keeps a list of all edges in a CFG. Not super-useful at the moment but I have plans for this.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 03-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    eyes = require( 'eyes' ),
    assert = require( 'assert' ),
    Edge = require( './edge' ),
    forw = ( a, b ) => a + '->' + b;


/** */
class EdgeList
{
    /** */
    constructor()
    {
        /** @type {Map<string,Edge>} */
        this.forward = new Map();
    }

    /**
     * @param {number} from
     * @param {number} to
     * @param {string} [type]
     * @return {?Edge}
     */
    add( from, to, type )
    {
        const
            fcode = forw( from, to );

        if ( this.forward.has( fcode ) ) return null;

        const
            e = new Edge( from, to, type );

        assert( !this.forward.has( fcode ), "Adding an edge that already exists " + fcode );
        this.forward.set( fcode, e );

        if ( type ) e.type = type;

        return e;
    }

    /**
     * @param {number} from
     * @param {number} to
     * @param {string} type
     * @return {Edge}
     */
    type( from, to, type )
    {
        const
            e     = this.forward.get( forw( from, to ) );

        assert( e, "Edge does not exist for " + forw( from, to ) );
        e.type = type;

        return e;
    }

    /**
     * @param {number} from
     * @param {number} to
     * @param {string} type
     */
    classify_edge( from, to, type )
    {
        const
            e = this.forward.get( forw( from, to ) );

        e.graph_type( type );
    }

    /**
     * @param {number} from
     * @param {number} to
     * @return {Edge}
     */
    get( from, to )
    {
        const e = this.forward.get( forw( from, to ) );
        // assert( e, "Unable to get edge " + forw( from, to ) );
        return e;
    }

    /**
     * @param {number} from
     * @param {number} to
     * @param {number} newFrom
     * @param {number} newTo
     */
    replace( from, to, newFrom, newTo )
    {
        const
            fcode = forw( from, to ),
            oldEdge = this.forward.get( fcode );

        if ( !oldEdge )
            eyes.inspect( { code: fcode, has: this.forward.has( forw( from, to ) ), from, to, newFrom, newTo }, "Not found in replace: " + forw( from, to ) );

        assert( oldEdge );

        const
            type = oldEdge.type;

        this.delete( from, to );

        this.add( newFrom, newTo, type );
    }

    /**
     * @return {Array<Edge>}
     */
    all()
    {
        const allEdges = [];

        [ ...this.forward.values() ].forEach( e => allEdges.push( e ) );

        return allEdges;
    }

    /**
     * @return {Array<Edge>}
     */
    debug_all( fromr, tor )
    {
        const allEdges = [];

        [ ...this.forward.entries() ].filter( ( [ , e ] ) => ( ( !fromr || ( e.from >= fromr[ 0 ] && e.from <= fromr[ 1 ] ) ) && ( !tor || ( e.to >= tor[ 0 ] && e.to <= tor[ 1 ] ) ) ) )
            .forEach( ( [ key, e ] ) => allEdges.push( Object.assign( {}, e, { key } ) ) );


        return allEdges;
    }

    /**
     * @return {Array<Edge>}
     */
    conditional()
    {
        return this.all().filter( e => e.isConditional );
    }

    /**
     * @return {Array<Edge>}
     */
    unconditional()
    {
        return this.all().filter( e => !e.isConditional );
    }


    /**
     * @param {number} from
     * @param {number} to
     * @return {Edge}
     */
    delete( from, to )
    {
        const
            code = forw( from, to ),
            e = this.forward.get( code );

        assert( e, "Trying to delete non-existing edge " + code );
        this.forward.delete( code );

        return e;
    }

    /**
     * @return {string}
     */
    toString()
    {
        return [ ...this.forward.keys() ].sort().map( key => `${this.forward.get( key )}` ).join( '\n' );
    }

}

EdgeList.TREE = 'tree';
EdgeList.FORWARD = 'forward';
EdgeList.BACK = 'back';
EdgeList.CROSS = 'cross';

module.exports = EdgeList;
