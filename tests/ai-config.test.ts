import { describe, expect, it } from "vitest";
import {
  apiErrorMessage,
  buildSettingBody,
  checkErrorMessage,
  normalizePathPrefix,
  PROVIDER_OPTIONS,
  validateRepositoryForm,
  validateServiceName,
  validateSettingForm,
  type SettingForm,
} from "@/lib/ai-config";

const form = (over: Partial<SettingForm> = {}): SettingForm => ({
  provider: "groq",
  model: "llama-3.3-70b",
  apiKey: "",
  temperature: "",
  maxTokens: "",
  ...over,
});

describe("validateSettingForm", () => {
  it("accepts a minimal form, with no key (the stored one is kept)", () => {
    expect(validateSettingForm(form())).toBeNull();
  });

  it("checks the provider against the supported list", () => {
    for (const p of PROVIDER_OPTIONS)
      expect(validateSettingForm(form({ provider: p }))).toBeNull();
    expect(validateSettingForm(form({ provider: "bing" }))).toMatch(/provider/);
  });

  it("needs a model, within 128 characters", () => {
    expect(validateSettingForm(form({ model: "  " }))).toMatch(/model/);
    expect(validateSettingForm(form({ model: "m".repeat(129) }))).toMatch(
      /long/
    );
  });

  it("rejects a key that is too short but allows a blank one", () => {
    expect(validateSettingForm(form({ apiKey: "short" }))).toMatch(/short/);
    expect(validateSettingForm(form({ apiKey: "12345678" }))).toBeNull();
  });

  it("checks temperature (0 to 2) and max tokens (whole, 1 to 32000)", () => {
    expect(validateSettingForm(form({ temperature: "0" }))).toBeNull();
    expect(validateSettingForm(form({ temperature: "2" }))).toBeNull();
    expect(validateSettingForm(form({ temperature: "2.1" }))).toMatch(
      /Temperature/
    );
    expect(validateSettingForm(form({ temperature: "abc" }))).toMatch(
      /Temperature/
    );
    expect(validateSettingForm(form({ maxTokens: "32000" }))).toBeNull();
    expect(validateSettingForm(form({ maxTokens: "0" }))).toMatch(/Max tokens/);
    expect(validateSettingForm(form({ maxTokens: "1.5" }))).toMatch(
      /Max tokens/
    );
    expect(validateSettingForm(form({ maxTokens: "32001" }))).toMatch(
      /Max tokens/
    );
  });
});

describe("buildSettingBody", () => {
  it("leaves out blank optional fields, so no key is sent to replace the stored one", () => {
    expect(buildSettingBody(form({ model: " m " }))).toEqual({
      provider: "groq",
      model: "m",
    });
  });

  it("includes what was typed, as numbers", () => {
    expect(
      buildSettingBody(
        form({ apiKey: " secret-key ", temperature: "0.2", maxTokens: "4000" })
      )
    ).toEqual({
      provider: "groq",
      model: "llama-3.3-70b",
      apiKey: "secret-key",
      temperature: 0.2,
      maxTokens: 4000,
    });
  });

  it("keeps a temperature of 0 (zero is a value, not blank)", () => {
    expect(buildSettingBody(form({ temperature: "0" })).temperature).toBe(0);
  });
});

describe("validateRepositoryForm", () => {
  const ok = { owner: "acme", name: "payments", token: "ghp_12345678" };

  it("accepts a normal repository", () => {
    expect(validateRepositoryForm(ok)).toBeNull();
    expect(validateRepositoryForm({ ...ok, name: "my.repo_v2-x" })).toBeNull();
  });

  it("rejects a bad owner, name or token", () => {
    expect(validateRepositoryForm({ ...ok, owner: "-acme" })).toMatch(/Owner/);
    expect(validateRepositoryForm({ ...ok, owner: "a/b" })).toMatch(/Owner/);
    expect(validateRepositoryForm({ ...ok, name: ".." })).toMatch(/name/);
    expect(validateRepositoryForm({ ...ok, name: "a b" })).toMatch(/name/);
    expect(validateRepositoryForm({ ...ok, token: "short" })).toMatch(/token/);
  });
});

describe("normalizePathPrefix", () => {
  it("strips edge slashes and spaces; empty means the whole repository", () => {
    expect(normalizePathPrefix(" /services/payment/ ")).toBe(
      "services/payment"
    );
    expect(normalizePathPrefix("")).toBe("");
    expect(normalizePathPrefix("/")).toBe("");
  });

  it("refuses anything that could leave the checkout", () => {
    for (const bad of [
      "..",
      "a/../b",
      "./a",
      "a//b",
      "a\\b",
      "a\0b",
      "x/".repeat(1) + "../",
    ])
      expect(normalizePathPrefix(bad)).toBeNull();
    expect(normalizePathPrefix("a/".repeat(300))).toBeNull();
  });
});

describe("validateServiceName", () => {
  it("needs a non-blank name up to 255 characters", () => {
    expect(validateServiceName("payment-service")).toBeNull();
    expect(validateServiceName("  ")).toMatch(/Enter/);
    expect(validateServiceName("s".repeat(256))).toMatch(/long/);
  });
});

describe("apiErrorMessage", () => {
  const res = (status: number, detail?: unknown) => ({
    response: { status, data: { detail } },
  });

  it("uses the service's plain detail text", () => {
    expect(apiErrorMessage(res(422, "GitHub rejected the token"), "x")).toBe(
      "GitHub rejected the token"
    );
    expect(
      apiErrorMessage(res(409, "This repository is already connected"), "x")
    ).toMatch(/already connected/);
  });

  it("says admins only for a 403, even if there is a detail", () => {
    expect(apiErrorMessage(res(403, "Insufficient role"), "x")).toMatch(
      /admins/
    );
  });

  it("ignores structured or very long details and falls back", () => {
    expect(apiErrorMessage(res(422, [{ msg: "a" }]), "fallback")).toBe(
      "fallback"
    );
    expect(apiErrorMessage(res(500, "x".repeat(500)), "fallback")).toBe(
      "fallback"
    );
    expect(apiErrorMessage(new Error("net"), "fallback")).toBe("fallback");
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("explains a 503 with no detail", () => {
    expect(apiErrorMessage(res(503), "x")).toMatch(/not able/);
  });
});

describe("checkErrorMessage", () => {
  it("maps known categories and shows unknown ones in brackets", () => {
    expect(checkErrorMessage("auth")).toMatch(/rejected the key/);
    expect(checkErrorMessage("model_not_found")).toMatch(/model/);
    expect(checkErrorMessage("weird")).toMatch(/weird/);
    expect(checkErrorMessage(null)).toMatch(/failed/);
  });
});
