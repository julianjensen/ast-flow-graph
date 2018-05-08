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
 * @property {BlockManager} BlockManager
 * @property {BlockManager} bm
 * @property {AST} ast
 * @property {?CFGBlock} prev
 * @property {?CFGBlock} block
 * @property {function():CFGBlock} newBlock
 * @property {Array<CFGBlock>} toExit
 * @property {function(CFGBlock,AnnotatedNode|Array<AnnotatedNode>,VisitorHelper):CFGBlock} [flatWalk]
 * @property {function(CFGBlock,AnnotatedNode,VisitorHelper):*} [scanWalk]
 * @property {Array<CFGBlock>} breakTargets
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
 * @property {Array<Array<number>>} conditional         - Actually an array of a tuple length 2: [ number, number ]
 * @property {Array<Array<number>>} unconditional  - Actually an array of a tuple length 2: [ number, number ]
 * @property {object} [dotOptions={}]
 * @property {Array<CFGBlock>} blocks
 */

/**
 * @typedef {object} FunctionInfo
 * @property {string} name
 * @property {Array<AnnotatedNode>|AnnotatedNode} body
 * @property {Array<AnnotatedNode>} [params]
 * @property {AnnotatedNode} node
 * @property {Array<number>} lines         - A tuple with length 2
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

/**
 * @typedef {object} Connection
 * @property {number} from
 * @property {number} to
 * @property {EdgeInfo} type
 */

