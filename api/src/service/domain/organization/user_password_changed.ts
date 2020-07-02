import Joi = require("joi");
import { VError } from "verror";

import * as Result from "../../../result";
import * as UserRecord from "../organization/user_record";
import { Identity } from "./identity";

type eventTypeType = "user_password_changed";
const eventType: eventTypeType = "user_password_changed";

interface InitialData {
  id: UserRecord.Id;
  passwordHash: string;
}

const initialDataSchema = Joi.object({
  id: UserRecord.idSchema.required(),
  passwordHash: Joi.string().required(),
});

export interface Event {
  type: eventTypeType;
  source: string;
  time: string; // ISO timestamp
  publisher: Identity;
  user: InitialData;
}

export const schema = Joi.object({
  type: Joi.valid(eventType).required(),
  source: Joi.string().allow("").required(),
  time: Joi.date().iso().required(),
  publisher: Joi.string().required(),
  user: initialDataSchema.required(),
});

export function createEvent(
  source: string,
  publisher: Identity,
  user: InitialData,
  time: string = new Date().toISOString(),
): Event {
  const event = {
    type: eventType,
    source,
    publisher,
    time,
    user,
  };
  const validationResult = validate(event);
  if (Result.isErr(validationResult)) {
    throw new VError(validationResult, `not a valid ${eventType} event`);
  }
  return event;
}

export function validate(input: any): Result.Type<Event> {
  const { error, value } = Joi.validate(input, schema);
  return !error ? value : error;
}

/**
 * Applies the event to the given user, or returns an error.
 *
 * When an error is returned (or thrown), any already applied modifications are
 * discarded.
 *
 * This function is not expected to validate its changes; instead, the modified user
 * is automatically validated when obtained using
 * `user_eventsourcing.ts`:`newUserFromEvent`.
 */
export function mutate(user: UserRecord.UserRecord, event: Event): Result.Type<void> {
  if (event.type !== "user_password_changed") {
    throw new VError(`illegal event type: ${event.type}`);
  }

  user.passwordHash = event.user.passwordHash;
}
