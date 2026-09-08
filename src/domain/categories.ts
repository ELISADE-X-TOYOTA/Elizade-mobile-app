import { CATEGORY_META, Vehicle, VehicleCategory } from './types';

/**
 * Which category chips are worth offering.
 *
 * THE BUG: the showroom offered all seven categories unconditionally, and the
 * app's `category` is not a real field — it is GUESSED in `src/api/mappers.ts`
 * by running a regex over make, model and fuel type. Elizade's catalogue is
 * Toyota passenger cars, so across all 30 vehicles in production the guess
 * produces only suv, sedan and pickup. Truck, Sports, Luxury and Electric
 * match nothing at all, and those are exactly the four QA tapped: every one
 * answered "No vehicles match your search".
 *
 * A filter that cannot return a result should not be on screen. Deriving the
 * chips from the vehicles actually loaded fixes it now and keeps working
 * later: if the catalogue gains an electric model, or the backend grows a real
 * category field, the chip appears on its own with nothing to change here.
 *
 * NOT a substitute for real categories. Sienna is a people carrier and Prius
 * is a hatchback; both are filed as "sedan" by the regex. Hiding empty chips
 * stops the dead ends — it does not make the surviving guesses correct.
 */
export function availableCategories(
  vehicles: Pick<Vehicle, 'category'>[],
  selected?: VehicleCategory | null,
): VehicleCategory[] {
  const present = new Set(vehicles.map((v) => v.category));
  const order = Object.keys(CATEGORY_META) as VehicleCategory[];

  return order.filter(
    (category) =>
      present.has(category) ||
      // The ACTIVE chip always stays, even once its own filter has emptied the
      // list it was derived from. Dropping it would leave the user filtered
      // into a category with no way to switch off — a worse dead end than the
      // one being fixed.
      (selected != null && category === selected),
  );
}
