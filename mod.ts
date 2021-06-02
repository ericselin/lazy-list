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
  concurrent: () => Promise<A[]>;
};

export const lazyList = <A extends unknown>(
  generator: Generator<A> | AsyncGenerator<A> | A[],
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
      // check if this is a generator
      if ("next" in generator) {
        const prevGenerator = generator;
        generator = async function* () {
          for (let i = 0; i < count; i++) {
            const { value, done } = await prevGenerator.next();
            if (done) return value;
            yield value;
          }
        }();
      } else {
        generator = generator.slice(0, count);
      }
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
    concurrent: async () => {
      const promises: Promise<A>[] = [];
      for await (const element of generator) {
        promises.push(mapFns.reduce(
          (chain, fn) => chain.then(fn),
          Promise.resolve(element as unknown),
        ) as Promise<A>);
      }
      return await Promise.all(promises);
    },
  };
  return self;
};
