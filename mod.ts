type Unwrap<T> = T extends Promise<infer U> ? U : T;

type LazyList = {
  map: <F extends (arg: any) => any | Promise<any>>(
    fn: F,
  ) => LazyList;
  sequential: () => Promise<unknown[]>;
};

export const lazyList = (generator: Generator<unknown>): LazyList => {
  let chainedGenerator: Generator = generator;
  const self: LazyList = {
    map: (fn) => {
      // instead, just change generator[Symbol.asyncIterator]?
      const gen = chainedGenerator;
      chainedGenerator = function* () {
        for (const promise of gen) {
          if (promise instanceof Promise) yield promise.then(fn);
          else yield fn(promise);
        }
      }();
      return self;
    },
    sequential: async () => {
      const results: unknown[] = [];
      for await (const element of chainedGenerator) {
        results.push(element);
      }
      return results;
    },
  };
  return self;
};
