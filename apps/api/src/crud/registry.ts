import type { FieldMeta, ModelMeta } from '@stoperica/shared'
import { datamodel } from '../generated/admin-meta.js'
import type { DatamodelField, DatamodelModel } from './datamodel.js'
import type { ResourceDefinition, ResourceEntry } from './resource.js'

export interface Resource {
  definition: ResourceDefinition
  model: DatamodelModel
  meta: ModelMeta
  /** Prisma client delegate key, e.g. `raceResult`. */
  delegateKey: string
  hidden: Set<string>
  /** Belongs-to relations to other exposed resources, used to include display labels. */
  labelIncludes: Record<string, { select: Record<string, true> }>
}

const DISPLAY_FIELD_CANDIDATES = ['name', 'title', 'label', 'email', 'code', 'slug', 'value']
const UNSEARCHABLE_NATIVE_TYPES = new Set(['Inet', 'Uuid', 'Cidr', 'MacAddr'])
const AUTO_TIMESTAMP_FIELDS = new Set(['createdAt'])

const kebab = (value: string) => value.replace(/_/g, '-').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1)

export function isAutoTimestamp(field: DatamodelField): boolean {
  return field.isUpdatedAt || (AUTO_TIMESTAMP_FIELDS.has(field.name) && field.type === 'DateTime')
}

export class ResourceRegistry {
  readonly byResource = new Map<string, Resource>()
  readonly byModel = new Map<string, Resource>()

  constructor(entries: ResourceEntry[]) {
    const definitions = entries.map((entry) => (typeof entry === 'string' ? { model: entry } : entry))

    // First pass: resource names, so relations can point at each other.
    const resourceNames = new Map<string, string>()
    for (const definition of definitions) {
      const model = findModel(definition.model)
      resourceNames.set(model.name, kebab(model.dbName ?? model.name))
    }

    for (const definition of definitions) {
      const model = findModel(definition.model)
      const resource = buildResource(definition, model, resourceNames)
      if (this.byResource.has(resource.meta.resource)) {
        throw new Error(`Duplicate admin resource "${resource.meta.resource}"`)
      }
      this.byResource.set(resource.meta.resource, resource)
      this.byModel.set(model.name, resource)
    }

    for (const resource of this.byModel.values()) {
      for (const field of resource.meta.fields) {
        if (field.kind !== 'object' || field.isList || !field.relation?.resource) continue
        const target = this.byModel.get(field.relation.model)!
        resource.labelIncludes[field.name] = {
          select: Object.fromEntries(
            [target.meta.idField, ...target.meta.displayFields].map((name) => [name, true as const]),
          ),
        }
      }
    }

    for (const child of this.all) {
      for (const field of child.meta.fields) {
        const parentResource = field.foreignKeyFor?.resource
        if (!parentResource) continue
        const parent = this.byResource.get(parentResource)
        if (!parent) continue
        parent.meta.children.push({
          resource: child.meta.resource,
          label: child.meta.label,
          foreignKey: field.name,
        })
      }
    }
  }

  get all(): Resource[] {
    return [...this.byResource.values()]
  }
}

function linkedResource(resourceNames: Map<string, string>, model: string): string | null {
  return resourceNames.get(model) ?? null
}

function intEnumFor(definition: ResourceDefinition, field: string): string[] | null {
  const labels = (definition.intEnums as Record<string, readonly string[]> | undefined)?.[field]
  return labels ? [...labels] : null
}

function findModel(name: string): DatamodelModel {
  const model = datamodel.models.find((m) => m.name === name)
  if (!model) throw new Error(`Unknown Prisma model "${name}" in admin router`)
  return model
}

function buildResource(
  definition: ResourceDefinition,
  model: DatamodelModel,
  resourceNames: Map<string, string>,
): Resource {
  const hidden = new Set<string>(definition.hidden ?? [])
  for (const name of hidden) {
    if (!model.fields.some((f) => f.name === name)) {
      throw new Error(`Hidden field "${name}" does not exist on model ${model.name}`)
    }
  }

  const idFields = model.fields.filter((f) => f.isId)
  if (idFields.length !== 1) {
    throw new Error(`Model ${model.name} must have exactly one @id field to be exposed as CRUD`)
  }
  const idField = idFields[0]!

  const foreignKeys = new Map<string, { field: string; model: string }>()
  for (const field of model.fields) {
    if (field.kind !== 'object') continue
    for (const fk of field.relationFromFields) foreignKeys.set(fk, { field: field.name, model: field.type })
  }

  const fields: FieldMeta[] = model.fields
    .filter((f) => !hidden.has(f.name) && f.kind !== 'unsupported')
    .map((f) => {
      const fk = foreignKeys.get(f.name)
      return {
        name: f.name,
        kind: f.kind as FieldMeta['kind'],
        type: f.type,
        nativeType: f.nativeType,
        isList: f.isList,
        isRequired: f.isRequired,
        isId: f.isId,
        isUnique: f.isUnique,
        isReadOnly: f.kind === 'object' || f.isId || isAutoTimestamp(f),
        hasDefault: f.hasDefaultValue,
        isUpdatedAt: f.isUpdatedAt,
        intEnum: intEnumFor(definition, f.name),
        foreignKeyFor: fk ? { ...fk, resource: linkedResource(resourceNames, fk.model) } : null,
        relation:
          f.kind === 'object'
            ? {
                model: f.type,
                resource: linkedResource(resourceNames, f.type),
                fromFields: f.relationFromFields,
                toFields: f.relationToFields,
              }
            : null,
      }
    })

  const displayField =
    definition.displayField ??
    DISPLAY_FIELD_CANDIDATES.find((name) =>
      fields.some((f) => f.name === name && f.kind === 'scalar' && f.type === 'String'),
    ) ??
    idField.name

  const displayFields = [...(definition.displayFields ?? [displayField])]
  for (const name of displayFields) {
    if (!fields.some((f) => f.name === name && f.kind === 'scalar')) {
      throw new Error(`Display field "${name}" does not exist on model ${model.name}`)
    }
  }

  const searchFields = fields
    .filter(
      (f) =>
        f.kind === 'scalar' &&
        f.type === 'String' &&
        !f.isList &&
        !UNSEARCHABLE_NATIVE_TYPES.has(f.nativeType ?? ''),
    )
    .map((f) => f.name)

  const usedEnums = new Set(fields.filter((f) => f.kind === 'enum').map((f) => f.type))

  return {
    definition,
    model,
    delegateKey: lowerFirst(model.name),
    hidden,
    labelIncludes: {},
    meta: {
      name: model.name,
      resource: resourceNames.get(model.name)!,
      label: definition.label ?? model.name,
      idField: idField.name,
      displayField,
      displayFields,
      fields,
      enums: Object.fromEntries(
        Object.entries(datamodel.enums).filter(([name]) => usedEnums.has(name)),
      ),
      searchFields,
      children: [],
    },
  }
}
