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
 * @property {?string} field
 * @property {number} fieldIndex
 * @property {?(Array<IdentifierContext>|AnnotatedNode)} [contexts]
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
 * @typedef {object} DataFlow
 * @property {function(Set, Set):Set} op1
 * @property {function(Set, Set):Set} op2
 * @property {function(Set, Set):Set} accumulate
 * @property {string} adjacent
 * @property {Set} constant1
 * @property {Set} constant2
 * @property {string} [direction]
 * @property {boolean} [useDomTree=false]
 */


/**
 * @typedef {Map<string, ISymbol>} SymbolTable
 */

/**
 * @interface ISymbol
 * @property {SymbolFlags} flags
 * @property {string} name
 * @property {?Array<AnnotatedNode>} [declarations]
 * @property {?AnnotatedNode} [valueDeclaration]
 * @property {?SymbolTable} [members]
 * @property {?SymbolTable} [exports]
 * @property {?SymbolTable} [globalExports]
 * @property {?number} [id]
 * @property {?number} [mergeId]
 * @property {?Symbol} [parent]
 * @property {?Symbol} [exportSymbol]
 * @property {?boolean} [constEnumOnlyModule]
 * @property {?boolean} [isReferenced]
 * @property {?boolean} [isReplacedByMethod]
 * @property {?boolean} [isAssigned]
 */

// /**
//  * @typedef {object} SymbolLinks
//  * @property {Symbol} immediateTarget                   -  Immediate target of an alias. May be another alias. Do not access directly, use `checker.getImmediateAliasedSymbol` instead.
//  * @property {Symbol} target                            -  Resolved (non-alias) target of an alias
//  * @property {Type} type                                -  Type of value symbol
//  * @property {Type} declaredType                        -  Type of class, interface, enum, type alias, or type parameter
//  * @property {Array<TypeParameter>} typeParameters      -  Type parameters of type alias (undefined if non-generic)
//  * @property {Type} inferredClassType                   -  Type of an inferred ES5 class
//  * @property {Map<string,Type>} instantiations          -  Instantiations of generic type alias (undefined if non-generic)
//  * @property {TypeMapper} mapper                        -  Type mapper for instantiation alias
//  * @property {boolean} referenced                       -  True if alias symbol has been referenced as a value
//  * @property {UnionOrIntersectionType} containingType   -  Containing union or intersection type for synthetic property
//  * @property {Symbol} leftSpread                        -  Left source for synthetic spread property
//  * @property {Symbol} rightSpread                       -  Right source for synthetic spread property
//  * @property {Symbol} syntheticOrigin                   -  For a property on a mapped or spread type, points back to the original property
//  * @property {StringLiteralType} syntheticLiteralTypeOrigin -  For a property on a mapped type, indicates the type whose text to use as the declaration name, instead of the symbol name
//  * @property {boolean} isDiscriminantProperty           -  True if discriminant synthetic property
//  * @property {SymbolTable} resolvedExports              -  Resolved exports of module or combined early- and late-bound static members of a class.
//  * @property {SymbolTable} resolvedMembers              -  Combined early- and late-bound members of a symbol
//  * @property {boolean} exportsChecked                   -  True if exports of external module have been checked
//  * @property {boolean} typeParametersChecked            -  True if type parameters of merged class and interface declarations have been checked.
//  * @property {boolean} isDeclarationWithCollidingName   -  True if symbol is block scoped redeclaration
//  * @property {BindingElement} bindingElement            -  Binding element associated with property symbol
//  * @property {boolean} exportsSomeValue                 -  True if module exports some value (not just types)
//  * @property {SymbolFlags.Numeric|SymbolFlags.Literal} enumKind -  Enum declaration classification
//  * @property {ImportDeclaration|ImportCall} originatingImport -  Import declaration which produced the symbol, present if the symbol is marked as uncallable but had call signatures in `resolveESModuleSymbol`
//  * @property {Symbol} lateSymbol                        -  Late-bound symbol for a computed property
//  */

