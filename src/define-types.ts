export interface CustomType {
  name: string
  description?: string
  extends?: string
  members?: Record<string, string | { type: string; description?: string } | {type: string; description?: string; parameters: Parameter[]}>
  staticMembers?: Record<string, string | { type: string; description?: string } | {type: string; description?: string; parameters: Parameter[]}>
  constructors?: Constructor[]
}

export type Parameter = { type: string; description?: string, name: string }

export type Constructor = { description?: string; parameters: Parameter[], name?: string }

export interface CustomTypesConfig {
  types: CustomType[]
}

/**
 * Helper to define custom types with TypeScript support.
 * Use this to create an inline configuration for the transformer.
 * 
 * @example
 * ```ts
 * import { dartInspectTransformer, defineCustomTypes } from './dart-inspect'
 * 
 * const customTypes = defineCustomTypes({
 *   types: [
 *     {
 *       name: 'Provider',
 *       description: 'A dependency injection container.',
 *       members: {
 *         get: { type: 'T', description: 'Get an instance of type T.' },
 *       }
 *     }
 *   ]
 * })
 * 
 * // In VitePress config:
 * codeTransformers: [dartInspectTransformer({ customTypes })]
 * ```
 */
export function defineCustomTypes(config: CustomTypesConfig): CustomTypesConfig {
  return config
}

/**
 * Helper to define a single custom type with TypeScript support.
 * 
 * @example
 * ```ts
 * const providerType = defineType({
 *   name: 'Provider',
 *   description: 'A DI container.',
 *   members: { get: 'T' }
 * })
 * ```
 */
export function defineType(type: CustomType): CustomType {
  return type
}
