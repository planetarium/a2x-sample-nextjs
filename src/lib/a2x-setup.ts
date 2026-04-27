import "server-only";
import {
  A2XAgent,
  AgentExecutor,
  DefaultRequestHandler,
  InMemoryRunner,
  InMemoryTaskStore,
  LlmAgent,
  OAuth2DeviceCodeAuthorization,
  StreamingMode,
  type AuthResult,
} from "@a2x/sdk";
import { AnthropicProvider } from "@a2x/sdk/anthropic";
import { verifyDeviceToken } from "@/lib/device-token";

const GLOBAL_KEY = Symbol.for("a2x-sample.a2x-setup");

type Cache = {
  a2xAgent: A2XAgent;
  handler: DefaultRequestHandler;
};

type Globals = Record<symbol, Cache | undefined>;

function buildBaseUrl(): string {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.BASE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function createSetup(): Cache {
  const baseUrl = buildBaseUrl();

  const agent = new LlmAgent({
    name: "a2x-sample",
    description:
      "A minimal A2A agent backed by Anthropic Claude, exposed via the a2x-sample-nextjs demo.",
    provider: new AnthropicProvider({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    }),
    instruction:
      "You are the a2x-sample agent. Respond clearly and concisely. Prefer plain-text answers unless the user requests otherwise.",
  });

  const runner = new InMemoryRunner({ agent, appName: agent.name });
  const executor = new AgentExecutor({
    runner,
    runConfig: { streamingMode: StreamingMode.SSE },
  });
  const taskStore = new InMemoryTaskStore();

  const deviceCodeScheme = new OAuth2DeviceCodeAuthorization({
    deviceAuthorizationUrl: `${baseUrl}/oauth/device/code`,
    tokenUrl: `${baseUrl}/oauth/token`,
    scopes: {
      "agent:invoke": "Invoke the a2x-sample agent on your behalf.",
    },
    description: "RFC 8628 OAuth 2.0 Device Authorization Grant.",
    tokenValidator: async (token, requiredScopes): Promise<AuthResult> => {
      try {
        const verified = await verifyDeviceToken(token);
        const missing = requiredScopes.filter(
          (s) => !verified.scopes.includes(s),
        );
        if (missing.length > 0) {
          return {
            authenticated: false,
            error: `Missing required scope(s): ${missing.join(", ")}`,
          };
        }
        return {
          authenticated: true,
          principal: {
            sub: verified.sub,
            email: verified.email,
            client_id: verified.clientId,
          },
          scopes: verified.scopes,
        };
      } catch (err) {
        return {
          authenticated: false,
          error:
            err instanceof Error ? err.message : "Invalid or expired token",
        };
      }
    },
  });

  const a2xAgent = new A2XAgent({
    taskStore,
    executor,
    protocolVersion: "0.3",
  })
    .setName("a2x-sample")
    .setDescription(
      "A minimal A2A agent backed by Anthropic Claude — powered by @a2x/sdk on Next.js 16.",
    )
    .setVersion("0.1.0")
    .setDefaultUrl(`${baseUrl}/a2a`)
    .setDocumentationUrl("https://github.com/planetarium/a2x-sample-nextjs")
    .addSkill({
      id: "chat",
      name: "General Chat",
      description: "General-purpose conversation and Q&A.",
      tags: ["chat", "general"],
    })
    .addSecurityScheme("deviceCode", deviceCodeScheme)
    .addSecurityRequirement({ deviceCode: ["agent:invoke"] });

  const handler = new DefaultRequestHandler(a2xAgent);

  return { a2xAgent, handler };
}

function getOrCreate(): Cache {
  const g = globalThis as Globals;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createSetup();
  }
  return g[GLOBAL_KEY]!;
}

export const { a2xAgent, handler } = getOrCreate();
