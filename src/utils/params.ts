/** Express 5 types params as string | string[] — extract the scalar value safely */
export function param(val: string | string[]): string {
  return Array.isArray(val) ? val[0] : val;
}
