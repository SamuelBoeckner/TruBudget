import { throwIfUnauthorized } from "../../authz";
import Intent from "../../authz/intents";
import { AuthToken } from "../../authz/token";
import { AllowedUserGroupsByIntent } from "../../authz/types";
import { SubprojectIdAlreadyExistsError } from "../../error";
import {
  AuthenticatedRequest,
  HttpResponse,
  throwParseError,
  throwParseErrorIfUndefined,
} from "../../httpd/lib";
import { isEmpty } from "../../lib/emptyChecks";
import logger from "../../lib/logger";
import { isNonemptyString, isUserOrUndefined, value, isDate, isNumber } from "../../lib/validation";
import { MultichainClient } from "../../multichain/Client.h";
import { randomString } from "../../multichain/hash";
import * as Subproject from "../../subproject/model/Subproject";
import * as Project from "../model/Project";

export async function createSubproject(multichain: MultichainClient, req): Promise<HttpResponse> {
  const body = req.body;

  if (body.apiVersion !== "1.0") {
    logger.error({ error: { apiVersion: body.apiVersion } }, "Unexpected API version");
    throwParseError(["apiVersion"]);
  }
  throwParseErrorIfUndefined(body, ["data"]);
  const data = body.data;

  const projectId: string = value("projectId", data.projectId, isNonemptyString);

  const userIntent: Intent = "project.createSubproject";

  // Is the user allowed to create subprojects?
  await throwIfUnauthorized(
    req.user,
    userIntent,
    await Project.getPermissions(multichain, projectId),
  );

  // Make sure the parent project is not already closed:
  if (await Project.isClosed(multichain, projectId)) {
    const message = "Cannot add a subproject to a closed project.";
    logger.error({ error: { multichain, projectId } }, message);
    throw {
      kind: "PreconditionError",
      message,
    };
  }

  throwParseErrorIfUndefined(data, ["subproject"]);
  const subprojectArgs = data.subproject;

  const subprojectId = value("id", subprojectArgs.id, isNonemptyString, randomString());

  // check if subprojectId already exists
  const subprojects = await Subproject.get(multichain, req.user, projectId);
  if (!isEmpty(subprojects.filter(s => s.data.id === subprojectId))) {
    logger.error({ error: { subprojectId } }, `Subproject ID ${subprojectId} already exists`);
    throw { kind: "SubprojectIdAlreadyExists", subprojectId } as SubprojectIdAlreadyExistsError;
  }

  const ctime = new Date();
  const defaultBillingDate = new Date(ctime);
  defaultBillingDate.setUTCHours(0);
  defaultBillingDate.setUTCMinutes(0);
  defaultBillingDate.setUTCSeconds(0);
  defaultBillingDate.setUTCMilliseconds(0);

  const subproject: Subproject.Data = {
    id: subprojectId,
    creationUnixTs: ctime.getTime().toString(),
    exchangeRate: value(
      "exchangeRate",
      subprojectArgs.exchangeRate,
      x => isNonemptyString(x) && isNumber(x),
      "1.0",
    ),

    billingDate: value(
      "billingDate",
      subprojectArgs.billingDate,
      x => isNonemptyString(x) && isDate(x),
      defaultBillingDate.toISOString(),
    ),

    status: value("status", subprojectArgs.status, x => ["open", "closed"].includes(x), "open"),
    displayName: value("displayName", subprojectArgs.displayName, isNonemptyString),
    description: value("description", subprojectArgs.description, isNonemptyString),
    amount: value("amount", subprojectArgs.amount, isNonemptyString),
    currency: value("currency", subprojectArgs.currency, isNonemptyString).toUpperCase(),
    assignee: value("assignee", subprojectArgs.assignee, isUserOrUndefined, req.user.userId),
  };

  const event = {
    intent: userIntent,
    createdBy: req.user.userId,
    creationTimestamp: ctime,
    dataVersion: 1,
    data: {
      subproject,
      permissions: getSubprojectDefaultPermissions(req.user),
    },
  };

  await Subproject.publish(multichain, projectId, subprojectId, event);

  return [
    201,
    {
      apiVersion: "1.0",
      data: { created: true },
    },
  ];
}

function getSubprojectDefaultPermissions(token: AuthToken): AllowedUserGroupsByIntent {
  if (token.userId === "root") return {};

  const intents: Intent[] = [
    "subproject.intent.listPermissions",
    "subproject.intent.grantPermission",
    "subproject.intent.revokePermission",
    "subproject.viewSummary",
    "subproject.viewDetails",
    "subproject.assign",
    "subproject.update",
    "subproject.close",
    "subproject.archive",
    "subproject.createWorkflowitem",
    "subproject.reorderWorkflowitems",
    "subproject.viewHistory",
  ];
  return intents.reduce((obj, intent) => ({ ...obj, [intent]: [token.userId] }), {});
}
