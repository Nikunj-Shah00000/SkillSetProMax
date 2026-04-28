import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { config } from "./config.js";
import apiRouter from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (config.nodeEnv !== "test") {
  app.use(
    pinoHttp({
      redact: ["req.headers.authorization", "req.headers.cookie"],
    })
  );
}

app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
