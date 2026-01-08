import type {
  AuthService,
  ConsumerService,
  ModelService,
  SubscriptionService,
  UsageService,
} from "../../generated/router/dashboard/v1";
import {
  createAuthServiceClient,
  createConsumerServiceClient,
  createModelServiceClient,
  createSubscriptionServiceClient,
  createUsageServiceClient,
} from "../../generated/router/dashboard/v1";
import { requestJson } from "../http/request";

export type RequestType = {
  path: string;
  method: string;
  body: string | null;
};

export type RequestHandler = (
  request: RequestType,
  meta: { service: string; method: string },
) => Promise<unknown>;

export type ClientFactories = {
  createConsumerServiceClient: (handler: RequestHandler) => ConsumerService;
  createAuthServiceClient: (handler: RequestHandler) => AuthService;
  createSubscriptionServiceClient: (
    handler: RequestHandler,
  ) => SubscriptionService;
  createUsageServiceClient: (handler: RequestHandler) => UsageService;
  createModelServiceClient: (handler: RequestHandler) => ModelService;
};

export type ApiClients = {
  authService: AuthService;
  consumerService: ConsumerService;
  modelService: ModelService;
  subscriptionService: SubscriptionService;
  usageService: UsageService;
};

export const createApiClients = ({
  fetchImpl,
  clients,
  includeAuth = true,
}: {
  fetchImpl?: typeof fetch;
  clients?: ClientFactories;
  includeAuth?: boolean;
}): ApiClients => {
  const factories =
    clients ??
    ({
      createConsumerServiceClient,
      createAuthServiceClient,
      createSubscriptionServiceClient,
      createUsageServiceClient,
      createModelServiceClient,
    } satisfies ClientFactories);

  const handler: RequestHandler = async ({ path, method, body }) => {
    return requestJson({
      path,
      method,
      body: body ? JSON.parse(body) : undefined,
      fetchImpl,
      includeAuth,
    });
  };

  return {
    authService: factories.createAuthServiceClient(handler),
    consumerService: factories.createConsumerServiceClient(handler),
    modelService: factories.createModelServiceClient(handler),
    subscriptionService: factories.createSubscriptionServiceClient(handler),
    usageService: factories.createUsageServiceClient(handler),
  };
};
