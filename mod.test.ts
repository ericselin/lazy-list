import { lazyList } from "./mod.ts";
import { assertEquals } from "https://deno.land/std@0.97.0/testing/asserts.ts";

const abcdArray = ["a", "b", "c", "d"];

function* abcdGenerator() {
  yield* abcdArray;
}

Deno.test("sequential running", async () => {
  const result = await lazyList(abcdGenerator()).sequential();
  assertEquals(result, abcdArray);
});

Deno.test("map works with simple promises", async () => {
  const result = await lazyList(abcdGenerator())
    .map((str: string) => Promise.resolve(str + "a"))
    .sequential();
  assertEquals(result, ["aa", "ba", "ca", "da"]);
});

Deno.test("map works when chained", async () => {
  const result = await lazyList(abcdGenerator())
    .map((str: string) => Promise.resolve(str + "a"))
    .map((str: string) => Promise.resolve(str + "b"))
    .sequential();
  assertEquals(result, ["aab", "bab", "cab", "dab"]);
});

Deno.test("map works with non-promises", async () => {
  const result = await lazyList(abcdGenerator())
    .map((str: string) => str + "a")
    .map((str: string) => str + "b")
    .sequential();
  assertEquals(result, ["aab", "bab", "cab", "dab"]);
});
