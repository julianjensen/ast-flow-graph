/** ******************************************************************************************************************
 * @file Describe what link-list does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 02-Dec-2017
 *********************************************************************************************************************/
"use strict";

/**
 * @typedef {object} ListNode
 * @property {*} [data]
 * @property {?ListNode} [next]
 * @property {?ListNode} [prev]
 * @property {?ListNode} [head]
 * @property {?ListNode} [tail]
 * @property {function(ListNode):ListNode=} remove
 * @property {function(ListNode):ListNode=} before
 * @property {function(ListNode):ListNode=} after
 */

/**
 * @return {*}
 */
function list()
{
    let size     = 0,
        reversed = false,
        head,
        tail,
        get_head = () => reversed ? tail : head,
        get_tail = () => reversed ? head : tail,
        /** @type {ListNode} */
        tmpl     = function() {

            let next,
                prev;

            return {
                get head() { return reversed ? tail : head; },
                get tail() { return reversed ? head : tail; },
                set head( h ) {
                    if ( reversed )
                        tail = h;
                    else
                        head = h;
                },
                set tail( t ) {
                    if ( reversed )
                        head = t;
                    else
                        tail = t;
                },

                get next() { return reversed ? prev : next; },
                get prev() { return reversed ? next : prev; },
                set next( n ) {
                    if ( reversed )
                        prev = n;
                    else
                        next = n;
                },
                set prev( p ) {
                    if ( reversed )
                        next = p;
                    else
                        prev = p;
                },

                remove( node )
                {
                    const
                        next = node.next,
                        prev = node.prev;

                    if ( prev ) prev.next = next;
                    if ( next ) next.prev = prev;

                    if ( !prev ) this.head = next;
                    if ( !next ) this.tail = prev;

                    node.next = node.prev = null;   // Help the gc
                    --size;
                    return next;
                },
                before( node )
                {
                    const
                        n = tmpl();

                    n.data = node;
                    n.next = this;
                    n.prev = this.prev;

                    if ( this.prev ) this.prev.next = n;
                    this.prev = n;
                    if ( !n.prev ) this.head = n;
                    ++size;

                    return n;
                },
                after( node )
                {
                    const
                        n = tmpl();

                    n.data = node;
                    n.next = this.next;
                    n.prev = this;

                    if ( this.next ) this.next.prev = n;
                    this.next = n;
                    if ( !n.next ) this.tail = n;
                    ++size;

                    return n;
                }
            };
        };

    return {
        add( node )
        {
            return this.add_tail( node );
        },
        add_tail( node )
        {
            const
                n = tmpl();

            n.data = node;
            n.next = null;
            n.prev = n.tail;

            if ( n.tail && n.tail.prev ) n.tail.prev.next = n;

            if ( !n.prev ) n.head = n;
            ++size;

            return n.tail = n;
        },
        add_head( node )
        {
            const
                n = tmpl();

            n.data = node;
            n.next = n.head;
            n.prev = null;

            if ( n.head && n.head.next ) n.head.next.prev = n;

            if ( !n.next ) n.tail = n;
            ++size;

            return n.head = n;
        },
        _at( index )
        {
            if ( index < 0 || index >= size ) return null;
            else if ( index === 0 ) return n.head;
            else if ( index === size - 1 ) return n.tail;

            let p = get_head(),
                i = 0;
            while ( p )
            {
                if ( i === index ) break;
                i++;
                p = p.next;
            }

            return p;
        },
        at( index, node )
        {
            const p = this._at( index );

            return p ? p.before( node ) : null;
        },
        before( n, node )
        {
            return n.before( node );
        },
        after( n, node )
        {
            return n.after( node );
        },
        remove( index )
        {
            const p = this._at( index );

            return p ? p.remove() : null;
        },
        clear()
        {
            head = tail = null;
            reversed = false;
            return this;
        },
        forEach( fn )
        {
            let p = get_head(),
                i = 0;

            while ( p )
            {
                fn( p.data, i++, p );
                p = p.next;
            }
        },
        map( fn )
        {
            let p      = get_head(),
                i      = 0,
                result = list();

            while ( p )
            {
                result.add( fn( p.data, i++, p ) );
                p = p.next;
            }

            return result;
        },
        filter( fn )
        {
            let p      = get_head(),
                i      = 0,
                result = list();

            while ( p )
            {
                if ( fn( p.data, i++, p ) ) result.add( p );
                p = p.next;
            }

            return result;
        },
        reduce( fn, init = get_head() && get_head().data )
        {
            let p   = get_head(),
                i   = 0,
                res = init;

            while ( p )
            {
                res = fn( res, p.data, i++, p );
                p   = p.next;
            }

            return res;
        },
        reverse( rev = !reversed )
        {
            reversed = rev;

            return this;
        }
    };
}

module.exports = list;
