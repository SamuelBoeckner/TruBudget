import { FastifyInstance } from "fastify";
import Joi = require("joi");
import { VError } from "verror";

import { toHttpError } from "./http_errors";
import * as NotAuthenticated from "./http_errors/not_authenticated";
import { AuthenticatedRequest } from "./httpd/lib";
import { Ctx } from "./lib/ctx";
import * as Result from "./result";
import { ServiceUser } from "./service/domain/organization/service_user";
import * as UserDisable from "./service/domain/organization/user_disable";

interface RequestBodyV1 {
  apiVersion: "1.0";
  data: {
    userId: string;
  };
}

const requestBodyV1Schema = Joi.object({
  apiVersion: Joi.valid("1.0").required(),
  data: Joi.object({
    userId: Joi.string().required(),
  }).required(),
});

type RequestBody = RequestBodyV1;
const requestBodySchema = Joi.alternatives([requestBodyV1Schema]);

function validateRequestBody(body: any): Result.Type<RequestBody> {
  const { error, value } = Joi.validate(body, requestBodySchema);
  return !error ? value : error;
}

function mkSwaggerSchema(server: FastifyInstance) {
  return {
    beforeHandler: [(server as any).authenticate],
    schema: {
      description: "Disable an user account",
      tags: ["user"],
      summary: "Disable an user account",
      security: [
        {
          bearerToken: [],
        },
      ],
      body: {
        type: "object",
        required: ["apiVersion", "data"],
        properties: {
          apiVersion: { type: "string", example: "1.0" },
          data: {
            type: "object",
            required: ["userId"],
            properties: {
              userId: { type: "string", example: "aSmith" },
            },
          },
        },
      },
      response: {
        200: {
          description: "successful response",
          type: "object",
          properties: {
            apiVersion: { type: "string", example: "1.0" },
            data: {
              type: "object",
            },
          },
        },
        401: NotAuthenticated.schema,
      },
    },
  };
}

interface Service {
  disableUser(
    ctx: Ctx,
    serviceUser: ServiceUser,
    requestData: UserDisable.RequestData,
  ): Promise<void>;
}

export function addHttpHandler(server: FastifyInstance, urlPrefix: string, service: Service) {
  server.post(`${urlPrefix}/global.disableUser`, mkSwaggerSchema(server), (request, reply) => {
    const ctx: Ctx = { requestId: request.id, source: "http" };

    const serviceUser: ServiceUser = {
      id: (request as AuthenticatedRequest).user.userId,
      groups: (request as AuthenticatedRequest).user.groups,
    };

    const bodyResult = validateRequestBody(request.body);

    if (Result.isErr(bodyResult)) {
      const { code, body } = toHttpError(new VError(bodyResult, "failed to disable an user"));
      reply.status(code).send(body);
      return;
    }

    const data = bodyResult.data;
    const reqData = {
      userId: data.userId,
    };

    service
      .disableUser(ctx, serviceUser, reqData)
      .then(() => {
        const code = 200;
        const body = {
          apiVersion: "1.0",
          data: {},
        };
        reply.status(code).send(body);
      })
      .catch((err) => {
        const { code, body } = toHttpError(err);
        reply.status(code).send(body);
      });
  });
}
