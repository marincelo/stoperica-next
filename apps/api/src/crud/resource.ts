import type { Prisma } from '../generated/prisma/client.js'

export type ModelName = Prisma.ModelName

export type ScalarField<M extends ModelName> = Extract<
  keyof Prisma.TypeMap['model'][M]['payload']['scalars'],
  string
>

export interface ResourceOptions<M extends ModelName> {
  /** Label shown in the admin UI (defaults to the model name). */
  label?: string
  /** Fields never returned by the API and never accepted on write. */
  hidden?: ScalarField<M>[]
  /** Field used as the label when this model is shown in a relation select. */
  displayField?: ScalarField<M>
  /** Integer columns edited as a dropdown. The stored value is the label's index. */
  intEnums?: Partial<Record<ScalarField<M>, readonly string[]>>
  /**
   * Keep this model's foreign keys, and foreign keys pointing here, as plain ids.
   * Relation dropdowns are a later pass; League and Race stay linked.
   */
  plainForeignKeys?: boolean
  /** Called before an update or delete, while the row still has its previous values. */
  beforeWrite?: (id: string | number | bigint) => void | Promise<void>
  /** Called after a successful create, update, or delete. */
  afterWrite?: (id: string | number | bigint) => void | Promise<void>
}

export interface ResourceDefinition<M extends ModelName = ModelName> extends ResourceOptions<M> {
  model: M
}

export type ResourceEntry = ModelName | ResourceDefinition<any>

export function resource<M extends ModelName>(
  model: M,
  options: ResourceOptions<M> = {},
): ResourceDefinition<M> {
  return { model, ...options }
}
