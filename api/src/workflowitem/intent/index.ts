import * as Workflowitem from "..";
import { throwIfUnauthorized } from "../../authz";
import { allIntents } from "../../authz/intents";
import { AuthenticatedRequest, HttpResponse } from "../../httpd/lib";
import { isNonemptyString, value } from "../../lib";
import { MultichainClient } from "../../multichain";

export const changeWorkflowitemPermission = async (
  multichain: MultichainClient,
  req: AuthenticatedRequest,
  userIntent: "workflowitem.intent.grantPermission" | "workflowitem.intent.revokePermission",
): Promise<HttpResponse> => {
  const input = value("data", req.body.data, x => x !== undefined);

  const projectId: string = value("projectId", input.projectId, isNonemptyString);
  const subprojectId: string = value("subprojectId", input.subprojectId, isNonemptyString);
  const workflowitemId: string = value("workflowitemId", input.workflowitemId, isNonemptyString);
  const userId: string = value("userId", input.userId, isNonemptyString);
  const intent = value("intent", input.intent, x => allIntents.includes(x));

  // Is the user allowed to grant/revoke workflowitem permissions?
  await throwIfUnauthorized(
    req.token,
    userIntent,
    await Workflowitem.getPermissions(multichain, projectId, workflowitemId),
  );

  await Workflowitem.publish(
    multichain,
    projectId,
    subprojectId,
    workflowitemId,
    userIntent,
    req.token.userId,
    new Date(),
    1,
    { userId, intent },
  );

  return [
    200,
    {
      apiVersion: "1.0",
      data: "OK",
    },
  ];
};
