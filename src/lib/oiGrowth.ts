import {
  LMS_TABLES,
  AGE_MIN,
  AGE_MAX,
  INFANT_CHILD_BOUNDARY,
  type LmsRow,
  type Sex,
  type OiType,
  type Measure,
} from "./oiLmsData";

export type { Sex, OiType, Measure };
export { AGE_MIN, AGE_MAX };

export interface Lms {
  L: number;
  M: number;
  S: number;
}

function interpolate(table: LmsRow[], age: number): Lms {
  const first = table[0];
  const last = table[table.length - 1];
  if (age <= first.age) return { L: first.L, M: first.M, S: first.S };
  if (age >= last.age) return { L: last.L, M: last.M, S: last.S };
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return {
        L: a.L + t * (b.L - a.L),
        M: a.M + t * (b.M - a.M),
        S: a.S + t * (b.S - a.S),
      };
    }
  }
  return { L: last.L, M: last.M, S: last.S };
}

/** Returns the LMS triplet for a given OI type, sex, measure and age (years). */
export function getLms(oiType: OiType, sex: Sex, measure: Measure, age: number): Lms {
  const tables = LMS_TABLES[oiType][sex][measure];
  const table = age < INFANT_CHILD_BOUNDARY ? tables.infant : tables.child;
  return interpolate(table, age);
}

/** Box-Cox (LMS) Z-score: Z = ((X/M)^L - 1) / (L*S), or ln(X/M)/S when L≈0. */
export function calcZScore(value: number, lms: Lms): number {
  const { L, M, S } = lms;
  if (Math.abs(L) < 1e-4) {
    return Math.log(value / M) / S;
  }
  return (Math.pow(value / M, L) - 1) / (L * S);
}

/** Inverse of calcZScore: value at a given Z-score. */
export function zToValue(z: number, lms: Lms): number {
  const { L, M, S } = lms;
  if (Math.abs(L) < 1e-4) {
    return M * Math.exp(z * S);
  }
  return M * Math.pow(1 + L * S * z, 1 / L);
}

export function isAgeInRange(age: number): boolean {
  return age >= AGE_MIN && age <= AGE_MAX;
}
