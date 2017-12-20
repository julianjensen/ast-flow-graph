/** ******************************************************************************************************************
 * @file Describe what link-list does.
 * @author Julian Jensen <jjdanois@gmail.com>
 * @since 1.0.0
 * @date 02-Dec-2017
 *********************************************************************************************************************/
"use strict";

/**
 * @typedef {object} ListNode
 * @template T
 * @property {T} [data]
 * @property {?ListNode<T>} [next]
 * @property {?ListNode<T>} [prev]
 * @property {?ListNode<T>} [head]
 * @property {?ListNode<T>} [tail]
 * @property {function():?ListNode<T>} remove
 * @property {function(T):ListNode<T>} before
 * @property {function(T):ListNode<T>} after
 */

/**
 * @template T
 * @return {List<T>}
 */
function list()
{
    let size     = 0,
        reversed = false,
        /** @type {?ListNode<T>} */
        head,
        /** @type {?ListNode<T>} */
        tail,
        /** @return {?ListNode<T>} */
        get_head = () => reversed ? tail : head,
        /** @return {?ListNode<T>} */
        get_tail = () => reversed ? head : tail,
        /** @type {ListNode<T>} */
        tmpl     = function() {

            let next,
                prev;

            return {
                /** @type {?ListNode<T>} */
                get head() { return reversed ? tail : head; },
                /** @type {?ListNode<T>} */
                get tail() { return reversed ? head : tail; },
                /** @param {?ListNode<T>} h */
                set head( h ) {
                    if ( reversed )
                        tail = h;
                    else
                        head = h;
                },
                /** @param {?ListNode<T>} t */
                set tail( t ) {
                    if ( reversed )
                        head = t;
                    else
                        tail = t;
                },

                /** @type {?ListNode<T>} */
                get next() { return reversed ? prev : next; },
                /** @type {?ListNode<T>} */
                get prev() { return reversed ? next : prev; },
                /** @param {?ListNode<T>} n */
                set next( n ) {
                    if ( reversed )
                        prev = n;
                    else
                        next = n;
                },
                /** @param {?ListNode<T>} p */
                set prev( p ) {
                    if ( reversed )
                        next = p;
                    else
                        prev = p;
                },

                /**
                 * @return {?ListNode<T>}
                 */
                remove()
                {
                    const
                        node = this,
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

                /**
                 * @param {T} node
                 * @return {ListNode<T>}
                 */
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

                /**
                 * @param {T} node
                 * @return {ListNode<T>}
                 */
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

    /**
     * @class List<T>
     */
    class List
    {
        /**
         * @type {?T}
         */
        get head()
        {
            const h = get_head();

            return h ? h.data : null;
        }

        /**
         * @type {?T}
         */
        get tail()
        {
            const t = get_tail();

            return t ? t.data : null;
        }

        /** @type {number} */
        get size()
        {
            return size;
        }

        /**
         * @param {T} node
         * @return {ListNode<T>}
         * @template T
         */
        add( node )
        {
            return this.add_tail( node );
        }


        /**
         * @param {T} node
         * @return {ListNode<T>}
         * @template T
         */
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
        }


        /**
         * @param {T} node
         * @return {ListNode<T>}
         * @template T
         */
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
        }


        /**
         * @param {number} index
         * @return {?ListNode<T>}
         * @template T
         */
        _at( index )
        {
            if ( index < 0 || index >= size ) return null;
            else if ( index === 0 ) return get_head();
            else if ( index === size - 1 ) return get_tail();

            let p = get_head(),
                i = 0;
            while ( p )
            {
                if ( i === index ) break;
                i++;
                p = p.next;
            }

            return p;
        }


        /**
         * @param {number} index
         * @param {T} [node]
         * @return {?ListNode<T>|?T}
         * @template T
         */
        at( index, node )
        {
            const p = this._at( index );

            if ( node === void 0 ) return p.data;

            return p ? p.before( node ) : null;
        }


        /**
         * @param {ListNode<T>} n
         * @param {ListNode<T>} node
         * @return {ListNode<T>}
         * @template T
         */
        before( n, node )
        {
            return n.before( node );
        }


        /**
         * @param {ListNode<T>} n
         * @param {ListNode<T>} node
         * @return {ListNode<T>}
         * @template T
         */
        after( n, node )
        {
            return n.after( node );
        }


        /**
         * @param {number} index
         * @return {?ListNode}
         * @template T
         */
        remove( index )
        {
            const p = this._at( index );

            return p ? p.remove() : null;
        }


        /**
         * @return {List<T>}
         * @template T
         */
        clear()
        {
            head = tail = null;
            reversed = false;
            return this;
        }


        /**
         * @param {function( T, number, ListNode):*} fn
         * @template T
         */
        forEach( fn )
        {
            let p = get_head(),
                i = 0;

            while ( p )
            {
                fn( p.data, i++, p );
                p = p.next;
            }
        }


        /**
         * @param {function( T, number, ListNode<T>):*} fn
         * @return {List<*>}
         * @template T
         */
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
        }


        /**
         * @param {function( T, number, ListNode<T> ):boolean} fn
         * @return {List<T>}
         * @template T
         */
        filter( fn )
        {
            let p      = get_head(),
                i      = 0,
                result = list();

            while ( p )
            {
                if ( fn( p.data, i++, p ) ) result.add( p.data );
                p = p.next;
            }

            return result;
        }


        /**
         * @param {function( *, T, number, ListNode<T>):*} fn
         * @param {*} [init=T]
         * @return {*}
         * @template T
         */
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
        }


        /**
         * @param {boolean} [rev]
         * @return {List<T>}
         */
        reverse( rev = !reversed )
        {
            reversed = rev;

            return this;
        }
    }

    return new List();
}

module.exports = list;
