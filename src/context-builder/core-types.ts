import { defineType } from "../define-types";

export const listType = defineType({
	name: 'List',
	description: 'A collection of elements.',
	members: {
		length: {
			type: 'int',
			description: 'The number of elements in the list.'
		},
		isEmpty: {
			type: 'bool',
			description: 'Whether the list is empty.'
		},
		isNotEmpty: {
			type: 'bool',
			description: 'Whether the list is not empty.'
		},
		map: {
			type: 'Function',
			description: 'Returns a new list with the results of applying the given function to each element.',
			typeParameters: ['T'],
			parameters: [
				{
					name: 'toElement',
					kind: 'positional',
					type: 'List<T> Function(T toElement(E e)) toElement',
					description: 'The function to apply to each element.',
				}
			]
		}
	},
	typeParameters: ['E'],
	package: 'dart:core',
})

export default [
	listType
]