# cfg

[![Coveralls Status][coveralls-image]][coveralls-url]
[![Build Status][travis-image]][travis-url]
[![Dependency Status][depstat-image]][depstat-url]
[![npm version][npm-image]][npm-url]
[![License][license-image]][license-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![david-dm][david-dm-image]][david-dm-url]

> Constructs a CFG for JavaScript source code.

Need actual documentation here.

## Install

```sh
npm i cfg
```

## Usage

```js
const 
    CFG = require( 'ast-flow-graph' );

cfg() // true
```

## CLI Usage

```

  cfg version 1.0.0

Usage

  cfg [-d] [-g] [-s ...sources] [-t] [-n ...names] [-r] [-v] [-h] [...files]

Options

  -d, --debug             Turn on debugging mode. Warning: This will generate a lot of output.
  -g, --graph             Create a .dot file for graph-viz
  -o, --output string     If this option is present, save the .dot files to this directory.
  -s, --source string[]   Input source file. Can also be specified at the end of the command line.
  -t, --table             Output a table showing all CFG blocks
  -l, --lines             Output CFG blocks as text
  -n, --name string[]     Specify a function name to only display information for that function.
  -v, --verbose           Output additional information
  -h, --help              Display this help message

Description

  Creates a CFG from one or more source files.
```

## License

MIT © [Julian Jensen](https://github.com/julianjensen/cfg)

[coveralls-url]: https://coveralls.io/github/julianjensen/cfg?branch=master
[coveralls-image]: https://coveralls.io/repos/github/julianjensen/cfg/badge.svg?branch=master

[travis-url]: https://travis-ci.org/julianjensen/cfg
[travis-image]: http://img.shields.io/travis/julianjensen/cfg.svg

[depstat-url]: https://gemnasium.com/github.com/julianjensen/cfg
[depstat-image]: https://gemnasium.com/badges/github.com/julianjensen/cfg.svg

[npm-url]: https://badge.fury.io/js/cfg
[npm-image]: https://badge.fury.io/js/cfg.svg

[license-url]: https://github.com/julianjensen/cfg/blob/master/LICENSE
[license-image]: https://img.shields.io/badge/license-MIT-brightgreen.svg

[snyk-url]: https://snyk.io/test/github/julianjensen/cfg
[snyk-image]: https://snyk.io/test/github/julianjensen/cfg/badge.svg

[david-dm-url]: https://david-dm.org/julianjensen/cfg
[david-dm-image]: https://david-dm.org/julianjensen/cfg.svg

