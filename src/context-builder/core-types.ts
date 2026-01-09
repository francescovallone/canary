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
			type: 'Iterable<T>',
			description: 'Returns a new lazy Iterable with the results of applying the given function to each element.',
			typeParameters: ['T'],
			returnType: 'Iterable<T>',
			parameters: [
				{
					name: 'toElement',
					kind: 'positional',
					type: 'T Function(E)',
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