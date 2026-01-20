import { defineFunction, defineType } from "../define-types";

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
/// A sequence of UTF-16 code units.
///
/// Strings are mainly used to represent text. A character may be represented by
/// multiple code points, each code point consisting of one or two code
/// units. For example, the Papua New Guinea flag character requires four code
/// units to represent two code points, but should be treated like a single
/// character: "🇵🇬". Platforms that do not support the flag character may show
/// the letters "PG" instead. If the code points are swapped, it instead becomes
/// the Guadeloupe flag "🇬🇵" ("GP").
///
/// A string can be either single or multiline. Single line strings are
/// written using matching single or double quotes, and multiline strings are
/// written using triple quotes. The following are all valid Dart strings:
/// ```dart
/// 'Single quotes';
/// "Double quotes";
/// 'Double quotes in "single" quotes';
/// "Single quotes in 'double' quotes";
///
/// '''A
/// multiline
/// string''';
///
/// """
/// Another
/// multiline
/// string""";
/// ```
/// Strings are immutable. Although you cannot change a string, you can perform
/// an operation on a string which creates a new string:
/// ```dart
/// const string = 'Dart is fun';
/// print(string.substring(0, 4)); // 'Dart'
/// ```
/// You can use the plus (`+`) operator to concatenate strings:
/// ```dart
/// const string = 'Dart ' + 'is ' + 'fun!';
/// print(string); // 'Dart is fun!'
/// ```
/// Adjacent string literals are concatenated automatically:
/// ```dart
/// const string = 'Dart ' 'is ' 'fun!';
/// print(string); // 'Dart is fun!'
/// ```
/// You can use `${}` to interpolate the value of Dart expressions
/// within strings. The curly braces can be omitted when evaluating identifiers:
/// ```dart
/// const string = 'dartlang';
/// print('$string has ${string.length} letters'); // dartlang has 8 letters
/// ```
/// A string is represented by a sequence of Unicode UTF-16 code units
/// accessible through the [codeUnitAt] or the [codeUnits] members:
/// ```dart
/// const string = 'Dart';
/// final firstCodeUnit = string.codeUnitAt(0);
/// print(firstCodeUnit); // 68, aka U+0044, the code point for 'D'.
/// final allCodeUnits = string.codeUnits;
/// print(allCodeUnits); // [68, 97, 114, 116]
/// ```
/// A string representation of the individual code units is accessible through
/// the index operator:
/// ```dart
/// const string = 'Dart';
/// final charAtIndex = string[0];
/// print(charAtIndex); // 'D'
/// ```
/// The characters of a string are encoded in UTF-16. Decoding UTF-16, which
/// combines surrogate pairs, yields Unicode code points. Following a similar
/// terminology to Go, Dart uses the name 'rune' for an integer representing a
/// Unicode code point. Use the [runes] property to get the runes of a string:
/// ```dart
/// const string = 'Dart';
/// final runes = string.runes.toList();
/// print(runes); // [68, 97, 114, 116]
/// ```
/// For a character outside the Basic Multilingual Plane (plane 0) that is
/// composed of a surrogate pair, [runes] combines the pair and returns a
/// single integer. For example, the Unicode character for a
/// musical G-clef ('𝄞') with rune value 0x1D11E consists of a UTF-16 surrogate
/// pair: `0xD834` and `0xDD1E`. Using [codeUnits] returns the surrogate pair,
/// and using `runes` returns their combined value:
/// ```dart
/// const clef = '\u{1D11E}';
/// for (final item in clef.codeUnits) {
///   print(item.toRadixString(16));
///   // d834
///   // dd1e
/// }
/// for (final item in clef.runes) {
///   print(item.toRadixString(16)); // 1d11e
/// }
/// ```
/// The `String` class cannot be extended or implemented. Attempting to do so
/// yields a compile-time error.
const stringType = defineType({
	name: 'String',
	description: `A sequence of UTF-16 code units.`,
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
		},
		codeUnitAt: {
			type: 'int',
			description: 'Returns the code unit at the given index.',
			parameters: [
				{
					name: 'index',
					kind: 'positional',
					type: 'int',
					description: 'The index of the code unit to return.'
				}
			]
		}
	},
	package: 'dart:core',
	modifiers: ['abstract', 'final'],
	implementsTypes: ['Comparable<String>', 'Pattern']
})

const intType = defineType({
	name: 'int',
	description: `An integer number.

The default implementation of \`int\` is 64-bit two's complement integers with operations that wrap to that range on overflow.

**Note**: When compiling to JavaScript, integers are restricted to values that can be represented exactly by double-precision floating point values. The available integer values include all integers between -2^53 and 2^53, and some integers with larger magnitude. That includes some integers larger than 2^63. The behavior of the operators and methods in the [int] class therefore sometimes differs between the Dart VM and Dart code compiled to JavaScript. For example, the bitwise operators truncate their operands to 32-bit integers when compiled to JavaScript.

Classes cannot extend, implement, or mix in \`int\`.`,
	members: {
		abs: {
			type: 'int',
			description: 'The absolute value of the integer.'
		},
		isNegative: {
			type: 'bool',
			description: 'Whether the integer is negative.'
		},
		isZero: {
			type: 'bool',
			description: 'Whether the integer is zero.'
		}
	},
	package: 'dart:core',
	modifiers: ['abstract', 'final'],
	extends: 'num',
})

const printFunction = defineFunction({
	name: 'print',
	description: `Prints a string representation of an object to the console.

On the web, \`object\` is converted to a string and that string is output to the web console using \`console.log\`.

On native (non-Web) platforms, \`object\` is converted to a string and that string is terminated by a line feed (\'\\n\', U+000A) and written to stdout. On Windows, the terminating line feed, and any line feeds in the string representation of \`object\`, are output using the Windows line terminator sequence of (\'\\r\\n\', U+000D + U+000A).
	`,
	kind: 'function',
	parameters: [
		{
			name: 'object',
			kind: 'positional',
			type: 'Object?',
			description: 'The object to print. If null, prints "null".'
		}
	],
	returnType: 'void',
	package: 'dart:core',
})

export default [
	listType,
	stringType,
	printFunction,
	intType,
]