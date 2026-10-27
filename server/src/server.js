import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import weather from "./routes/weather.js";
import saved from "./routes/saved.js";
import { notFound, errorHandler } from "./middleware/error.js";
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.clientUrls.includes('*') || env.clientUrls.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api", weather);
app.use("/api", saved);
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (error) => {
    if (error) next();
  });
});
app.use(notFound);
app.use(errorHandler);
connectDb().catch((e) =>
  console.error("MongoDB connection failed:", e.message),
);
app.listen(env.port, () => console.log(`SkyCast API listening on ${env.port}`));
