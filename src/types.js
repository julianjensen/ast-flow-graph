/** ******************************************************************************************************************
 * @file Think types.h
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 03-Jan-2018
 *********************************************************************************************************************/
"use strict";

// /**
//  * @param {Array<string>} names
//  * @param {number} [start=0]
//  * @param {boolean} [bitWise=false]
//  * @return {object<string|number,string|number>}
//  */
// function make_enum( names, start = 0, bitWise = false )
// {
//     let __enum = {};
//
//     names.forEach( ( name, i ) => __enum[ __enum[ name ] = ( bitWise ? ( ( start || 1 ) << i ) : ( start + 1 ) ) ] = name );
//
//     return __enum;
// }

/**
 * @param {object<string,number>} names
 * @return {Block|Edge|SymbolFlags|ModifierFlags}
 */
function make_enum_from_object( names ) // , start = 0, bitWise = false )
{
    let __enum = {};

    Object.entries( names ).forEach( ( [ name, val ] ) => __enum[ __enum[ name ] = val ] = name );

    return __enum;
}


/**
 * @enum
 */
export let Block                = {
        NONE:      0,
        START:     1,
        EXIT:      2,
        NORMAL:    4,
        TEST:      8,
        LOOP:      16,
        CONVERGE:  32,
        TEMPORARY: 64,
        DELETED:   128,
        CATCH:     512,
        THROW:     1024,
        CLEAR:     3,
        EXCLUSIVE: 15
    };
    /** @type {Block} */
    Block               = make_enum_from_object( Block );
    /**
     * @enum
     */
export let    Edge                 = {
        NONE:      0,
        TREE:      1,
        FORWARD:   2,
        BACK:      4,
        CROSS:     8,
        JUMP:      256,
        EXCEPTION: 512,
        RETURN:    1024,
        BREAK:     2048,
        CONTINUE:  4096,
        TRUE:      8192,
        FALSE:     16384,
        LOOP:      32768,
        CLEAR:     255

    };
    /**
     * @type {Edge}
     */
    Edge                = make_enum_from_object( Edge );
    /** */
export let    defaultOutputOptions = {
        MAX_EDGES_TO_PRINT: 7,
        SPACE_PER_EDGE:     4,
        LEFT_EDGES:         ' <-- ', // ' ←── ',
        RIGHT_EDGES:        ' --> ', // ' ──→ ',
        AST_NODES:          ' => ',
        TRUE_EDGE:          '+', // '✔',
        FALSE_EDGE:         '-', // '✖',
        START_NODE:         '+', // '→',
        EXIT_NODE:          '$' // '⛔',
    };

/** @enum SymbolFlags */
export let SymbolFlags = {};
      /** @enum SymbolFlags */
let      _sf         = {
          None:                   0,
          FunctionScopedVariable: 1 << 0,   // Variable (var) or parameter
          BlockScopedVariable:    1 << 1,   // A block-scoped variable (let or const)
          Property:               1 << 2,   // Property or enum member
          EnumMember:             1 << 3,   // Enum member
          Function:               1 << 4,   // Function
          Class:                  1 << 5,   // Class
          Interface:              1 << 6,   // Interface
          ConstEnum:              1 << 7,   // Const enum
          RegularEnum:            1 << 8,   // Enum
          ValueModule:            1 << 9,   // Instantiated module
          NamespaceModule:        1 << 10,  // Uninstantiated module
          TypeLiteral:            1 << 11,  // Type Literal or mapped type
          ObjectLiteral:          1 << 12,  // Object Literal
          Method:                 1 << 13,  // Method
          Constructor:            1 << 14,  // Constructor
          GetAccessor:            1 << 15,  // Get accessor
          SetAccessor:            1 << 16,  // Set accessor
          Signature:              1 << 17,  // Call, construct, or index signature
          TypeParameter:          1 << 18,  // Type parameter
          TypeAlias:              1 << 19,  // Type alias
          ExportValue:            1 << 20,  // Exported value marker (see comment in declareModuleMember in binder)
          Alias:                  1 << 21,  // An alias for another symbol (see comment in isAliasSymbolDeclaration in checker)
          Prototype:              1 << 22,  // Prototype property (no source representation)
          ExportStar:             1 << 23,  // Export * declaration
          Optional:               1 << 24,  // Optional property
          Transient:              1 << 25,  // Transient symbol (created during type check)
          JSContainer:            1 << 26   // Contains Javascript special declarations
      },
      /** @enum SymbolFlags */
      combo       = {},
      /** @enum SymbolFlags */
      _combo      = {
          /* @internal */
          All: _sf.FunctionScopedVariable | _sf.BlockScopedVariable | _sf.Property | _sf.EnumMember | _sf.Function | _sf.Class | _sf.Interface | _sf.ConstEnum | _sf.RegularEnum | _sf.ValueModule | _sf.NamespaceModule |
               _sf.TypeLiteral | _sf.ObjectLiteral | _sf.Method | _sf.Constructor | _sf.GetAccessor | _sf.SetAccessor | _sf.Signature | _sf.TypeParameter | _sf.TypeAlias | _sf.ExportValue | _sf.Alias | _sf.Prototype |
               _sf.ExportStar |
               _sf.Optional | _sf.Transient,

          Enum:      _sf.RegularEnum | _sf.ConstEnum,
          Variable:  _sf.FunctionScopedVariable | _sf.BlockScopedVariable,
          Value:     _sf.Variable | _sf.Property | _sf.EnumMember | _sf.Function | _sf.Class | combo.Enum | _sf.ValueModule | _sf.Method | _sf.GetAccessor | _sf.SetAccessor,
          Type:      _sf.Class | _sf.Interface | combo.Enum | _sf.EnumMember | _sf.TypeLiteral | _sf.ObjectLiteral | _sf.TypeParameter | _sf.TypeAlias,
          Namespace: _sf.ValueModule | _sf.NamespaceModule | combo.Enum,
          Module:    _sf.ValueModule | _sf.NamespaceModule,
          Accessor:  _sf.GetAccessor | _sf.SetAccessor,

          // Variables can be redeclared, but can not redeclare a block-scoped declaration with the
          // same name, or any other value that is not a variable, e.g. ValueModule or Class
          FunctionScopedVariableExcludes: combo.Value & ~_sf.FunctionScopedVariable,

          // Block-scoped declarations are not allowed to be re-declared
          // they can not merge with anything in the value space
          BlockScopedVariableExcludes: combo.Value,

          ParameterExcludes:       combo.Value,
          PropertyExcludes:        _sf.None,
          EnumMemberExcludes:      combo.Value | combo.Type,
          FunctionExcludes:        combo.Value & ~( _sf.Function | _sf.ValueModule ),
          ClassExcludes:           ( combo.Value | combo.Type ) & ~( _sf.ValueModule | _sf.Interface ), // class-interface mergability done in checker.ts
          InterfaceExcludes:       combo.Type & ~( _sf.Interface | _sf.Class ),
          RegularEnumExcludes:     ( combo.Value | combo.Type ) & ~( _sf.RegularEnum | _sf.ValueModule ), // regular enums merge only with regular enums and modules
          ConstEnumExcludes:       ( combo.Value | combo.Type ) & ~_sf.ConstEnum, // const enums merge only with const enums
          ValueModuleExcludes:     combo.Value & ~( _sf.Function | _sf.Class | _sf.RegularEnum | _sf.ValueModule ),
          NamespaceModuleExcludes: 0,
          MethodExcludes:          combo.Value & ~_sf.Method,
          GetAccessorExcludes:     combo.Value & ~_sf.SetAccessor,
          SetAccessorExcludes:     combo.Value & ~_sf.GetAccessor,
          TypeParameterExcludes:   combo.Type & ~_sf.TypeParameter,
          TypeAliasExcludes:       combo.Type,
          AliasExcludes:           _sf.Alias,

          ModuleMember: _sf.Variable | _sf.Function | _sf.Class | _sf.Interface | combo.Enum | combo.Module | _sf.TypeAlias | _sf.Alias,

          ExportHasLocal: _sf.Function | _sf.Class | combo.Enum | _sf.ValueModule,

          HasExports: _sf.Class | combo.Enum | combo.Module,
          HasMembers: _sf.Class | _sf.Interface | _sf.TypeLiteral | _sf.ObjectLiteral,

          BlockScoped: _sf.BlockScopedVariable | _sf.Class | combo.Enum,

          PropertyOrAccessor: _sf.Property | combo.Accessor,

          ClassMember: _sf.Method | combo.Accessor | _sf.Property,

          /* @internal */
          // The set of things we consider semantically classifiable.  Used to speed up the LS during
          // classification.
          Classifiable: _sf.Class | combo.Enum | _sf.TypeAlias | _sf.Interface | _sf.TypeParameter | combo.Module | _sf.Alias,

          /* @internal */
          LateBindingContainer: _sf.Class | _sf.Interface | _sf.TypeLiteral | _sf.ObjectLiteral
      };

Object.assign( combo, _combo );
Object.assign( SymbolFlags, _sf, combo );

/** @enum ModifierFlags */
export let ModifierFlags   = {
    None:             0,
    Export:           1 << 0,  // Declarations
    Ambient:          1 << 1,  // Declarations
    Public:           1 << 2,  // Property/Method
    Private:          1 << 3,  // Property/Method
    Protected:        1 << 4,  // Property/Method
    Static:           1 << 5,  // Property/Method
    Readonly:         1 << 6,  // Property/Method
    Abstract:         1 << 7,  // Class/Method/ConstructSignature
    Async:            1 << 8,  // Property/Method/Function
    Default:          1 << 9,  // Function/Class (export default declaration)
    Const:            1 << 11, // Variable declaration
    HasComputedFlags: 1 << 29 // Modifier flags have been computed
},
      __ModifierFlags = {},
      /** @enum ModifierFlags */
      __m             = {
          AccessibilityModifier:          ModifierFlags.Public | ModifierFlags.Private | ModifierFlags.Protected,
          // Accessibility modifiers and 'readonly' can be attached to a parameter in a constructor to make it a property.
          ParameterPropertyModifier:      __ModifierFlags.AccessibilityModifier | ModifierFlags.Readonly,
          NonPublicAccessibilityModifier: ModifierFlags.Private | ModifierFlags.Protected,

          TypeScriptModifier: ModifierFlags.Ambient | ModifierFlags.Public | ModifierFlags.Private | ModifierFlags.Protected | ModifierFlags.Readonly | ModifierFlags.Abstract | ModifierFlags.Const,
          ExportDefault:      ModifierFlags.Export | ModifierFlags.Default
      };
Object.assign( __ModifierFlags, __m );
Object.assign( ModifierFlags, __ModifierFlags );
/** @type {ModifierFlags} */
ModifierFlags = make_enum_from_object( ModifierFlags );


/** @type {SymbolFlags} */
SymbolFlags  = make_enum_from_object( SymbolFlags );
export const outputOptions = defaultOutputOptions;

export function output( options = {} )
{
    Object.assign( outputOptions, defaultOutputOptions, options );
}

export function enum_to_string( enumType, val )
{
    let vals = [];

    for ( let i = 1; i < 1 << 30; i = i << 1 )
    {
        if ( !( val & ~( i - 1 ) ) ) break;
        if ( val & i ) vals.push( enumType[ val & i ] );
    }

    return vals;
}
