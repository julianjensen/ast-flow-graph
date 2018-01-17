/** ******************************************************************************************************************
 * @file Describe what cfg-test-06 does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 17-Jan-2018
 *********************************************************************************************************************/
"use strict";

function code_coverage( a, b, c )
{
    const cond = a < 10 ? b : c;

    try
    {
        do {
            a += b;
        } while ( a < 100 );

        for( let a = 0; a > 10; --a )
            a -= c;
    }
    catch ( e )
    {
        console.error( e );
        process.exit( 1 );
    }
    finally
    {
        a = b**c + ( a < 10 ? b : c );
    }

    switch ( a )
    {
        case 1: b += c;
                break;

        case 9:
        case 10:
        case 2: c += b;

        case 3: c += c;
                break;

        default: ++a;

        case 4: a = b + c;
                break;
    }
}
