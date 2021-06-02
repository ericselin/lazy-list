import { lazyList } from "./mod.ts";
import { assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";

const abcdArray = ["a", "b", "c", "d"];

function* abcdGenerator() {
  yield* abcdArray;
}

function* numberGenerator() {
  let i = 1;
  while (true) {
    yield i++;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.test("run the pipeline one-by-one with `.sequential`", async () => {
  const result = await lazyList(abcdGenerator()).sequential();
  assertEquals(result, abcdArray);
});

Deno.test("map values using (potentially async) functions with `.map`", async () => {
  const result = await lazyList(abcdGenerator())
    .map(async (str: string) => {
      await sleep(10);
      return str + "a";
    })
    .map((str: string) => str + "b")
    .sequential();
  assertEquals(result, ["aab", "bab", "cab", "dab"]);
});

Deno.test("create (potentially async) side-effects with `.each`", async () => {
  const sideEffects: string[] = [];
  const asyncSideEffects: string[] = [];
  const result: string[] = await lazyList(abcdGenerator())
    .each((str: string) => {
      sideEffects.push(str + "s");
    })
    .each(async (str: string) => {
      await sleep(10);
      asyncSideEffects.push(str + "a");
    })
    .sequential();
  assertEquals(sideEffects, ["as", "bs", "cs", "ds"]);
  assertEquals(asyncSideEffects, ["aa", "ba", "ca", "da"]);
  assertEquals(result, ["a", "b", "c", "d"]);
});

Deno.test("side-effects with `.each` are created based on the last mapped value", async () => {
  const sideEffects: string[] = [];
  const result = await lazyList(abcdGenerator())
    .map((str: string) => Promise.resolve(str + "a"))
    .each(async (str: string) => {
      await sleep(10);
      sideEffects.push(str + "s");
    })
    .map((str: string) => Promise.resolve(str + "b"))
    .sequential();
  assertEquals(sideEffects, ["aas", "bas", "cas", "das"]);
  assertEquals(result, ["aab", "bab", "cab", "dab"]);
});

Deno.test("limit the number of generated values with `.take`", async () => {
  const results = await lazyList(numberGenerator())
    .take(5)
    .sequential();
  assertEquals(results, [1, 2, 3, 4, 5]);
});
