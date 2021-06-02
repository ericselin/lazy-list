type Unwrap<T> = T extends Promise<infer U> ? U : T;

type LazyList<A> = {
  map: <F extends (arg: A) => unknown, R extends Unwrap<ReturnType<F>>>(
    fn: F,
  ) => LazyList<R>;
  each: <F extends (arg: A) => unknown>(
    fn: F,
  ) => LazyList<A>;
  take: (count: number) => LazyList<A>;
  sequential: () => Promise<A[]>;
};

export const lazyList = <A extends unknown>(
  generator: Generator<A>,
): LazyList<A> => {
  const mapFns: ((arg: unknown) => unknown)[] = [];
  const self: LazyList<A> = {
    map: <F extends (arg: A) => unknown, R extends Unwrap<ReturnType<F>>>(
      fn: F,
    ) => {
      mapFns.push(fn as (arg: unknown) => unknown);
      return self as LazyList<R>;
    },
    each: <F extends (arg: A) => unknown>(fn: F) => {
      mapFns.push(async (arg) => {
        await fn(arg as A);
        return arg;
      });
      return self as LazyList<A>;
    },
    take: (count) => {
      const prevGenerator = generator;
      generator = function* () {
        for (let i = 0; i < count; i++) {
          const { value, done } = prevGenerator.next();
          if (done) return value;
          yield value;
        }
      }();
      return self;
    },
    sequential: async () => {
      const results: A[] = [];
      for await (const element of generator) {
        const value = await mapFns.reduce(
          (chain, fn) => chain.then(fn),
          Promise.resolve(element as unknown),
        );
        results.push(value as A);
      }
      return results;
    },
  };
  return self;
};
