/** ******************************************************************************************************************
 * @file Describe what run does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 16-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    CFG   = require( './src/cfg' ),
    fs    = require( 'fs' ),
    stdin = process.stdin;

let str = '';

if ( process.argv[ 2 ] )
    process_file( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
else
{
    stdin.setEncoding( 'utf8' );

    stdin.on( 'readable', () => {
        str += stdin.read() || '';
    } );

    stdin.on( 'end', () => process_file( str ) );
}

function process_file( source )
{
    const
        cfg = new CFG( source );
    // list = cfg.asList();

    console.log( `scopes:\n${cfg.scopes}` );
    return;

    let hdr = `----------------------------------------------------------------------------------------------\nNEW FUNCTION: __FN__\n----------------------------------------------------------------------------------------------`;

    cfg.generate();

    cfg.forEach( ( c, i ) => {
        const list = c.blockList;

        console.log( hdr.replace( '__FN__', c.name ) );
        // list.drop( c.entry );

        const [ entry, exit ] = list.entryExit();
        console.log( `entry: ${entry}, exit: ${exit}\n` );

        const blocks = list.asArray.map( b => b.pre );
        console.log( `blocks as list (${blocks.length}):`, blocks );
        console.log( '' );

        const edges = list.edges;
        console.log( `block edges (${edges.length}):`, edges.map( e => `${e}` ) );
        console.log( '' );

        console.log( `${list}` );
        console.log( '' );

        const lines = list.lines();

        const dot = list.dot( c.name + `${lines ? ', lines: ' + lines : ''}` );
        console.log( `${dot}\n\n` );
        fs.writeFileSync( `./dots/${c.name}.dot`, dot );
    } );
    console.log( `${cfg.scopes}` );

    // const
    //     render = 'walk',
    //     fcfg   = cfg.by_name( render ),
    //     list   = fcfg.blockList;
    //
    // console.error( `${list}` );
    //
    // const
    //     lines = list.lines(),
    //     fdot  = fcfg.blockList.dot( render + `${lines ? ', lines: ' + lines : ''}` );
    //
    // fs.writeFileSync( './test.dot', fdot );


    // console.log( `${cfgs}` );
    // console.log( 'functions:\n' );
    //
    // const funcs = CFG.process_functions();
    //
    // console.log( funcs.join( '\n\n' ) );

    // console.log( '\n\n' );
    // list.forEach( bb => console.log( `${bb}` ) );
    // console.log( cfg.toString() );
}
