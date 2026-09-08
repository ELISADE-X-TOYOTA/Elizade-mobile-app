/**
 * Minimum length of a warranty claim description.
 *
 * MIRRORS THE API: `ClaimCreateIn.description` is `Field(min_length=10)`. It
 * was enforced only there, so the rule existed but was never stated — a
 * customer wrote out their fault, attached photos, submitted, and got back
 * "String should have at least 10 characters", which is a Pydantic message
 * rather than something written for a person.
 *
 * Duplicating the number here is deliberate. The alternative is discovering
 * the rule from a rejection, and a limit the customer cannot see before they
 * hit it is not a validation, it is a trap. If the API ever changes it, the
 * form asks for the wrong length — which is visible and fixable, unlike
 * silence.
 */
export const MIN_CLAIM_DESCRIPTION = 10;
