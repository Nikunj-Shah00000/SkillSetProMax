import { config } from "./config.js";
import app from "./app.js";

app.listen(config.port, () => {
  console.log(`SkillSetProMax API running on http://localhost:${config.port}`);
  console.log(`  Environment : ${config.nodeEnv}`);
  console.log(`  CORS origin : ${config.corsOrigin}`);
  console.log(`  Health check: http://localhost:${config.port}/api/healthz`);
});
