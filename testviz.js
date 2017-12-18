/** ******************************************************************************************************************
 * @file Describe what testviz does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 18-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    promisify = require( 'util' ).promisify,
    fs        = require( 'fs' ),
    getStdin  = require( 'get-stdin' ),
    readFile  = promisify( fs.readFile ),
    viz       = require( 'viz.js' ),
    scale     = 0.6,
    exec      = require( 'execa' ),
    unicode = require( './convert' ),
    asText    = true;

( process.argv[ 2 ] ? readFile( process.argv[ 2 ], 'utf8' ) : getStdin() ).then( src => {

    if ( asText )
        exec( 'graph-easy', [ process.argv[ 2 ] ] ).then( res => console.log( unicode( res.stdout ) ) );
    else
    {
        let outSvg = viz( src, { format: 'svg' } ).replace( /<svg width="(\d+)pt" height="(\d+)pt"/, ( $0, $1, $2 ) => `<svg width="${Number( $1 ) * scale}pt" height="${Number( $2 ) * scale}pt"` );

        console.log( outSvg );
    }
} );
