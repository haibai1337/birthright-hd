import data from './synthetic-world.json';
import { validateScenario } from '../../packages/core/validation';
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
