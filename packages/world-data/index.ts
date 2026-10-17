import data from './covenant-marches.json';
import { validateScenario } from '../core/validation';
export const developmentScenario = validateScenario(data);
