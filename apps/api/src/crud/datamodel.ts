/** Shape written by `prisma/generators/admin-meta.mjs`. */
export interface DatamodelField {
  name: string
  kind: 'scalar' | 'enum' | 'object' | 'unsupported'
  type: string
  nativeType: string | null
  isList: boolean
  isRequired: boolean
  isId: boolean
  isUnique: boolean
  isReadOnly: boolean
  isUpdatedAt: boolean
  hasDefaultValue: boolean
  relationName: string | null
  relationFromFields: string[]
  relationToFields: string[]
}

export interface DatamodelModel {
  name: string
  dbName: string | null
  fields: DatamodelField[]
}

export interface Datamodel {
  models: DatamodelModel[]
  enums: Record<string, string[]>
}
