/** ******************************************************************************************************************
 * @file A place to keep all the typedefs.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 31-Dec-2017
 *********************************************************************************************************************/

/**
 * @typedef {object} BlockThing
 * @property {?Set} ueVar
 * @property {?Set} varKill
 * @property {?Set} notVarKill
 * @property {?Set} liveOut
 * @property {Array<VarRef>} varList
 * @property {?Set} declNames
 * @property {?Map} phi
 * @property {Array<number>} succs
 * @property {Array<number>} preds
 * @property {number} id
 * @property {CFGBlock} block
 * @property {number} [line]
 */

/**
 * @typedef {object} VarRef
 * @property {string} type
 * @property {string} name
 * @property {number} index
 * @property {boolean} isDecl
 * @property {AnnotatedNode} [node]
 * @property {Scope} [scope]
 * @property {string} [scopedName]
 * @property {number} [line]
 * @property {boolean} [implied=false]
 * @property {boolean} [renameTarget=false]
 */

/**
 * @typedef {object} SSAName
 * @property {number} counter
 * @property {Array<number>} stack
 * @property {function(string, AnnotatedNode|Node|BaseNode):string} newName
 * @property {function():number} top
 * @property {Array<AnnotatedNode|Node|BaseNode>} nodes
 */

/**
 * @typedef {object} VarAccess
 * @property {string} type
 * @property {Array<string>} names
 * @property {number} index
 */

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
 */

/**
 * @typedef {object} CFGOptions
 * @property {boolean} ssaSource
 * @property {object} parser
 */

