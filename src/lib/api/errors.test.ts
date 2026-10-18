import { afterEach, describe, expect, it, vi } from "vitest";
import { assertRequestSucceeded, errorMessage } from "./errors";
import { assertAdminAccess } from "./admin-access";
import { requireBackendConfig } from "../../config/environment";

afterEach(() => vi.restoreAllMocks());

describe("API failure boundaries", () => {
  it("does not turn a failed request into success or disclose the provider error", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => assertRequestSucceeded({ error: { code: "DENIED", message: "private payload" } }, "Unable to save")).toThrow("Unable to save");
    expect(log.mock.calls.flat().join(" ")).not.toContain("private payload");
    expect(() => assertRequestSucceeded({ error: null }, "Unable to save")).not.toThrow();
  });
  it("handles non-Error exceptions", () => {
    expect(errorMessage(null, "Try again")).toBe("Try again");
    expect(errorMessage(new Error("Readable failure"), "Try again")).toBe("Readable failure");
  });
  it("fails closed when the caller role check fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi.fn().mockResolvedValue({ data: true, error: { code: "FAIL" } });
    await expect(assertAdminAccess({ userId: "caller", supabase: { rpc } }, "Forbidden")).rejects.toThrow("Could not verify administrator access");
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "caller", _role: "admin" });
  });
  it("denies non-admin callers and permits a verified admin", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: false, error: null }).mockResolvedValueOnce({ data: true, error: null });
    const context = { userId: "caller", supabase: { rpc } };
    await expect(assertAdminAccess(context, "Forbidden")).rejects.toThrow("Forbidden");
    await expect(assertAdminAccess(context, "Forbidden")).resolves.toBeUndefined();
  });
  it("rejects missing environment configuration without revealing credentials", () => {
    expect(() => requireBackendConfig(undefined, "test-key")).toThrow("not configured");
    expect(() => requireBackendConfig("https://example.test", undefined)).toThrow("not configured");
    expect(requireBackendConfig("https://example.test", "test-key")).toEqual({ url: "https://example.test", key: "test-key" });
  });
});
