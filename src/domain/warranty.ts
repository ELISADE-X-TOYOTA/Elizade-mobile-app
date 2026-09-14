/**
 * Which garage vehicle a warranty claim is filed against.
 *
 * Pure, so it can be tested without a screen — and it needs testing, because
 * the previous answer was a constant: the claim sheet was handed
 * `OWNED_VEHICLES[0].id` from the mock data, which is `'ov1'`. Every claim
 * filed from a real phone went to the API with that id and came back "That
 * identifier is not valid." The certificate card above the button was real;
 * the button beneath it never was.
 */

import type { OwnedVehicle, WarrantyCertificate } from './types';

/**
 * The vehicle to preselect when the claim sheet opens.
 *
 * A car with a LIVE certificate first: that is the one a claim can succeed
 * on, and with two cars in the garage it is almost always the one the
 * customer means. Otherwise the first vehicle. `-1` when the garage is empty,
 * so the sheet can say so rather than file against nothing.
 */
export function preferredClaimVehicleIndex(
  vehicles: Pick<OwnedVehicle, 'id'>[],
  certificates: Pick<WarrantyCertificate, 'vehicleId' | 'status'>[],
): number {
  if (vehicles.length === 0) return -1;
  const covered = new Set(
    certificates.filter((c) => c.status === 'active' || c.status === 'extended').map((c) => c.vehicleId),
  );
  const index = vehicles.findIndex((v) => covered.has(v.id));
  return index === -1 ? 0 : index;
}
