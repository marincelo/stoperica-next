/** JSON.stringify that also handles BigInt (Prisma returns BigInt for `bigint` columns). */
export function stringify(payload: unknown): string {
  return JSON.stringify(payload, (_key, value) => {
    if (typeof value === 'bigint') {
      return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(value)
        : value.toString()
    }
    return value
  })
}
