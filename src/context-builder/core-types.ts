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
	modifiers: ['abstract', 'interface'],
	typeParameters: ['E'],
	package: 'dart:core',
})
const stringType = defineType({
	name: 'String',
	description: 'A sequence of UTF-16 code units.',
	members: {
		length: {
			type: 'int',
			description: 'The number of code units in the string.'
		},
		isEmpty: {
			type: 'bool',
			description: 'Whether the string is empty.'
		},
		isNotEmpty: {
			type: 'bool',
			description: 'Whether the string is not empty.'
		}
	},
	package: 'dart:core',
	modifiers: ['abstract', 'final'],
	implementsTypes: ['Comparable<String>', 'Pattern']
})

export default [
	listType,
	stringType
]