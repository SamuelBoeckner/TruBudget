import Intent from "../authz/intents";
import { AuthToken } from "../authz/token";

export type ProjectReader = (token: AuthToken, id: string) => Promise<Project>;

export type AllProjectsReader = (token: AuthToken) => Promise<Project[]>;

export type ProjectAssigner = (
  token: AuthToken,
  projectId: string,
  assignee: string,
) => Promise<void>;

interface HistoricEvent {
  key: string; // the resource ID (same for all events that relate to the same resource)
  intent: Intent;
  createdBy: string;
  createdAt: string;
  dataVersion: number; // integer
  data: any;
  snapshot: {
    displayName: string;
  };
}

export interface Project {
  log: HistoricEvent[];
  allowedIntents: Intent[];
  data: {
    id: string;
    creationUnixTs: string;
    status: "open" | "closed";
    displayName: string;
    assignee?: string;
    description: string;
    amount: string;
    currency: string;
    thumbnail: string;
  };
}