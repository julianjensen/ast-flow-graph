/** ******************************************************************************************************************
 * @file Create a DOT file for graphviz.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 16-Dec-2017
 *********************************************************************************************************************/
"use strict";

const
    defaultDotOptions = {
        defaults:      {
            default:   '#0D3B66',
            bgcolor:   'white',
            color:     '#0D3B66',
            fontcolor: '#0D3B66',
            fontname:  'arial',
            shape:     'ellipse',
            nodesep:   1.5,
            margin:    [ 0.5, 0.2 ]
        },
        node:          {
            style:     'rounded',
            color:     '#0D3B66',
            fontcolor: '#0D3B66'
        },
        test:          {
            style:     'rounded',
            color:     '#F95738',
            fontcolor: '#F95738',
            shape:     'diamond'
        },
        entry:         {
            style: 'rounded',
            shape: 'box',
            color: '#C6AC4D'
        },
        exit:          {
            style: 'rounded',
            shape: 'box',
            color: '#C6AC4D'
        },
        unconditional: {
            color: '#0D3B65'
        },
        conditional:   {
            color:     '#F95738',
            fontname:  'arial italic',
            style:     'dashed',
            fontcolor: '#F95738',
            label:     'true'
        }
    };

/**
 * @typedef {object} DotOptions
 * @property {string} title
 * @property {Array<string>} nodeLabels
 * @property {Array<string>} edgeLabels    // was graph_label
 * @property {number} [start]
 * @property {number} [end]
 * @property {Array<[ number, number ]>} conditional
 * @property {Array<[ number, number ]>} unconditional
 * @property {object} [dotOptions={}]
 */

/**
 * @param {DotOptions} opts
 * @return {string}
 */
function dot( opts )
{
    const
        {
            title,
            labels,
            start = 0,
            end = labels.length - 1,
            dotOptions = {},
            conditional: condEdges,
            unconditional: uncondEdges,
            nodeLabels,
            edgeLabels
        } = opts,
        /**
         * @param {Edge} edge
         * @return {string}
         */
        formatEdge           = ( [ from, to ] ) => {
            const
                label        = edgeLabels[ from ],
                escapedLabel = label && label.replace( /"/g, '\\"' ),
                attributes   = label ? ` [label = " ${escapedLabel}"]` : "";

            return `${from} -> ${to}${attributes}`;
        },

        neat                 = a => Array.isArray( a ) ? `"${a.join( ', ' )}"` : `"${a}"`,
        toStr                = ( o, eol = '' ) => {
            if ( !o ) return [];
            const strs = Object.entries( o ).map( ( [ name, value ] ) => `${name} = ${neat( value )}${eol}` );

            if ( !eol ) return strs.join( ', ' );

            return strs;
        },

        diffs                = o => {
            if ( !o ) return null;

            const d = {
                color:     defaultDotOptions.defaults.color,
                fontcolor: defaultDotOptions.defaults.fontcolor,
                fontname:  defaultDotOptions.defaults.fontname
            };

            Object.entries( o ).forEach( ( [ key, value ] ) => defaultDotOptions.defaults[ key ] !== value && ( d[ key ] = value ) );

            return Object.keys( d ).length ? d : null;
        },
        merge                = key => Object.assign( {}, defaultDotOptions[ key ], dotOptions[ key ] || {} ),

        defaults             = toStr( defaultDotOptions.defaults, ';' ),
        node                 = toStr( diffs( merge( 'node' ) ) ),
        test                 = toStr( diffs( merge( 'test' ) ) ),
        entry                = toStr( diffs( merge( 'entry' ) ) ),
        exit                 = toStr( diffs( merge( 'exit' ) ) ),
        unconditional        = toStr( diffs( merge( 'unconditional' ) ) ),
        conditional          = toStr( diffs( merge( 'conditional' ) ) ),

        innerLines           = [ ...defaults ].concat( `labelloc="t";`, `label="${title}";`, `fontsize=30` );

    if ( node ) innerLines.push( `node [${node}];` );

    innerLines.push( `${start} [label = "entry:${start}"${entry ? ', ' + entry : ''}];` );
    innerLines.push( `${end} [label = "exit:${end}"${exit ? ', ' + exit : ''}];` );
    innerLines.push( ...this.asArray.filter( ( b, i ) => i !== start && i !== end && !!nodeLabels[ i ] ).map( ( b, i ) => `${i} [label = "${nodeLabels[ i ]}"${condEdges.includes( i ) && test ? ', ' + test : ''}];` ) );

    if ( condEdges.length )
    {
        innerLines.push( "", "// Unconditional edges" );
        if ( unconditional ) innerLines.push( `edge [${unconditional}];` );
        innerLines.push( ...condEdges.map( formatEdge ) );
    }

    if ( uncondEdges.length )
    {
        innerLines.push( "", "// Conditional edges" );
        if ( conditional ) innerLines.push( `edge [${conditional}];` );
        innerLines.push( ...uncondEdges.map( formatEdge ) );
    }

    let graphLines = [ `digraph "${title}" {`, ...innerLines.map( l => '    ' + l ), "}" ];

    if ( title ) graphLines.unshift( `// ${title}` );

    return graphLines.join( '\n' );
}

module.exports = dot;
