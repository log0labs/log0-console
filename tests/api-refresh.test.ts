// The shared token refresh and the 401 handling of the authenticated axios clients, with fetch and the adapter faked.
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthedApi, endSession, refreshAccessToken } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

function jwt(userId: string) {
  const payload = btoa(
    JSON.stringify({ userId, tenantId: "t-1", role: "ENGINEER" })
  );
  return `h.${payload}.s`;
}

interface FetchLog {
  refreshes: number;
  cookieDeletes: number;
}

let log: FetchLog;
let refreshResponse: () => Promise<Response>;
let fakeWindow: { location: { href: string } };

beforeEach(() => {
  log = { refreshes: 0, cookieDeletes: 0 };
  refreshResponse = async () => Response.json({ accessToken: jwt("u-2") });
  fakeWindow = { location: { href: "/" } };
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/refresh") {
        log.refreshes += 1;
        return refreshResponse();
      }
      if (url === "/api/auth/cookie" && init?.method === "DELETE") {
        log.cookieDeletes += 1;
        return new Response(null, { status: 204 });
      }
      throw new Error(`unexpected fetch ${url}`);
    })
  );
  useAuthStore
    .getState()
    .setAuth({
      accessToken: jwt("u-1"),
      userId: "u-1",
      tenantId: "t-1",
      role: "ENGINEER",
    });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useAuthStore.getState().clearAuth();
});

/** A client whose "server" answers 401 to any request that does not carry `goodToken`. */
function clientWhoseServerWants(goodToken: () => string) {
  const instance = createAuthedApi();
  const seen: (string | undefined)[] = [];
  instance.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const auth = config.headers.Authorization as string | undefined;
    seen.push(auth);
    if (auth !== `Bearer ${goodToken()}`) {
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
        status: 401,
        statusText: "Unauthorized",
        data: {},
        headers: {},
        config,
      });
    }
    return {
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  return { instance, seen };
}

describe("createAuthedApi", () => {
  it("sends the stored access token", async () => {
    const { instance, seen } = clientWhoseServerWants(
      () => useAuthStore.getState().accessToken!
    );
    await instance.get("/x");
    expect(seen).toEqual([`Bearer ${jwt("u-1")}`]);
    expect(log.refreshes).toBe(0);
  });

  it("refreshes once on a 401 and retries with the new token", async () => {
    const { instance, seen } = clientWhoseServerWants(() => jwt("u-2"));
    const response = await instance.get("/x");

    expect(response.data).toEqual({ ok: true });
    expect(log.refreshes).toBe(1);
    expect(seen).toEqual([`Bearer ${jwt("u-1")}`, `Bearer ${jwt("u-2")}`]);
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: jwt("u-2"),
      userId: "u-2",
    });
  });

  it("makes concurrent 401s share one refresh", async () => {
    const { instance } = clientWhoseServerWants(() => jwt("u-2"));
    const responses = await Promise.all([
      instance.get("/a"),
      instance.get("/b"),
      instance.get("/c"),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(log.refreshes).toBe(1); // a second refresh would burn the rotated refresh token
  });

  it("makes two different clients share one refresh too", async () => {
    const a = clientWhoseServerWants(() => jwt("u-2")).instance;
    const b = clientWhoseServerWants(() => jwt("u-2")).instance;
    await Promise.all([a.get("/x"), b.get("/y")]);
    expect(log.refreshes).toBe(1);
  });

  it("ends the session when the refresh fails, once, however many requests were waiting", async () => {
    refreshResponse = async () => new Response("{}", { status: 401 });
    const { instance } = clientWhoseServerWants(() => jwt("u-2"));

    const results = await Promise.allSettled([
      instance.get("/a"),
      instance.get("/b"),
      instance.get("/c"),
    ]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(fakeWindow.location.href).toBe("/login");
    expect(log.cookieDeletes).toBe(1);
  });

  it("does not log the user out when the retried request fails again", async () => {
    const { instance } = clientWhoseServerWants(() => "a token nobody has");
    await expect(instance.get("/x")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(log.refreshes).toBe(1); // tried once, no loop
    expect(log.cookieDeletes).toBe(0);
    expect(fakeWindow.location.href).toBe("/");
  });

  it("passes other errors through untouched", async () => {
    const instance = createAuthedApi();
    instance.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError("Server error", "ERR_BAD_RESPONSE", config, null, {
        status: 500,
        statusText: "x",
        data: {},
        headers: {},
        config,
      });
    };
    await expect(instance.get("/x")).rejects.toMatchObject({
      response: { status: 500 },
    });
    expect(log.refreshes).toBe(0);
  });
});

describe("refreshAccessToken and endSession", () => {
  it("stores the token it gets and returns it", async () => {
    await expect(refreshAccessToken()).resolves.toBe(jwt("u-2"));
    expect(useAuthStore.getState().userId).toBe("u-2");
  });

  it("shares a refresh that is in flight, and starts a new one afterwards", async () => {
    const [first, second] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ]);
    expect(first).toBe(second);
    expect(log.refreshes).toBe(1);
    await refreshAccessToken();
    expect(log.refreshes).toBe(2);
  });

  it("can recover after a failed refresh (the failure is not remembered)", async () => {
    refreshResponse = async () => new Response("{}", { status: 500 });
    await expect(refreshAccessToken()).rejects.toThrow("Refresh failed");
    refreshResponse = async () => Response.json({ accessToken: jwt("u-3") });
    await expect(refreshAccessToken()).resolves.toBe(jwt("u-3"));
  });

  it("endSession clears the auth state, drops the cookie and goes to the login page", async () => {
    await endSession();
    expect(useAuthStore.getState().authReady).toBe(false);
    expect(log.cookieDeletes).toBe(1);
    expect(fakeWindow.location.href).toBe("/login");
  });
});
