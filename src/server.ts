import * as dotenv from "dotenv";

dotenv.config({ quiet: true });
process.env.NODE_ENV ??= "dev";

import { app } from "./app";
import { puzzleService } from "./Services/PuzzleService";
import { prepareDatabase } from "./prisma/prepareDatabase";

const port = +(process.env.PORT ?? 15001);

prepareDatabase();

// Data upgrades that need code (not just SQL migrations)
puzzleService.upgradeLegacyIcons().then((upgraded) => {
  if (upgraded > 0) {
    console.log(`Upgraded the icon of ${upgraded} puzzle(s)`);
  }
});

app.listen(port, () => console.log(`Server is running on port ${port} on env ${process.env.NODE_ENV}!`));
