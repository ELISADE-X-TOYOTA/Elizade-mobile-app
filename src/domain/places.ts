/**
 * The Ikeja centre is shown as Ogba until the remaining locations arrive.
 * Applied where branch names are rendered, so the current database does not
 * have to be rewritten first.
 */
export function asOgba(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/Ikeja/g, 'Ogba');
}
