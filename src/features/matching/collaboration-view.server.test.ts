import { afterAll, describe, expect, it } from "vitest";

import { addEntry, addUser } from "../../../tests/helpers/fixture-data";
import {
  createTempDatabase,
  type ITempDatabase,
} from "../../../tests/helpers/temp-database";
import { findCollaborationView } from "./collaboration-view.server";

const temp = await createTempDatabase("matching_view");

describe.skipIf(!temp)("findCollaborationView", () => {
  const { db } = temp as ITempDatabase;
  afterAll(async () => {
    await temp?.drop();
  });

  it("names the entry and tells only its owner apart", async () => {
    const owner = await addUser(db, "owner");
    const other = await addUser(db, "other");
    const row = await addEntry(db, "Film Hub", {}, { ownerUserId: owner.id });
    expect(await findCollaborationView(db, row.id, owner.id)).toMatchObject({
      entryName: "Film Hub",
      viewerOwns: true,
    });
    expect((await findCollaborationView(db, row.id, other.id)).viewerOwns).toBe(
      false,
    );
    expect((await findCollaborationView(db, row.id, null)).viewerOwns).toBe(
      false,
    );
  });
});
