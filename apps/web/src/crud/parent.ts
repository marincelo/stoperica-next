import type { ChildResource } from '@stoperica/shared'
import type { RouteLocationRaw } from 'vue-router'

/** Create/edit a child while staying in the parent record's context. */
export function childFormLocation(
  child: ChildResource,
  parentId: string,
  id?: string,
): RouteLocationRaw {
  const query = { [child.foreignKey]: parentId }
  return id
    ? { name: 'resource-edit', params: { resource: child.resource, id }, query }
    : { name: 'resource-new', params: { resource: child.resource }, query }
}

export function parentShowLocation(resource: string, id: string): RouteLocationRaw {
  return { name: 'resource-show', params: { resource, id } }
}
