import express from "express";
import { handler as astroHandler } from "./dist/server/entry.mjs";

const app = express();
const PORT = 3000;

app.use(astroHandler);
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
