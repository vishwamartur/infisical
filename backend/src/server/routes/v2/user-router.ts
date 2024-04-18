import { z } from "zod";

import { AuthTokenSessionsSchema, OrganizationsSchema, UserEncryptionKeysSchema, UsersSchema } from "@app/db/schemas";
import { ApiKeysSchema } from "@app/db/schemas/api-keys";
import { readLimit, writeLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { AuthMethod, AuthMode } from "@app/services/auth/auth-type";

export const registerUserRouter = async (server: FastifyZodProvider) => {
  server.route({
    method: "PATCH",
    url: "/me/mfa",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      body: z.object({
        isMfaEnabled: z.boolean()
      }),
      response: {
        200: z.object({
          user: UsersSchema
        })
      }
    },
    preHandler: verifyAuth([AuthMode.JWT, AuthMode.API_KEY]),
    handler: async (req) => {
      const user = await server.services.user.toggleUserMfa(req.permission.id, req.body.isMfaEnabled);
      return { user };
    }
  });

  server.route({
    method: "PATCH",
    url: "/me/name",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      body: z.object({
        firstName: z.string().trim(),
        lastName: z.string().trim()
      }),
      response: {
        200: z.object({
          user: UsersSchema
        })
      }
    },
    preHandler: verifyAuth([AuthMode.JWT, AuthMode.API_KEY]),
    handler: async (req) => {
      const user = await server.services.user.updateUserName(req.permission.id, req.body.firstName, req.body.lastName);
      return { user };
    }
  });

  server.route({
    method: "PUT",
    url: "/me/auth-methods",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      body: z.object({
        authMethods: z.nativeEnum(AuthMethod).array().min(1)
      }),
      response: {
        200: z.object({
          user: UsersSchema
        })
      }
    },
    preHandler: verifyAuth([AuthMode.JWT, AuthMode.API_KEY], { requireOrg: false }),
    handler: async (req) => {
      const user = await server.services.user.updateAuthMethods(req.permission.id, req.body.authMethods);
      return { user };
    }
  });

  server.route({
    method: "GET",
    url: "/me/organizations",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: "Return organizations that current user is part of",
      response: {
        200: z.object({
          organizations: OrganizationsSchema.array()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.API_KEY]),
    handler: async (req) => {
      const organizations = await server.services.org.findAllOrganizationOfUser(req.permission.id);
      return { organizations };
    }
  });

  server.route({
    method: "GET",
    url: "/me/api-keys",
    config: {
      rateLimit: readLimit
    },
    schema: {
      response: {
        200: ApiKeysSchema.omit({ secretHash: true }).array()
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      const apiKeys = await server.services.apiKey.getMyApiKeys(req.permission.id);
      return apiKeys;
    }
  });

  server.route({
    method: "POST",
    url: "/me/api-keys",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      body: z.object({
        name: z.string().trim(),
        expiresIn: z.number()
      }),
      response: {
        200: z.object({
          apiKey: z.string(),
          apiKeyData: ApiKeysSchema.omit({ secretHash: true })
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      const apiKeys = await server.services.apiKey.createApiKey(req.permission.id, req.body.name, req.body.expiresIn);
      return apiKeys;
    }
  });

  server.route({
    method: "DELETE",
    url: "/me/api-keys/:apiKeyDataId",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      params: z.object({
        apiKeyDataId: z.string().trim()
      }),
      response: {
        200: z.object({
          apiKeyData: ApiKeysSchema.omit({ secretHash: true })
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      const apiKeyData = await server.services.apiKey.deleteApiKey(req.permission.id, req.params.apiKeyDataId);
      return { apiKeyData };
    }
  });

  server.route({
    method: "GET",
    url: "/me/sessions",
    config: {
      rateLimit: readLimit
    },
    schema: {
      response: {
        200: AuthTokenSessionsSchema.array()
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      const sessions = await server.services.authToken.getTokenSessionByUser(req.permission.id);
      return sessions;
    }
  });

  server.route({
    method: "DELETE",
    url: "/me/sessions",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      response: {
        200: z.object({
          message: z.string()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      await server.services.authToken.revokeAllMySessions(req.permission.id);
      return {
        message: "Successfully revoked all sessions"
      };
    }
  });

  server.route({
    method: "GET",
    url: "/me",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: "Retrieve the current user on the request",
      response: {
        200: z.object({
          user: UsersSchema.merge(UserEncryptionKeysSchema.omit({ verifier: true }))
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.API_KEY]),
    handler: async (req) => {
      const user = await server.services.user.getMe(req.permission.id);
      return { user };
    }
  });

  server.route({
    method: "DELETE",
    url: "/me",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      response: {
        200: z.object({
          user: UsersSchema
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT]),
    handler: async (req) => {
      const user = await server.services.user.deleteMe(req.permission.id);
      return { user };
    }
  });
};
