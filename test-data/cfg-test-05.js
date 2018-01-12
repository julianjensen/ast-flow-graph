/** ******************************************************************************************************************
 * @file Describe what cfg-test-05.js does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 11-Jan-2018
 *********************************************************************************************************************/
"use strict";

const a = 10;
let b;

function blah()
{
    b++;

    for ( const x of a )
    {
        b++;
        if ( b & 1 ) continue;
    }

    if ( a < 5 )
        b = 1;
    else if ( a < 9 )
        b = 2;

    b += a;
}
