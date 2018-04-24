import { expect } from "chai";
import { getSubprojectList } from "./list";
import { MultichainClient } from "../multichain/Client.h";
import { AuthenticatedRequest } from "../httpd/lib";

describe("subproject.list", () => {
  it("works", async () => {
    const multichain: any = {
      getValues: (streamName, key, nValues) => {
        expect(streamName).to.eql("the-sample-project");
        expect(key).to.eql("subprojects");
        const subprojects = [
          {
            data: {
              id: "one",
              displayName: "subproject one",
              status: "open",
              amount: "1",
              currency: "EUR",
              description: ""
            },
            permissions: {
              "subproject.viewSummary": ["alice"],
              "subproject.viewDetails": ["alice"],
              "subproject.close": ["alice"]
            },
            log: []
          },
          {
            data: {
              id: "two",
              displayName: "subproject two",
              status: "open",
              amount: "2",
              currency: "USD",
              description: ""
            },
            permissions: {
              "subproject.viewSummary": ["alice"],
              "subproject.viewDetails": [],
              "subproject.close": []
            },
            log: []
          }
        ];
        return subprojects;
      }
    };

    const req = {
      query: {
        projectId: "the-sample-project"
      },
      token: {
        userId: "alice"
      }
    };

    const [status, response] = await getSubprojectList(
      multichain as MultichainClient,
      req as AuthenticatedRequest
    );
    expect(status).to.eql(200);
    expect(response).to.eql({
      apiVersion: "1.0",
      data: [
        {
          id: "one",
          displayName: "subproject one",
          status: "open",
          amount: "1",
          currency: "EUR",
          description: "",
          allowedIntents: ["subproject.viewSummary", "subproject.viewDetails", "subproject.close"]
        },
        {
          id: "two",
          displayName: "subproject two",
          status: "open",
          amount: "2",
          currency: "USD",
          description: "",
          allowedIntents: ["subproject.viewSummary"]
        }
      ]
    });
  });

  it("throws stream-not-found error if the project does not exist", done => {
    const multichain: any = {
      getValues: (streamName, key, nValues) => {
        expect(streamName).to.eql("the-sample-project");
        expect(key).to.eql("subprojects");
        throw { code: -708, message: "asdf" };
      }
    };

    const req = {
      query: {
        projectId: "the-sample-project"
      },
      token: {
        userId: "alice"
      }
    };

    getSubprojectList(multichain as MultichainClient, req as AuthenticatedRequest)
      .then(response => {
        throw Error(`Expected no response, got: ${JSON.stringify(response)}`);
      })
      .catch(err => {
        if (err.code === -708) {
          done();
        } else {
          throw err;
        }
      });
  });
});
