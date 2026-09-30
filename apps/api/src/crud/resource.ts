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
  /** Called after a successful create, update, or delete. */
  afterWrite?: (id: string | number | bigint) => void
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
