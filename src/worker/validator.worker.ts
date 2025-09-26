import { parentPort, workerData } from "node:worker_threads";
import { validateGeneratedTypes } from "../core/validateGeneratedTypes.js";

// Expose validateGeneratedTypes in a worker
const result = validateGeneratedTypes(workerData);
parentPort?.postMessage(result);
