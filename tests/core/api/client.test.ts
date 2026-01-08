import { describe, expect, it, vi } from "vitest";
import {
  type ClientFactories,
  createApiClients,
  type RequestHandler,
} from "../../../src/core/api/client";
import type {
  AuthService,
  ConsumerService,
  ModelService,
  SubscriptionService,
  UsageService,
} from "../../../src/generated/router/dashboard/v1";

const makeFetch = () =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ url, init }),
    } as Response;
  }) as unknown as typeof fetch;

describe("api client adapter", () => {
  it("uses requestJson with generated paths", async () => {
    const fetchImpl = makeFetch();
    const fakeClients: ClientFactories = {
      createConsumerServiceClient: (handler: RequestHandler) =>
        ({
          ListConsumers: () =>
            handler(
              { path: "v1/dashboard/consumers", method: "GET", body: null },
              { service: "ConsumerService", method: "ListConsumers" },
            ),
        }) as unknown as ConsumerService,
      createAuthServiceClient: (_handler: RequestHandler) =>
        ({}) as AuthService,
      createSubscriptionServiceClient: (_handler: RequestHandler) =>
        ({}) as SubscriptionService,
      createUsageServiceClient: (_handler: RequestHandler) =>
        ({}) as UsageService,
      createModelServiceClient: (handler: RequestHandler) =>
        ({
          ListModels: () =>
            handler(
              { path: "v1/dashboard/models", method: "GET", body: null },
              { service: "ModelService", method: "ListModels" },
            ),
        }) as unknown as ModelService,
    };
    const { consumerService, modelService } = createApiClients({
      fetchImpl,
      clients: fakeClients,
    });
    const res = await consumerService.ListConsumers({
      pageSize: 0,
      pageToken: "",
    });
    const payload = res as unknown as { url: string; init: RequestInit };
    expect(payload.url).toContain("/v1/dashboard/consumers");
    expect(payload.init.method).toBe("GET");
    const modelsRes = await modelService.ListModels({
      pageSize: 0,
      pageToken: "",
      filter: "",
    });
    const modelsPayload = modelsRes as unknown as {
      url: string;
      init: RequestInit;
    };
    expect(modelsPayload.url).toContain("/v1/dashboard/models");
  });

  it("loads generated clients by default", async () => {
    const fetchImpl = makeFetch();
    const { consumerService } = createApiClients({ fetchImpl });
    const res = await consumerService.ListConsumers({
      pageSize: 0,
      pageToken: "",
    });
    const payload = res as unknown as { url: string; init: RequestInit };
    expect(payload.url).toContain("/v1/dashboard/consumers");
    expect(payload.init.method).toBe("GET");
  });

  it("exposes usage service", () => {
    const clients = createApiClients({});
    expect("usageService" in clients).toBe(true);
  });
});
