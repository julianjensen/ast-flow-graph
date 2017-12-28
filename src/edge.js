/** ******************************************************************************************************************
 * @file Describe what edge does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 26-Nov-2017
 *********************************************************************************************************************/
"use strict";

/** */
class Edge
{
    /**
     * @param {number} from
     * @param {number} to
     * @param {string} [type]
     */
    constructor( from, to, type )
    {
        this.from = from;
        this.to = to;
        this.type = type;
        this.gtype = 'tree';
    }

    /**
     * @return {string}
     */
    toString()
    {
        return `${this.from} -> ${this.to} [${this.type}]`;
    }

    /**
     * @return {boolean}
     */
    get isConditional()
    {
        return this.type === 'true' || this.type === 'false';
    }

    /**
     * The graph edge type, as in 'tree', 'forward', 'back', or 'cross'.
     *
     * @param {string} gtype
     */
    graph_type( gtype )
    {
        this.gtype = gtype;
    }
}


module.exports = Edge;
