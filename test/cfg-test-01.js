/** ******************************************************************************************************************
 * @file Tries to confuse the CFG generator.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 27-Dec-2017
 *********************************************************************************************************************/
"use strict";


function a02()
{
    for ( let a = 0; ; ++a )
    {}
}

function a03( a )
{
    for ( ; a; ) a >>= 1;
}

function a01()
{
    for ( ; ; ) ;
}

function b01()
{
    while ( b01() )
    {
        if ( b01 )
        { continue; }
        if ( !b01 )
        {

        }
    }
}

function b02()
{
    while ( b01() )
    {
        if ( b01 )
        { continue; }
        if ( !b01 )
        {
            break;
        }
    }
}

function b03()
{
    let a = 1;
    goto:
        while ( b01() )
        {
            if ( b01 )
            {
                continue goto;
            }

            if ( !b01 )
            {
                a <<= 1;
                break;
            }
        }
}
