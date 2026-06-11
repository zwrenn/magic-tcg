/** The four friends. Single source of truth — used by the seed and the profile picker. */
export const POD_MEMBERS = ["Zoe", "Halie", "Troy", "Mike"] as const;
export type PodMember = (typeof POD_MEMBERS)[number];

export function isPodMember(name: string): name is PodMember {
  return (POD_MEMBERS as readonly string[]).includes(name);
}
