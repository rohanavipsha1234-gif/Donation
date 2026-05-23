import express from "express";
import cors from "cors";
import robloxRouter from "./routes/roblox";
import healthRouter from "./routes/health";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", healthRouter);
app.use("/api", robloxRouter);

export default app;
