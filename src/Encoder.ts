/**
 * @since 2.2.3
 */
import { Contravariant2 } from 'fp-ts/lib/Contravariant'
import { Category2 } from 'fp-ts/lib/Category'
import { intersect } from './Decoder'
import { memoize } from './Schemable'
import { identity } from 'fp-ts/lib/function'

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * @category model
 * @since 2.2.3
 */
export interface Encoder<O, A> {
  readonly encode: (a: A) => O
}

// -------------------------------------------------------------------------------------
// utils
// -------------------------------------------------------------------------------------

/**
 * @since 2.2.3
 */
export type TypeOf<E> = E extends Encoder<any, infer A> ? A : never

/**
 * @since 2.2.3
 */
export type OutputOf<E> = E extends Encoder<infer O, any> ? O : never

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

/**
 * @category constructors
 * @since 2.2.3
 */
export function id<A>(): Encoder<A, A> {
  return {
    encode: identity
  }
}

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

/**
 * @category combinators
 * @since 2.2.3
 */
export function nullable<O, A>(or: Encoder<O, A>): Encoder<null | O, null | A> {
  return {
    encode: (a) => (a === null ? null : or.encode(a))
  }
}

/**
 * @category combinators
 * @since 2.2.3
 */
export function type<P extends Record<string, Encoder<any, any>>>(
  properties: P
): Encoder<{ [K in keyof P]: OutputOf<P[K]> }, { [K in keyof P]: TypeOf<P[K]> }> {
  return {
    encode: (a) => {
      const o: Record<keyof P, any> = {} as any
      for (const k in properties) {
        o[k] = properties[k].encode(a[k])
      }
      return o
    }
  }
}

/**
 * @category combinators
 * @since 2.2.3
 */
export function partial<P extends Record<string, Encoder<any, any>>>(
  properties: P
): Encoder<Partial<{ [K in keyof P]: OutputOf<P[K]> }>, Partial<{ [K in keyof P]: TypeOf<P[K]> }>> {
  return {
    encode: (a) => {
      const o: Record<keyof P, any> = {} as any
      for (const k in properties) {
        const v = a[k]
        // don't add missing properties
        if (k in a) {
          // don't strip undefined properties
          o[k] = v === undefined ? undefined : properties[k].encode(v)
        }
      }
      return o
    }
  }
}

/**
 * @category combinators
 * @since 2.2.3
 */
export function record<O, A>(codomain: Encoder<O, A>): Encoder<Record<string, O>, Record<string, A>> {
  return {
    encode: (r) => {
      const o: Record<string, O> = {}
      for (const k in r) {
        o[k] = codomain.encode(r[k])
      }
      return o
    }
  }
}

/**
 * @category combinators
 * @since 2.2.3
 */
export function array<O, A>(items: Encoder<O, A>): Encoder<Array<O>, Array<A>> {
  return {
    encode: (as) => as.map(items.encode)
  }
}

/**
 * @category combinators
 * @since 2.2.3
 */
export function tuple<C extends ReadonlyArray<Encoder<any, any>>>(
  ...components: C
): Encoder<{ [K in keyof C]: OutputOf<C[K]> }, { [K in keyof C]: TypeOf<C[K]> }> {
  return {
    encode: (as) => components.map((c, i) => c.encode(as[i])) as any
  }
}

/**
 * @category combinators
 * @since 2.2.3
 */
export function intersection<O, A, P, B>(left: Encoder<O, A>, right: Encoder<P, B>): Encoder<O & P, A & B> {
  return {
    encode: (ab) => intersect(left.encode(ab), right.encode(ab))
  }
}

/**
 * @category combinators
 * @since 2.2.3
 */
export function sum<T extends string>(
  tag: T
): <M extends Record<string, Encoder<any, any>>>(members: M) => Encoder<OutputOf<M[keyof M]>, TypeOf<M[keyof M]>> {
  return (members) => {
    return {
      encode: (a) => members[a[tag]].encode(a)
    }
  }
}

/**
 * @category combinators
 * @since 2.2.3
 */
export function lazy<O, A>(f: () => Encoder<O, A>): Encoder<O, A> {
  const get = memoize<void, Encoder<O, A>>(f)
  return {
    encode: (a) => get().encode(a)
  }
}

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

/**
 * @category Contravariant
 * @since 2.2.3
 */
export const contramap: <A, B>(f: (b: B) => A) => <E>(fa: Encoder<E, A>) => Encoder<E, B> = (f) => (fa) =>
  contramap_(fa, f)

const contramap_: <E, A, B>(fa: Encoder<E, A>, f: (b: B) => A) => Encoder<E, B> = (fa, f) => ({
  encode: (b) => fa.encode(f(b))
})

/**
 * @category Semigroupoid
 * @since 2.2.3
 */
export const compose: <E, A>(ea: Encoder<E, A>) => <B>(ab: Encoder<A, B>) => Encoder<E, B> = (ea) => (ab) =>
  compose_(ab, ea)

const compose_: <E, A, B>(ab: Encoder<A, B>, la: Encoder<E, A>) => Encoder<E, B> = (ab, ea) => ({
  encode: (b) => ea.encode(ab.encode(b))
})

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

/**
 * @category instances
 * @since 2.2.3
 */
export const URI = 'io-ts/Encoder'

/**
 * @category instances
 * @since 2.2.3
 */
export type URI = typeof URI

declare module 'fp-ts/lib/HKT' {
  interface URItoKind2<E, A> {
    readonly [URI]: Encoder<E, A>
  }
}

/**
 * @category instances
 * @since 2.2.3
 */
export const contravariantEncoder: Contravariant2<URI> = {
  URI,
  contramap: contramap_
}

/**
 * @category instances
 * @since 2.2.3
 */
export const categoryEncoder: Category2<URI> = {
  URI,
  compose: compose_,
  id
}
