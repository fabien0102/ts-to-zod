import { expose } from "threads";
import { validateGeneratedTypes } from "../core/validateGeneratedTypes";

/**
 * Expose validateGeneratedTypes as a worker
 */
expose(validateGeneratedTypes);
