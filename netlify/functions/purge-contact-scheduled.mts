import type { Config } from "@netlify/functions";

import { purgeContactData } from "../../src/features/contact/purge-contact.server";

export default async () => {
  console.info("purge-contact-scheduled", await purgeContactData());
};

export const config: Config = { schedule: "17 3 * * *" };
