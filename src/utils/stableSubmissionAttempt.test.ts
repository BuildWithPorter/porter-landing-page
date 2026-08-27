import { describe, expect, it, vi } from "vitest";

import { stableSubmissionAttempt } from "./stableSubmissionAttempt";

describe("stableSubmissionAttempt", () => {
  it("reuses an id for the same canonical payload and rotates for a real edit", () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn()
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000002") });

    const first = stableSubmissionAttempt(null, "canonical-payload");
    const retry = stableSubmissionAttempt(first, "canonical-payload");
    const edited = stableSubmissionAttempt(retry, "edited-payload");

    expect(retry.id).toBe(first.id);
    expect(edited.id).not.toBe(first.id);
    vi.unstubAllGlobals();
  });
});
