// import { spawn, Thread, Worker } from "threads";
import { Worker } from "node:worker_threads";
import { join } from "node:path/posix";
import {
  validateGeneratedTypes,
  type ValidateGeneratedTypesProps,
} from "../core/validateGeneratedTypes.js";

/**
 * Validate generated types in a worker.
 *
 * The validation is spawning a full typescript environment and this is blocking the event-loop.
 *
 * @param props
 * @returns List of errors
 */
export async function validateGeneratedTypesInWorker(
  props: ValidateGeneratedTypesProps
): Promise<ReturnType<typeof validateGeneratedTypes>> {
  return new Promise((resolve, reject) => {
    const validatorWorker = new Worker(
      join(import.meta.dirname, "./validator.worker.js"),
      {
        workerData: props,
      }
    );

    validatorWorker.on("message", resolve);
    validatorWorker.on("error", reject);
    validatorWorker.on("exit", (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}
