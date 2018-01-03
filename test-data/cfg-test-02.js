/** ******************************************************************************************************************
 * @file Describe what cfg-test-01 does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 27-Dec-2017
 *********************************************************************************************************************/
"use strict";

class A
{
    constructor( a, b, c )
    {
        let { x, y: { z } } = a,
            [ m, n, ...r ] = b,
        u, v;


        u = someBase.eater;


        if ( x > z )
            u = x + z;
        else
        {
            let dead = u,
                c = 10;
            dead += m - n;
            u = dead + n;
            v = u + c;
        }

        z = z + u;
        u = v + c;

        return z + u;
    }
}
