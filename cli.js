/** ******************************************************************************************************************
 * @file Command line starter
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 11-Jan-2018
 *********************************************************************************************************************/
"use strict";

import CFG              from './src/cfg';
import path             from 'path';
import fs               from 'fs';
import cli              from 'command-line-args';
import usage            from 'command-line-usage';
import { load_plugins } from "./src/utils";

const
    version    = require( path.join( __dirname, 'package.json' ) ).version,
    { stat, writeFile } = fs.promises,
    stdin      = process.stdin,
    argumentos = [
        {
            alias:        'd',
            name:         'debug',
            description:  "Turn on debugging mode. Warning: This will generate a lot of output.",
            type:         Boolean,
            defaultValue: false
        },
        {
            alias:        'g',
            name:         'graph',
            description:  "Create a .dot file for graph-viz",
            defaultValue: false,
            type:         Boolean
        },
        {
            alias:       'o',
            name:        'output',
            description: "If this option is present, save the .dot files to this directory.",
            type:        String
        },
        {
            alias:         's',
            name:          'source',
            description:   "Input source file. Can also be specified at the end of the command line.",
            type:          String,
            defaultOption: true,
            multiple:      true
        },
        {
            alias:        't',
            name:         'table',
            description:  "Output a table showing all CFG blocks",
            defaultValue: false,
            type:         Boolean
        },
        {
            alias:        'l',
            name:         'lines',
            description:  "Output CFG blocks as text",
            defaultValue: false,
            type:         Boolean
        },
        {
            alias:        'n',
            name:         'name',
            description:  "Specify a function name to only display information for that function.",
            type:         String,
            defaultValue: [],
            multiple:     true
        },
        {
            alias:        'v',
            name:         'verbose',
            description:  "Output additional information",
            type:         Boolean,
            defaultValue: false
        },
        {
            alias:        'h',
            name:         'help',
            description:  "Display this help message",
            type:         Boolean,
            defaultValue: false
        }
    ],
    sections   = [
        { content: `cfg version ${version}` },
        { header: 'Usage', content: `cfg [-d] [-g] [-s ...sources] [-t] [-n ...names] [-r] [-v] [-h] [...files]` },
        { header: 'Options', optionList: argumentos },
        {
            header: 'Description', content: "Creates a CFG from one or more source files."
        }
    ],
    args       = cli( argumentos );

if ( args.help )
{
    console.log( usage( sections ) );
    process.exit();
}

if ( !args.source && args.name && args.name.some( n => n.endsWith( '.js' ) ) )
{
    args.source = args.name.filter( n => n.endsWith( '.js' ) );
    args.name   = args.name.filter( n => !n.endsWith( '.js' ) );
}

process_all();

/** */
function process_all()
{
    let str = '';

    load_plugins();

    if ( args.source && args.source.length )
        args.source.forEach( async name => await process_file( fs.readFileSync( name, 'utf8' ) ) );
    else
    {
        stdin.setEncoding( 'utf8' );

        stdin.on( 'readable', () => {
            str += stdin.read() || '';
        } );

        stdin.on( 'end', async () => await process_file( str ) );
    }

}

/**
 * @param {string} source
 */
function process_file( source )
{
    const
        cfg = new CFG( source, { ssaSource: args.rewrite } );

    if ( args.name && args.name.length )
        args.name.forEach( async name => await single_function( cfg, name, true ) );
    else
    {
        cfg.generate();
        cfg.forEach( async c => await single_function( cfg, c.name, false ) );
    }
}

/**
 * @param {CFG} cfg
 * @param {string} name
 * @param {boolean} generate
 * @return {Promise<void>}
 */
async function single_function( cfg, name, generate )
{
    // eslint-disable-next-line max-len
    let hdr = `------------------------------------------------------------------------------------------------------------\nNEW FUNCTION: __FN__\n------------------------------------------------------------------------------------------------------------`;

    const c = generate ? cfg.generate( name ) : cfg.by_name( name );

    if ( args.verbose ) console.log( hdr.replace( '__FN__', c.name ) );
    if ( args.table ) console.log( c.toTable() );
    if ( args.lines ) console.log( '' + cfg );

    if ( args.graph )
    {
        const dot = cfg.create_dot( c );

        if ( args.output )
        {
            try
            {
                const s = await stat( args.output );
                if ( !s.isDirectory() ) throw new Error();
                await writeFile( `./dots/${c.name}.dot`, dot );
            }
            catch ( err )
            {
                console.error( `Unable to stat "${args.output}"` );
                process.exit( 1 );
            }
        }
        else
            console.log( `${dot}\n\n` );
    }
}
