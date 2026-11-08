import assert from "node:assert/strict";
import test from "node:test";
import { getIntegrationRuntimeStatus } from "../lib/integration-runtime";

const originalUrl = process.env.ACTIVEPIECES_API_URL;
const originalKey = process.env.ACTIVEPIECES_API_KEY;

function restoreEnvironment() {
  if (originalUrl === undefined) delete process.env.ACTIVEPIECES_API_URL;
  else process.env.ACTIVEPIECES_API_URL = originalUrl;
  if (originalKey === undefined) delete process.env.ACTIVEPIECES_API_KEY;
  else process.env.ACTIVEPIECES_API_KEY = originalKey;
}

test.after(restoreEnvironment);

test("integration runtime is not reported ready without a server URL", () => {
  delete process.env.ACTIVEPIECES_API_URL;
  delete process.env.ACTIVEPIECES_API_KEY;
  assert.deepEqual(getIntegrationRuntimeStatus(), { provider: "activepieces", configured: false, reason: "missing_url" });
});

test("integration runtime never accepts an insecure remote endpoint", () => {
  process.env.ACTIVEPIECES_API_URL = "http://automation.example.com";
  process.env.ACTIVEPIECES_API_KEY = "server-only";
  assert.deepEqual(getIntegrationRuntimeStatus(), { provider: "activepieces", configured: false, reason: "invalid_url" });
});

test("integration runtime reports ready only with an HTTPS endpoint and key", () => {
  process.env.ACTIVEPIECES_API_URL = "https://automation.kernova.ai";
  process.env.ACTIVEPIECES_API_KEY = "server-only";
  assert.deepEqual(getIntegrationRuntimeStatus(), { provider: "activepieces", configured: true, reason: "ready" });
});
