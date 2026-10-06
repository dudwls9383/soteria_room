import test from "node:test";
import assert from "node:assert/strict";
import { audioTime, validLoop } from "../lib/asmr-audio.ts";
test("long ASMR durations retain hours and fractional loop positions", () => {
  assert.equal(audioTime(14405), "04:00:05");
  assert.equal(audioTime(.5,true), "00:00:00.5");
  assert.equal(audioTime(Infinity), "00:00:00");
});
test("A/B region stays inside the recording and excludes invalid or zero-length bounds", () => {
  assert.equal(validLoop(14399,14400,14400),true);
  for(const [a,b,d] of [[0,0,14400],[-1,5,14400],[2,1,14400],[0,14401,14400],[0,NaN,14400],[0,.24,14400]]) assert.equal(validLoop(a,b,d),false);
  assert.equal(validLoop(0,.25,14400),true);
});
