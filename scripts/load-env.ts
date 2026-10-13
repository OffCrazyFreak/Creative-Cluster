import { config } from "dotenv";

// Scripts run outside Vite, so they load the same file Vite would.
config({ path: ".env.local", quiet: true });
