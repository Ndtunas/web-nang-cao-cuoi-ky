/**
 * Backward-compat shim.
 *
 * Existing code does `import { api } from './api.js'`. To avoid touching
 * every call site, this file re-exports the aggregated `api` object
 * (and individual services) from the new `services/` module.
 *
 * New code should prefer:
 *   import { projectsService } from './services/projects.service.js';
 *   import { api } from './services/index.js';
 */
export { api } from './services/index.js';
export {
  authService,
  employeesService,
  timesheetsService,
  approvalsService,
  auditLogsService,
  payrollService,
  configsService,
  projectsService,
} from './services/index.js';
