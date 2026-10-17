import data from './covenant-marches.json';
import { validateScenario } from '../core/validation';
export const developmentScenario = validateScenario({
  ...data,
  policy: {
    directedBorders: false,
    survival: 'territory',
    maxFort: 5,
    holdingCapacity: 'strict',
    conquest: 'transfer',
  },
});
