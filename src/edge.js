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
     * @param {BasicBlock} from
     * @param {BasicBlock} to
     * @param {string} [type]
     */
    constructor( from, to, type )
    {
        this.from = from;
        this.to = to;
        this.type = type;
    }

    /**
     * @return {{from: number, to: number}}
     */
    asIndex()
    {
        return { from: this.from.pre, to: this.to.pre };
    }

    /**
     * @return {string}
     */
    toString()
    {
        return `${this.from.pre} -> ${this.to.pre} [${this.type}]`;
    }
}


module.exports = Edge;
