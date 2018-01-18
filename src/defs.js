/** ******************************************************************************************************************
 * @file A place to keep all the typedefs.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 31-Dec-2017
 *********************************************************************************************************************/

/**
 * @typedef {object} CFGInfo
 * @property {string} name
 * @property {Array<AnnotatedNode>} params
 * @property {AnnotatedNode|Array<AnnotatedNode>} body
 * @property {Array<Number>} lines
 * @property {BlockManager} [bm]
 * @property {CFGBlock} [trailing]
 * @property {AnnotatedNode|Node|BaseNode} node,
 * @property {AST} ast
 * @property {Scope} topScope
 * @property {function():string} toString
 * @property {function():string} toTable
 */

/**
 * @typedef {object} VisitorHelper
 * @property {BlockManager.} BlockManager
 * @property {BlockManager#} bm
 * @property {AST} ast
 * @property {?CFGBlock} prev
 * @property {?CFGBlock} block
 * @property {function():CFGBlock} newBlock
 * @property {CFGBlock[]} toExit
 * @property {function(CFGBlock,AnnotatedNode|Array<AnnotatedNode>,VisitorHelper):CFGBlock} [flatWalk]
 * @property {function(CFGBlock,AnnotatedNode,VisitorHelper):*} [scanWalk]
 * @property {CFGBlock[]} breakTargets
 * @property {function(CFGBlock):*} addBreakTarget
 * @property {function(CFGBlock, CFGBlock):*} addLoopTarget
 * @property {function():*} popTarget
 * @property {function():?CFGBlock} getBreakTarget
 * @property {function():?CFGBlock} getLoopTarget
 */

/**
 * It's damn near impossible to make WebStorm understand a class hierarchy.
 *
 * @typedef {Statement|Function|Expression|Pattern|Declaration|Node|BaseNode|Esprima.Node} AnnotatedNode
 * @extends BaseNode
 * @extends Node
 * @extends VariableDeclarator
 * @extends Statement
 * @extends Declaration
 * @extends Pattern
 * @extends Expression
 * @extends Function
 * @extends BlockStatement
 * @extends espree.Node
 * @property {number} [index]
 * @property {AnnotatedNode} [parent]
 * @property {?CFGBlock} [cfg]
 * @property {function():string} [toString]
 * @property {Scope} scope
 * @property {number} level
 * @property {?string} field
 * @property {number} fieldIndex
 */

/**
 * @typedef {object} CFGOptions
 * @property {boolean} ssaSource
 * @property {object} parser
 */

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
 * @property {CFGBlock[]} blocks
 */

/**
 * @typedef {object} FunctionInfo
 * @property {string} name
 * @property {Array<AnnotatedNode>|AnnotatedNode} body
 * @property {Array<AnnotatedNode>} [params]
 * @property {AnnotatedNode} node
 * @property {[ number, number ]} lines
 */

/**
 * @typedef {object} EdgeInfo
 * @property {function(number):EdgeInfo} as
 * @property {function(number):EdgeInfo} not
 * @property {function(number):boolean} isa
 * @property {number} index
 * @private
 */

/**
 * @typedef {object} CaseInfo
 * @property {?CFGBlock} [test]
 * @property {?CFGBlock} [body]
 * @property {?AnnotatedNode} switchTest
 * @property {AnnotatedNode} consequent
 * @private
 */

