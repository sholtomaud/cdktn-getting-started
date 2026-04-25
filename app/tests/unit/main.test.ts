import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { formatUptime } from "../../src/ts/main";

describe("formatUptime", () => {
  test("returns seconds only when under 1 minute", () => {
    assert.strictEqual(formatUptime(0), "0s");
    assert.strictEqual(formatUptime(45), "45s");
    assert.strictEqual(formatUptime(59), "59s");
  });

  test("returns minutes and seconds when under 1 hour", () => {
    assert.strictEqual(formatUptime(60), "1m 0s");
    assert.strictEqual(formatUptime(90), "1m 30s");
    assert.strictEqual(formatUptime(3599), "59m 59s");
  });

  test("returns hours and minutes when 1 hour or more", () => {
    assert.strictEqual(formatUptime(3600), "1h 0m");
    assert.strictEqual(formatUptime(3661), "1h 1m");
    assert.strictEqual(formatUptime(7384), "2h 3m");
  });
});
