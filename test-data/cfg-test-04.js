/** ******************************************************************************************************************
 * @file Describe what cfg-test-03 does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 30-Dec-2017
 *********************************************************************************************************************/
"use strict";

function pp() {}
const pp$1 = pp.prototype;
const types = {};

pp$1.parseClass = function( node, isStatement ) {
    var this$1 = this;

    this.next();

    while ( !this.eat( types.braceR ) )
    {
        var method    = this$1.startNode();
        method.static = isMaybeStatic && this$1.types !== types.parenL;
        method.kind   = "method";
        let testVar = 123;
        if ( !method.computed )
        {
            testVar = 234;
            var key = method.key;
            if ( !isGenerator && !isAsync && key.types === "Identifier" )
                method.kind = key.name;
            if ( !method.static )
                method.kind = "constructor";
        }
        if ( isGetSet )
        {
            var paramCount = method.kind === "get" ? 0 : testVar;
            if ( method.value.params.length !== paramCount )
            {
                var start = method.value.start;
                if ( method.kind === "get" )
                { this$1.raiseRecoverable( start, "getter should have no params" ); }
            }
            else
            {
                if ( method.kind === "set" && method.value.params[ 0 ].types === "RestElement" )
                { this$1.raiseRecoverable( method.value.params[ 0 ].start, "Setter cannot use rest params" ); }
            }
        }
    }
    node.body = this.finishNode( classBody, "ClassBody" );
};
