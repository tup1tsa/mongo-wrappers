jest.mock("mongodb");
import { MongoClient } from "mongodb";
import { connect } from "../connect";
import { disconnect } from "../disconnect";
import { runQuery } from "../runQuery";

const uri = "db uri";
const dbName = "db name";
const db = {};
const clientInstance: MongoClient = new MongoClient(uri);
clientInstance.db = jest.fn().mockReturnValue(db);

it("should connect and return db and client instances", async done => {
  const connectMock = jest.fn().mockResolvedValue(clientInstance);
  MongoClient.connect = connectMock;
  const result = await connect(
    uri,
    dbName
  );
  expect(connectMock.mock.calls.length).toBe(1);
  expect(connectMock.mock.calls[0][0]).toBe(uri);
  expect(connectMock.mock.calls[0][1]).toEqual({ useNewUrlParser: true });
  expect(result.clientInstance).toEqual(clientInstance);
  expect(result.db).toEqual(db);
  done();
});

it("should disconnect", async done => {
  const closeMock = jest.fn();
  clientInstance.close = closeMock;
  await disconnect(clientInstance);
  expect(closeMock.mock.calls.length).toBe(1);
  done();
});

it("run query should catch connection, close and query errors", async done => {
  const errors = {
    connection: "connection error",
    close: "close error",
    query: "query error"
  };
  let connectMock = jest.fn().mockRejectedValueOnce(errors.connection);
  MongoClient.connect = connectMock;
  await expect(runQuery(uri, dbName, jest.fn())).rejects.toBe(
    errors.connection
  );

  const badQuery = jest.fn().mockRejectedValueOnce(errors.query);
  connectMock = jest.fn().mockResolvedValue(clientInstance);
  MongoClient.connect = connectMock;
  await expect(runQuery(uri, dbName, badQuery)).rejects.toBe(errors.query);

  clientInstance.close = jest.fn().mockRejectedValueOnce(errors.close);
  await expect(runQuery(uri, dbName, jest.fn())).rejects.toBe(errors.close);
  done();
});

it("run query should return query result", async done => {
  const queryResult = { insertedCount: 1 };
  const connectMock = jest.fn().mockResolvedValueOnce(clientInstance);
  const query = jest.fn().mockResolvedValueOnce(queryResult);
  MongoClient.connect = connectMock;
  const result = await runQuery(uri, dbName, query);
  expect(result).toBe(queryResult);
  expect(query.mock.calls[0][0]).toEqual(db);
  done();
});
