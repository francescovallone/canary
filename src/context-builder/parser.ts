// Token types and CST node definitions
import { Token, TokenType } from './lexer';

interface ParseError {
  message: string;
  token: Token;
  expected?: TokenType[];
}

// CST Node types
export namespace CST {
  export type Range = [number, number];

  export interface CompilationUnit {
    kind: 'CompilationUnit';
    directives: Directive[];
    declarations: Declaration[];
    range: Range;
  }

  export type Directive = ImportDirective | ExportDirective | PartDirective | LibraryDirective;

  export interface ImportDirective {
    kind: 'ImportDirective';
    keyword: Token;
    uri: Token;
    asPrefix: Token | null;
    combinators: Combinator[];
    range: Range;
  }

  export interface ExportDirective {
    kind: 'ExportDirective';
    keyword: Token;
    uri: Token;
    asPrefix: Token | null;
    combinators: Combinator[];
    range: Range;
  }

  export interface PartDirective {
    kind: 'PartDirective';
    keyword: Token;
    uri: Token;
    range: Range;
  }

  export interface LibraryDirective {
    kind: 'LibraryDirective';
    keyword: Token;
    name: Token[];
    range: Range;
  }

  export type Combinator = ShowCombinator | HideCombinator;

  export interface ShowCombinator {
    kind: 'ShowCombinator';
    identifiers: Token[];
    range: Range;
  }

  export interface HideCombinator {
    kind: 'HideCombinator';
    identifiers: Token[];
    range: Range;
  }

  export type Declaration = ClassDeclaration | EnumDeclaration | MixinDeclaration |
    ExtensionDeclaration | TypedefDeclaration | FunctionDeclaration |
    VariableDeclaration | GetterDeclaration | SetterDeclaration;

  export interface ClassDeclaration {
    kind: 'ClassDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    keyword: Token;
    name: Token;
    typeParameters: TypeParameterList | null;
    extendsClause: TypeAnnotation | null;
    withClause: TypeAnnotation[];
    implementsClause: TypeAnnotation[];
    members: ClassMember[];
    range: Range;
  }

  export interface EnumDeclaration {
    kind: 'EnumDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    keyword: Token;
    name: Token;
    values: EnumValue[];
    range: Range;
  }

  export interface EnumValue {
    kind: 'EnumValue';
    metadata: Metadata[];
    name: Token;
    range: Range;
  }

  export interface MixinDeclaration {
    kind: 'MixinDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    keyword: Token;
    name: Token;
    typeParameters: TypeParameterList | null;
    onClause: TypeAnnotation[];
    implementsClause: TypeAnnotation[];
    members: ClassMember[];
    range: Range;
  }

  export interface ExtensionDeclaration {
    kind: 'ExtensionDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    keyword: Token;
    name: Token | null;
    typeParameters: TypeParameterList | null;
    extendedType: TypeAnnotation;
    members: ClassMember[];
    range: Range;
  }

  export interface TypedefDeclaration {
    kind: 'TypedefDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    keyword: Token;
    name: Token;
    aliasedType?: TypeAnnotation;
    returnType?: TypeAnnotation;
    typeParameters?: TypeParameterList | null;
    parameters?: ParameterList;
    range: Range;
  }

  export interface FunctionDeclaration {
    kind: 'FunctionDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    returnType: TypeAnnotation | null;
    name: Token;
    typeParameters: TypeParameterList | null;
    parameters: ParameterList;
    body: FunctionBody;
    range: Range;
  }

  export interface VariableDeclaration {
    kind: 'VariableDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    type: TypeAnnotation | null;
    name: Token;
    initializer: Expression | null;
    range: Range;
  }

  export interface GetterDeclaration {
    kind: 'GetterDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    returnType: TypeAnnotation | null;
    name: Token;
    body: FunctionBody;
    range: Range;
  }

  export interface SetterDeclaration {
    kind: 'SetterDeclaration';
    metadata: Metadata[];
    modifiers: Token[];
    returnType: TypeAnnotation | null;
    name: Token;
    parameters: ParameterList;
    body: FunctionBody;
    range: Range;
  }

  export type ClassMember = FunctionDeclaration | VariableDeclaration | GetterDeclaration | SetterDeclaration;

  export interface Metadata {
    kind: 'Metadata';
    at: Token;
    name: Token;
    arguments: ArgumentList | null;
    range: Range;
  }

  export interface TypeAnnotation {
    kind: 'TypeAnnotation';
    typeName: TypeName;
    typeArguments: TypeArgumentList | null;
    isNullable: boolean;
    range: Range;
  }

  export type TypeName = SimpleTypeName | FunctionTypeName | RecordTypeName;

  export interface SimpleTypeName {
    kind: 'TypeName';
    parts: Token[];
    range: Range;
  }

  // For function types like: String Function(String, int)
  export interface FunctionTypeParameterList {
    kind: 'FunctionTypeParameterList';
    parameters: FunctionTypeParameter[];
    range: Range;
  }

  export interface FunctionTypeParameter {
    kind: 'FunctionTypeParameter';
    type: TypeAnnotation;
    name: Token | null;  // Name is optional in function types
    isOptional?: boolean;
    isNamed?: boolean;
    isRequired?: boolean;
    range: Range;
  }

  export interface FunctionTypeName {
    kind: 'FunctionTypeName';
    returnType: TypeAnnotation | null;
    typeParameters: TypeParameterList | null;
    parameters: FunctionTypeParameterList | null;
    range: Range;
  }

  export interface RecordTypeField {
    kind: 'RecordTypeField';
    name: Token;
    type: TypeAnnotation;
    range: Range;
  }

  export interface RecordTypeName {
    kind: 'RecordTypeName';
    positionalFields: TypeAnnotation[];
    namedFields: RecordTypeField[];
    range: Range;
  }

  export interface TypeArgumentList {
    kind: 'TypeArgumentList';
    types: TypeAnnotation[];
    range: Range;
  }

  export interface TypeParameterList {
    kind: 'TypeParameterList';
    typeParameters: TypeParameter[];
    range: Range;
  }

  export interface TypeParameter {
    kind: 'TypeParameter';
    name: Token;
    bound: TypeAnnotation | null;
    range: Range;
  }

  export interface ParameterList {
    kind: 'ParameterList';
    parameters: Parameter[];
    range: Range;
  }

  export interface Parameter {
    kind: 'Parameter';
    metadata: Metadata[];
    isRequired: boolean;
    isOptional: boolean;
    isNamed: boolean;
    isThis?: boolean;  // this.name
    isSuper?: boolean; // super.name
    type: TypeAnnotation | null;
    name: Token;
    defaultValue: Expression | null;
    range: Range;
  }

  export type FunctionBody = EmptyFunctionBody | ExpressionFunctionBody | BlockFunctionBody;

  export interface EmptyFunctionBody {
    kind: 'EmptyFunctionBody';
    range: Range;
  }

  export interface ExpressionFunctionBody {
    kind: 'ExpressionFunctionBody';
    expression: Expression;
    range: Range;
  }

  export interface BlockFunctionBody {
    kind: 'BlockFunctionBody';
    statements: Statement[];
    range: Range;
  }

  export type Statement = VariableDeclarationStatement | ExpressionStatement | IfStatement |
    ForStatement | ForInStatement | WhileStatement | DoWhileStatement |
    SwitchStatement | ReturnStatement | BreakStatement | ContinueStatement |
    TryStatement | ThrowStatement;

  export interface VariableDeclarationStatement {
    kind: 'VariableDeclarationStatement';
    modifiers: Token[];
    type: TypeAnnotation | null;
    name: Token;
    initializer: Expression | null;
    range: Range;
  }

  export interface ExpressionStatement {
    kind: 'ExpressionStatement';
    expression: Expression;
    range: Range;
  }

  export interface IfStatement {
    kind: 'IfStatement';
    keyword: Token;
    condition: Expression;
    thenBranch: Statement;
    elseBranch: Statement | null;
    range: Range;
  }

  export interface ForStatement {
    kind: 'ForStatement';
    keyword: Token;
    initializer: Expression;
    condition: Expression | null;
    increment: Expression | null;
    body: Statement;
    range: Range;
  }

  export interface ForInStatement {
    kind: 'ForInStatement';
    keyword: Token;
    variable: Expression;
    iterable: Expression;
    body: Statement;
    range: Range;
  }

  export interface WhileStatement {
    kind: 'WhileStatement';
    keyword: Token;
    condition: Expression;
    body: Statement;
    range: Range;
  }

  export interface DoWhileStatement {
    kind: 'DoWhileStatement';
    keyword: Token;
    body: Statement;
    condition: Expression;
    range: Range;
  }

  export interface SwitchStatement {
    kind: 'SwitchStatement';
    keyword: Token;
    expression: Expression;
    cases: SwitchCase[];
    range: Range;
  }

  export interface SwitchCase {
    kind: 'SwitchCase';
    keyword: Token;
    expression: Expression | null;
    statements: Statement[];
    range: Range;
  }

  export interface ReturnStatement {
    kind: 'ReturnStatement';
    keyword: Token;
    expression: Expression | null;
    range: Range;
  }

  export interface BreakStatement {
    kind: 'BreakStatement';
    keyword: Token;
    range: Range;
  }

  export interface ContinueStatement {
    kind: 'ContinueStatement';
    keyword: Token;
    range: Range;
  }

  export interface TryStatement {
    kind: 'TryStatement';
    keyword: Token;
    body: BlockFunctionBody;
    catchClauses: CatchClause[];
    finallyClause: BlockFunctionBody | null;
    range: Range;
  }

  export interface CatchClause {
    kind: 'CatchClause';
    exceptionType: TypeAnnotation | null;
    exceptionVar: Token | null;
    stackTraceVar: Token | null;
    body: BlockFunctionBody;
    range: Range;
  }

  export interface ThrowStatement {
    kind: 'ThrowStatement';
    keyword: Token;
    expression: Expression;
    range: Range;
  }

  export type Expression = BinaryExpression | UnaryExpression | PostfixExpression |
    ConditionalExpression | CascadeExpression | AsExpression | IsExpression |
    PropertyAccess | FunctionCall | IndexExpression |
    BooleanLiteral | NullLiteral | NumberLiteral | StringLiteral |
    ThisExpression | SuperExpression | ParenthesizedExpression |
    RecordLiteral | ListLiteral | MapLiteral | SetLiteral | SetOrMapLiteral | FunctionExpression |
    Identifier | MethodInvocation | AssignmentExpression;

  // ========== Collection Element Types ==========
  // These represent elements that can appear in collection literals.
  // The parser creates these during parsing; resolution happens later.

  /**
   * Base type for all collection elements.
   * Collection elements can be:
   * - ExpressionElement: a plain expression (e.g., `1`, `x + y`)
   * - SpreadElement: `...expr` or `...?expr`
   * - IfElement: `if (cond) element [else element]`
   * - ForElement: `for (var x in iterable) element` or `for (init; cond; incr) element`
   * - MapEntryElement: `key: value` (only valid in map context)
   */
  export type CollectionElement = 
    | ExpressionElement 
    | SpreadElement 
    | IfElement 
    | ForElement 
    | MapEntryElement;

  /**
   * A plain expression used as a collection element.
   * In sets/lists: the element value
   * In maps: would be an error (must be MapEntryElement)
   */
  export interface ExpressionElement {
    kind: 'ExpressionElement';
    expression: Expression;
    range: Range;
  }

  /**
   * Spread element: `...expr` or `...?expr`
   * The type of collection (Set vs Map) depends on whether `expression` 
   * evaluates to an Iterable or a Map - resolved during semantic analysis.
   */
  export interface SpreadElement {
    kind: 'SpreadElement';
    spreadOperator: Token;  // '...' or '...?'
    isNullAware: boolean;   // true for '...?'
    expression: Expression;
    range: Range;
  }

  /**
   * Conditional element: `if (condition) thenElement [else elseElement]`
   * Both branches must produce elements of the same kind (both Set elements or both Map entries).
   */
  export interface IfElement {
    kind: 'IfElement';
    ifKeyword: Token;
    condition: Expression;
    thenElement: CollectionElement;
    elseKeyword: Token | null;
    elseElement: CollectionElement | null;
    range: Range;
  }

  /**
   * For-in element: `for (var x in iterable) element`
   * For-loop element: `for (init; condition; increment) element`
   */
  export interface ForElement {
    kind: 'ForElement';
    forKeyword: Token;
    // For-in loop
    loopVariable: ForLoopVariable | null;
    iterable: Expression | null;
    // C-style for loop
    initializer: Expression | null;
    condition: Expression | null;
    increment: Expression | null;
    // Body element
    body: CollectionElement;
    range: Range;
  }

  /**
   * Loop variable declaration for for-in elements
   */
  export interface ForLoopVariable {
    kind: 'ForLoopVariable';
    keyword: Token | null;  // 'var', 'final', or null
    type: TypeAnnotation | null;
    name: Token;
    range: Range;
  }

  /**
   * Map entry: `key: value`
   * Only valid inside map literals or SetOrMapLiteral that resolves to map.
   */
  export interface MapEntryElement {
    kind: 'MapEntryElement';
    key: Expression;
    colonToken: Token;
    value: Expression;
    range: Range;
  }

  /**
   * Type-agnostic set/map literal produced during parsing.
   * Resolution determines whether this becomes a Set or Map based on:
   * 1. Type arguments (1 arg = Set, 2 args = Map)
   * 2. Element structure (MapEntryElement present = Map)
   * 3. Context type (expected type from surrounding code)
   * 4. Default: empty {} with no context = Map<dynamic, dynamic>
   */
  export interface SetOrMapLiteral {
    kind: 'SetOrMapLiteral';
    constKeyword: Token | null;
    typeArguments: TypeArgumentList | null;
    openBrace: Token;
    closeBrace: Token;
    elements: CollectionElement[];
    range: Range;
  }

  export interface BinaryExpression {
    kind: 'BinaryExpression';
    left: Expression;
    operator: Token;
    right: Expression;
    range: Range;
  }

  export interface UnaryExpression {
    kind: 'UnaryExpression';
    operator: Token;
    operand: Expression;
    range: Range;
  }

  export interface PostfixExpression {
    kind: 'PostfixExpression';
    operand: Expression;
    operator: Token;
    range: Range;
  }

  export interface ConditionalExpression {
    kind: 'ConditionalExpression';
    condition: Expression;
    thenExpression: Expression;
    elseExpression: Expression;
    range: Range;
  }

  export interface CascadeExpression {
    kind: 'CascadeExpression';
    target: Expression;
    sections: CascadeSection[];
    range: Range;
  }

  export interface CascadeSection {
    kind: 'CascadeSection';
    operator: Token;
    expression: Expression;
    range: Range;
  }

  export interface RecordLiteralField {
    kind: 'RecordLiteralField';
    name: Token;
    value: Expression;
    range: Range;
  }

  export interface RecordLiteral {
    kind: 'RecordLiteral';
    positionalFields: Expression[];
    namedFields: RecordLiteralField[];
    range: Range;
  }

  export interface AsExpression {
    kind: 'AsExpression';
    expression: Expression;
    type: TypeAnnotation;
    range: Range;
  }

  export interface IsExpression {
    kind: 'IsExpression';
    expression: Expression;
    isNegated: boolean;
    type: TypeAnnotation;
    range: Range;
  }

  export interface PropertyAccess {
    kind: 'PropertyAccess';
    target: Expression | null;
    operator?: Token;
    propertyName: Token;
    range: Range;
  }

  export interface MethodInvocation {
    kind: 'MethodInvocation';
    target: Expression | null;
    methodName: Token;
    arguments: ArgumentList;
    range: Range;
  }

  export interface AssignmentExpression {
    kind: 'AssignmentExpression';
    left: Expression;
    operator: Token;
    right: Expression;
    range: Range;
  }

  export interface FunctionCall {
    kind: 'FunctionCall';
    target: Expression;
    arguments: ArgumentList;
    range: Range;
  }

  export interface IndexExpression {
    kind: 'IndexExpression';
    target: Expression | null;
    index: Expression;
    range: Range;
  }

  export interface BooleanLiteral {
    kind: 'BooleanLiteral';
    value: Token;
    range: Range;
  }

  export interface CollectionLiteral {
    kind: 'CollectionLiteral';
    typeArguments: TypeArgumentList | null;
    elements: Expression[];
    range: Range;
  }

  export interface NullLiteral {
    kind: 'NullLiteral';
    value: Token;
    range: Range;
  }

  export interface NumberLiteral {
    kind: 'NumberLiteral';
    value: Token;
    range: Range;
  }

  export interface StringLiteral {
    kind: 'StringLiteral';
    value: Token;
    range: Range;
  }

  export interface ThisExpression {
    kind: 'ThisExpression';
    keyword: Token;
    range: Range;
  }

  export interface SuperExpression {
    kind: 'SuperExpression';
    keyword: Token;
    range: Range;
  }

  export interface ParenthesizedExpression {
    kind: 'ParenthesizedExpression';
    expression: Expression;
    range: Range;
  }

  export interface ListLiteral {
    kind: 'ListLiteral';
    constKeyword: Token | null;
    typeArguments: TypeArgumentList | null;
    openBracket: Token;
    closeBracket: Token;
    elements: CollectionElement[];
    range: Range;
  }

  export interface MapLiteral {
    kind: 'MapLiteral';
    constKeyword: Token | null;
    typeArguments: TypeArgumentList | null;
    openBrace: Token;
    closeBrace: Token;
    entries: CollectionElement[];  // Should all be MapEntryElement after resolution
    range: Range;
  }

  export interface MapEntry {
    kind: 'MapEntry';
    key: Expression;
    value: Expression;
    range: Range;
  }

  export interface SetLiteral {
    kind: 'SetLiteral';
    constKeyword: Token | null;
    typeArguments: TypeArgumentList | null;
    openBrace: Token;
    closeBrace: Token;
    elements: CollectionElement[];  // Should NOT contain MapEntryElement after resolution
    range: Range;
  }

  export interface FunctionExpression {
    kind: 'FunctionExpression';
    typeParameters: TypeParameterList | null;
    parameters: ParameterList;
    body: FunctionBody;
    range: Range;
  }

  export interface Identifier {
    kind: 'Identifier';
    name: Token;
    typeArguments: TypeArgumentList | null;
    range: Range;
  }

  export type Argument = PositionalArgument | NamedArgument;

  export interface PositionalArgument {
    kind: 'PositionalArgument';
    expression: Expression;
    range: Range;
  }

  export interface NamedArgument {
    kind: 'NamedArgument';
    name: Token;
    value: Expression;
    range: Range;
  }

  export interface ArgumentList {
    kind: 'ArgumentList';
    arguments: Argument[];
    range: Range;
  }
}

export class DartParser {
  private tokens: Token[] = [];
  private current: number = 0;
  private errors: ParseError[] = [];

  // Context tracking for disambiguation
  private context: ParseContext = {
    allowTypes: true,
    inTypeContext: false,
    inDeclaration: false,
    inCascade: false,
  };

  parse(tokens: Token[]): CST.CompilationUnit {
    this.tokens = tokens;
    this.current = 0;
    this.errors = [];
    
    // Skip initial whitespace/comments
    this.skipTrivia();

    return this.parseCompilationUnit();
  }

  // Entry point
  private parseCompilationUnit(): CST.CompilationUnit {
    const declarations: CST.Declaration[] = [];
    const directives: CST.Directive[] = [];

    // Parse directives (import, export, part, library)
    while (this.check(TokenType.IMPORT) || this.check(TokenType.EXPORT) ||
      this.check(TokenType.PART) || this.check(TokenType.LIBRARY)) {
      directives.push(this.parseDirective());
    }

    // Parse top-level declarations
    while (!this.isAtEnd()) {
      console.log('Parsing top-level declaration at token:', this.peek());
      try {
        const decl = this.parseTopLevelDeclaration();
        console.log('Parsed declaration:', decl);
        if (decl) {
          declarations.push(decl);
        } else {
          // If null, we're stuck - advance and continue
          this.advance();
        }
      } catch (e) {
        console.log('Parse error:', e);
        // Error recovery: synchronize and continue
        this.synchronize();
      }
    }

    return {
      kind: 'CompilationUnit',
      directives,
      declarations,
      range: [0, this.tokens[this.tokens.length - 1].end],
    };
  }

  private parseTopLevelDeclaration(): CST.Declaration | null {
    // Skip trivia
    this.skipTrivia();

    if (this.isAtEnd()) return null;

    // Metadata (@override, @deprecated, etc.)
    const metadata = this.parseMetadata();

    // Check for class/enum/mixin/extension/typedef declarations first
    if (this.check(TokenType.CLASS)) {
      return this.parseClassDeclaration(metadata, []);
    }

    if (this.check(TokenType.ENUM)) {
      return this.parseEnumDeclaration(metadata, []);
    }

    if (this.check(TokenType.MIXIN)) {
      return this.parseMixinDeclaration(metadata, []);
    }

    if (this.check(TokenType.EXTENSION)) {
      return this.parseExtensionDeclaration(metadata, []);
    }

    if (this.check(TokenType.TYPEDEF)) {
      return this.parseTypedefDeclaration(metadata, []);
    }

    // Parse modifiers for functions/variables/getters/setters
    const modifiers: Token[] = [];
    while (this.check(TokenType.ABSTRACT) || this.check(TokenType.CONST) ||
      this.check(TokenType.EXTERNAL) || this.check(TokenType.FINAL) ||
      this.check(TokenType.LATE) || this.check(TokenType.STATIC)) {
      modifiers.push(this.advance());
    }

    // Function or variable declaration
    // Need lookahead to distinguish:
    // int foo() {}      // function
    // int foo = 42;     // variable
    // int get foo => 1; // getter
    console.log('Parsing function or variable declaration at token:', this.peek());
    return this.parseFunctionOrVariableDeclaration(metadata, modifiers);
  }

  private parseFunctionOrVariableDeclaration(
    metadata: CST.Metadata[],
    modifiers: Token[]
  ): CST.Declaration {
    const savedContext = { ...this.context };
    this.context.inDeclaration = true;

    // Parse optional return type
    // We need lookahead to tell if this is "Type name" or just "name"
    let returnType: CST.TypeAnnotation | null = null;
    if (this.looksLikeTypeFollowedByName()) {
      returnType = this.parseType();
    }

    // Check for getter/setter
    if (this.match(TokenType.GET)) {
      const name = this.consume(TokenType.IDENTIFIER, "Expected getter name");
      const body = this.parseFunctionBody();

      this.context = savedContext;
      return {
        kind: 'GetterDeclaration',
        metadata,
        modifiers,
        returnType,
        name,
        body,
        range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? returnType?.range[0] ?? name.start, body.range[1]],
      };
    }

    if (this.match(TokenType.SET)) {
      const name = this.consume(TokenType.IDENTIFIER, "Expected setter name");
      const parameters = this.parseParameterList();
      const body = this.parseFunctionBody();

      this.context = savedContext;
      return {
        kind: 'SetterDeclaration',
        metadata,
        modifiers,
        returnType,
        name,
        parameters,
        body,
        range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? returnType?.range[0] ?? name.start, body.range[1]],
      };
    }

    // Must be function or variable
    const name = this.consume(TokenType.IDENTIFIER, "Expected name");
    console.log(name);
    // Skip whitespace before checking for type params or parens
    this.skipTrivia();

    // Function: has parameter list
    if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
      // Generic function
      const typeParams = this.parseTypeParameters();
      const params = this.parseParameterList();
      const body = this.parseFunctionBody();

      this.context = savedContext;
      return {
        kind: 'FunctionDeclaration',
        metadata,
        modifiers,
        returnType,
        name,
        typeParameters: typeParams,
        parameters: params,
        body,
        range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? returnType?.range[0] ?? name.start, body.range[1]],
      };
    }

    if (this.check(TokenType.LEFT_PAREN)) {
      const params = this.parseParameterList();
      
      let body: CST.FunctionBody;
      try {
        body = this.parseFunctionBody();
      } catch (e) {
        // If body parsing fails, create an incomplete body and synchronize
        this.synchronize();
        body = {
          kind: 'BlockFunctionBody',
          statements: [],
          range: [params.range[1], this.previous().end],
        };
      }

      this.context = savedContext;
      return {
        kind: 'FunctionDeclaration',
        metadata,
        modifiers,
        returnType,
        name,
        typeParameters: null,
        parameters: params,
        body,
        range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? returnType?.range[0] ?? name.start, body.range[1]],
      };
    }

    // Variable: has = or ;
    let initializer: CST.Expression | null = null;
    if (this.match(TokenType.EQUALS)) {
      initializer = this.parseExpression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");

    this.context = savedContext;
    return {
      kind: 'VariableDeclaration',
      metadata,
      modifiers,
      type: returnType, // reuse as variable type
      name,
      initializer,
      range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? returnType?.range[0] ?? name.start, this.previous().end],
    };
  }

  private parseType(): CST.TypeAnnotation {
    const savedContext = { ...this.context };
    this.context.inTypeContext = true;

    // Parse base type name
    const typeName = this.parseTypeName();

    // Type arguments: <T, U>
    let typeArguments: CST.TypeArgumentList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeArguments()) {
      typeArguments = this.parseTypeArguments();
    }

    // Nullable: ?
    let isNullable = false;
    if (this.match(TokenType.QUESTION)) {
      isNullable = true;
    }

    this.context = savedContext;

    return {
      kind: 'TypeAnnotation',
      typeName,
      typeArguments,
      isNullable,
      range: [typeName.range[0], this.previous().end],
    };
  }

  private parseTypeName(): CST.TypeName {
    // Simple: Foo
    // Prefixed: dart:core.String
    // Function: void Function(int)
    // Function with return type: String Function(int)
    // Record type: ({String name, int age}) or (String, int)

    // Record type always starts with a parenthesis in type context
    if (this.check(TokenType.LEFT_PAREN)) {
      return this.parseRecordType();
    }

    // Check for Function keyword (function type without return type)
    if (this.check(TokenType.FUNCTION)) {
      return this.parseFunctionType();
    }

    // Check for void - could be "void Function(...)" or just "void" as return type
    if (this.check(TokenType.VOID)) {
      // Save the void token before advancing
      const voidToken = this.peek();
      this.advance(); // consume void
      this.skipTrivia();
      
      if (this.check(TokenType.FUNCTION)) {
        // It's "void Function(...)" - restore and parse as function type
        this.current--; // back up to void token
        return this.parseFunctionType();
      } else {
        // It's just "void" as a simple type
        return {
          kind: 'TypeName',
          parts: [voidToken],
          range: [voidToken.start, voidToken.end],
        };
      }
    }

    const parts: Token[] = [];
    parts.push(this.consume(TokenType.IDENTIFIER, "Expected type name"));

    // Prefixed type: prefix.Type
    while (this.match(TokenType.DOT)) {
      parts.push(this.consume(TokenType.IDENTIFIER, "Expected type name after '.'"));
    }

    // Skip whitespace before checking for Function keyword
    this.skipTrivia();

    // Check if this is a function type with a return type: String Function(...)
    if (this.check(TokenType.FUNCTION)) {
      return this.parseFunctionTypeWithReturnType(parts);
    }

    return {
      kind: 'TypeName',
      parts,
      range: [parts[0].start, parts[parts.length - 1].end],
    };
  }

  private parseRecordType(): CST.RecordTypeName {
    const start = this.consume(TokenType.LEFT_PAREN, "Expected '(' for record type");
    const positionalFields: CST.TypeAnnotation[] = [];
    const namedFields: CST.RecordTypeField[] = [];

    // Parse fields if not an empty record
    if (!this.check(TokenType.RIGHT_PAREN)) {
      while (true) {
        // Named fields are grouped in braces: ({Type name, ...})
        if (this.match(TokenType.LEFT_BRACE)) {
          if (!this.check(TokenType.RIGHT_BRACE)) {
            do {
              const fieldType = this.parseType();
              const fieldName = this.consume(TokenType.IDENTIFIER, 'Expected record field name');
              namedFields.push({
                kind: 'RecordTypeField',
                name: fieldName,
                type: fieldType,
                range: [fieldType.range[0], fieldName.end],
              });
            } while (this.match(TokenType.COMMA));
          }
          this.consume(TokenType.RIGHT_BRACE, "Expected '}' after record named fields");
        } else {
          // Positional field
          const fieldType = this.parseType();
          positionalFields.push(fieldType);
        }

        if (this.match(TokenType.COMMA)) {
          if (this.check(TokenType.RIGHT_PAREN)) {
            break;
          }
          continue;
        }
        break;
      }
    }

    const end = this.consume(TokenType.RIGHT_PAREN, "Expected ')' after record type");
    return {
      kind: 'RecordTypeName',
      positionalFields,
      namedFields,
      range: [start.start, end.end],
    };
  }

  // Parse function type when we've already parsed the return type name
  private parseFunctionTypeWithReturnType(returnTypeParts: Token[]): CST.TypeName {
    const start = returnTypeParts[0];

    // Build the return type from the parts we already parsed
    const returnType: CST.TypeAnnotation = {
      kind: 'TypeAnnotation',
      typeName: {
        kind: 'TypeName',
        parts: returnTypeParts,
        range: [returnTypeParts[0].start, returnTypeParts[returnTypeParts.length - 1].end],
      },
      typeArguments: null, // Type arguments on return type were already handled in parseType
      isNullable: false,
      range: [returnTypeParts[0].start, returnTypeParts[returnTypeParts.length - 1].end],
    };

    this.consume(TokenType.FUNCTION, "Expected 'Function'");

    let typeParameters: CST.TypeParameterList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
      typeParameters = this.parseTypeParameters();
    }

    let parameters: CST.FunctionTypeParameterList | null = null;
    if (this.check(TokenType.LEFT_PAREN)) {
      parameters = this.parseFunctionTypeParameterList();
    }

    return {
      kind: 'FunctionTypeName',
      returnType,
      typeParameters,
      parameters,
      range: [start.start, parameters?.range[1] ?? typeParameters?.range[1] ?? this.previous().end],
    } as any;
  }

  // CRITICAL: The generic vs comparison disambiguator
  private looksLikeTypeArguments(): boolean {
    // This is the heart of the parser - deciding if < starts generics

    // Save state for backtracking
    const savedCurrent = this.current;

    try {
      this.advance(); // consume 

      // Try to parse as type arguments
      let depth = 1;
      let sawComma = false;

      while (depth > 0 && !this.isAtEnd()) {
        if (this.check(TokenType.LESS)) {
          depth++;
          this.advance();
        } else if (this.check(TokenType.GREATER)) {
          depth--;
          this.advance();

          // After closing >, what follows?
          if (depth === 0) {
            // Generics are typically followed by:
            // - ( for function call: foo<T>(x)
            // - . for member access: foo<T>.bar
            // - identifier for declaration: class Foo<T> extends Bar
            // - { for class body: class Foo<T> {
            // - = for assignment: var x = Foo<T>

            // NOT followed by:
            // - arithmetic operators for comparison: foo < T > x
            // - another > for shift: foo << bar >> baz

            const next = this.peek();
            const looksLikeGeneric =
              next.type === TokenType.LEFT_PAREN ||
              next.type === TokenType.DOT ||
              next.type === TokenType.LEFT_BRACE ||
              next.type === TokenType.EQUALS ||
              next.type === TokenType.IDENTIFIER ||
              next.type === TokenType.EXTENDS ||
              next.type === TokenType.IMPLEMENTS ||
              next.type === TokenType.WITH ||
              next.type === TokenType.SEMICOLON ||
              next.type === TokenType.COMMA ||
              next.type === TokenType.RIGHT_PAREN ||
              next.type === TokenType.RIGHT_BRACKET;

            this.current = savedCurrent;
            return looksLikeGeneric;
          }
        } else if (this.check(TokenType.COMMA)) {
          sawComma = true;
          this.advance();
        } else if (this.check(TokenType.RIGHT_SHIFT) ||
          this.check(TokenType.TRIPLE_RIGHT_SHIFT)) {
          // >> or >>> can close nested generics: List<List<int>>
          // Each >> closes two levels
          depth -= this.check(TokenType.TRIPLE_RIGHT_SHIFT) ? 3 : 2;
          this.advance();
        } else if (this.isType()) {
          // Looks like a type
          this.parseType();
        } else {
          // Doesn't look like type arguments
          this.current = savedCurrent;
          return false;
        }
      }

      // Fell through - probably not generics
      this.current = savedCurrent;
      return false;

    } catch (e) {
      // Parse failed - not generics
      this.current = savedCurrent;
      return false;
    }
  }

  private parseTypeArguments(): CST.TypeArgumentList {
    const start = this.consume(TokenType.LESS, "Expected '<'");
    const types: CST.TypeAnnotation[] = [];

    types.push(this.parseType());

    while (this.match(TokenType.COMMA)) {
      types.push(this.parseType());
    }

    // Handle >> as closing >> for nested generics
    // List<List<int>> - the >> closes both
    if (this.check(TokenType.RIGHT_SHIFT)) {
      const token = this.advance();
      // Split >> into two >
      // This is a trick: we consumed >>, but conceptually it closes two levels
      return {
        kind: 'TypeArgumentList',
        types,
        range: [start.start, token.end],
      };
    }

    if (this.check(TokenType.TRIPLE_RIGHT_SHIFT)) {
      const token = this.advance();
      // Split >>> into three >
      return {
        kind: 'TypeArgumentList',
        types,
        range: [start.start, token.end],
      };
    }

    const end = this.consume(TokenType.GREATER, "Expected '>' after type arguments");

    return {
      kind: 'TypeArgumentList',
      types,
      range: [start.start, end.end],
    };
  }

  private looksLikeTypeParameters(): boolean {
    // Similar to looksLikeTypeArguments, but for declarations
    // class Foo<T> vs foo<T>()

    const savedCurrent = this.current;

    try {
      this.advance(); // consume 

      // Type parameters must be identifiers: <T, U extends Foo>
      if (!this.check(TokenType.IDENTIFIER)) {
        this.current = savedCurrent;
        return false;
      }

      // Parse through to find matching >
      let depth = 1;
      while (depth > 0 && !this.isAtEnd()) {
        if (this.check(TokenType.LESS)) {
          depth++;
        } else if (this.check(TokenType.GREATER)) {
          depth--;
          if (depth === 0) {
            this.advance();
            // After type parameters, expect ( or { or extends/implements or = (for typedef)
            const next = this.peek();
            const result =
              next.type === TokenType.LEFT_PAREN ||
              next.type === TokenType.LEFT_BRACE ||
              next.type === TokenType.EXTENDS ||
              next.type === TokenType.IMPLEMENTS ||
              next.type === TokenType.WITH ||
              next.type === TokenType.EQUALS;

            this.current = savedCurrent;
            return result;
          }
        }
        this.advance();
      }

      this.current = savedCurrent;
      return false;

    } catch (e) {
      this.current = savedCurrent;
      return false;
    }
  }

  private isType(): boolean {
    // Quick check if current position looks like a type
    return this.check(TokenType.IDENTIFIER) ||
      this.check(TokenType.VOID) ||
      this.check(TokenType.DYNAMIC) ||
      this.check(TokenType.FUNCTION);
  }

  // Advance without skipping trivia - for lookahead only
  private advanceRaw(): void {
    if (this.current < this.tokens.length - 1) {
      this.current++;
    }
  }

  // Skip trivia from current position  
  private skipTriviaRaw(): void {
    while (this.current < this.tokens.length) {
      const type = this.tokens[this.current].type;
      if (type === TokenType.WHITESPACE || 
          type === TokenType.NEWLINE || 
          type === TokenType.COMMENT ||
          type === TokenType.DOC_COMMENT) {
        this.current++;
      } else {
        break;
      }
    }
  }

  private looksLikeTypeFollowedByName(): boolean {
    // Check if we have "Type name" pattern (type annotation followed by identifier)
    // vs just "name" (variable without type)
    
    if (!this.isType()) {
      return false;
    }
    
    // Save position for backtracking
    const savedCurrent = this.current;
    
    try {
      // Helper to advance and skip whitespace for lookahead
      const lookaheadAdvance = () => {
        this.advanceRaw();
        this.skipTriviaRaw();
      };

      // Skip potential type name
      if (this.check(TokenType.VOID) || this.check(TokenType.DYNAMIC)) {
        lookaheadAdvance();
      } else if (this.check(TokenType.IDENTIFIER)) {
        lookaheadAdvance();
        
        // Skip prefixed type: prefix.Type
        while (this.check(TokenType.DOT)) {
          lookaheadAdvance();
          if (this.check(TokenType.IDENTIFIER)) {
            lookaheadAdvance();
          } else {
            this.current = savedCurrent;
            return false;
          }
        }
        
        // Skip type arguments: <T, U>
        if (this.check(TokenType.LESS)) {
          let depth = 1;
          lookaheadAdvance();
          while (depth > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.LESS)) {
              depth++;
            } else if (this.check(TokenType.GREATER)) {
              depth--;
            } else if (this.check(TokenType.RIGHT_SHIFT)) {
              depth -= 2;
            }
            lookaheadAdvance();
          }
        }
        
        // Skip nullable: ?
        if (this.check(TokenType.QUESTION)) {
          lookaheadAdvance();
        }
        
        // Check for function type: String Function(...)
        if (this.check(TokenType.FUNCTION)) {
          lookaheadAdvance();
          // Skip type params if present
          if (this.check(TokenType.LESS)) {
            let depth = 1;
            lookaheadAdvance();
            while (depth > 0 && !this.isAtEnd()) {
              if (this.check(TokenType.LESS)) depth++;
              else if (this.check(TokenType.GREATER)) depth--;
              lookaheadAdvance();
            }
          }
          // Skip params if present
          if (this.check(TokenType.LEFT_PAREN)) {
            let depth = 1;
            lookaheadAdvance();
            while (depth > 0 && !this.isAtEnd()) {
              if (this.check(TokenType.LEFT_PAREN)) depth++;
              else if (this.check(TokenType.RIGHT_PAREN)) depth--;
              lookaheadAdvance();
            }
          }
          // Skip nullable on function type
          if (this.check(TokenType.QUESTION)) {
            lookaheadAdvance();
          }
        }
      } else if (this.check(TokenType.FUNCTION)) {
        // Function type - just skip to check if followed by identifier
        lookaheadAdvance();
        // Skip type params and params if present
        if (this.check(TokenType.LESS)) {
          let depth = 1;
          lookaheadAdvance();
          while (depth > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.LESS)) depth++;
            else if (this.check(TokenType.GREATER)) depth--;
            lookaheadAdvance();
          }
        }
        if (this.check(TokenType.LEFT_PAREN)) {
          let depth = 1;
          lookaheadAdvance();
          while (depth > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.LEFT_PAREN)) depth++;
            else if (this.check(TokenType.RIGHT_PAREN)) depth--;
            lookaheadAdvance();
          }
        }
      }
      
      // After type, should be an identifier (the name), get, or set
      const result = this.check(TokenType.IDENTIFIER) || 
                     this.check(TokenType.GET) || 
                     this.check(TokenType.SET);
      this.current = savedCurrent;
      return result;
      
    } catch (e) {
      this.current = savedCurrent;
      return false;
    }
  }

  // Pratt parser / precedence climbing for expressions
  private parseExpression(minPrecedence: number = 0): CST.Expression {
    console.log('parseExpression at token:', this.peek());
    let left = this.parsePrimaryExpression();

    while (true) {
      const operator = this.peek();
      const precedence = this.getPrecedence(operator.type);

      if (precedence < minPrecedence) {
        break;
      }

      // Binary operators
      if (this.isBinaryOperator(operator.type)) {
        this.advance();
        const right = this.parseExpression(precedence + 1);
        left = {
          kind: 'BinaryExpression',
          left,
          operator,
          right,
          range: [left.range[0], right.range[1]],
        };
        continue;
      }

      // Postfix operators
      if (this.isPostfixOperator(operator.type)) {
        this.advance();
        left = {
          kind: 'PostfixExpression',
          operand: left,
          operator,
          range: [left.range[0], operator.end],
        };
        continue;
      }

      // Cascade: .. or ?..
      if (this.check(TokenType.DOT_DOT) || this.check(TokenType.QUESTION_DOT_DOT)) {
        left = this.parseCascade(left);
        continue;
      }

      // Conditional: ? :
      if (this.check(TokenType.QUESTION)) {
        left = this.parseConditional(left);
        continue;
      }

      // Member access: . or ?.
      if (this.check(TokenType.DOT) || this.check(TokenType.QUESTION_DOT)) {
        left = this.parseMemberAccess(left);
        continue;
      }

      // Function call: ()
      if (this.check(TokenType.LEFT_PAREN)) {
        left = this.parseFunctionCall(left);
        continue;
      }

      // Index: []
      if (this.check(TokenType.LEFT_BRACKET)) {
        left = this.parseIndexAccess(left);
        continue;
      }

      // Type cast: as
      if (this.check(TokenType.AS)) {
        this.advance();
        const type = this.parseType();
        left = {
          kind: 'AsExpression',
          expression: left,
          type,
          range: [left.range[0], type.range[1]],
        };
        continue;
      }

      // Type test: is, is!
      if (this.check(TokenType.IS)) {
        this.advance();
        const isNegated = this.match(TokenType.BANG);
        const type = this.parseType();
        left = {
          kind: 'IsExpression',
          expression: left,
          isNegated,
          type,
          range: [left.range[0], type.range[1]],
        };
        continue;
      }

      break;
    }

    return left;
  }

  private parsePrimaryExpression(): CST.Expression {
    console.log('parsePrimaryExpression at token:', this.peek());
    // Prefix operators: !, -, ~, ++, --, await
    if (this.isUnaryOperator(this.peek().type)) {
      const operator = this.advance();
      const operand = this.parsePrimaryExpression();
      return {
        kind: 'UnaryExpression',
        operator,
        operand,
        range: [operator.start, operand.range[1]],
      };
    }

    // Literals
    if (this.match(TokenType.TRUE, TokenType.FALSE)) {
      return {
        kind: 'BooleanLiteral',
        value: this.previous(),
        range: [this.previous().start, this.previous().end],
      };
    }

    if (this.match(TokenType.NULL)) {
      return {
        kind: 'NullLiteral',
        value: this.previous(),
        range: [this.previous().start, this.previous().end],
      };
    }

    if (this.match(TokenType.NUMBER)) {
      return {
        kind: 'NumberLiteral',
        value: this.previous(),
        range: [this.previous().start, this.previous().end],
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        kind: 'StringLiteral',
        value: this.previous(),
        range: [this.previous().start, this.previous().end],
      };
    }

    // this, super
    if (this.match(TokenType.THIS)) {
      return {
        kind: 'ThisExpression',
        keyword: this.previous(),
        range: [this.previous().start, this.previous().end],
      };
    }

    if (this.match(TokenType.SUPER)) {
      return {
        kind: 'SuperExpression',
        keyword: this.previous(),
        range: [this.previous().start, this.previous().end],
      };
    }

    // Function expression: () => expr or () { }
    // Must check BEFORE parenthesized/record expressions since both start with (
    if (this.check(TokenType.LEFT_PAREN)) {
      // Could be function expression or just grouped/record expression
      // Need lookahead to decide
      if (this.looksLikeFunctionExpression()) {
        return this.parseFunctionExpression();
      }
      if (this.looksLikeRecordLiteral()) {
        return this.parseRecordLiteral();
      }
      // Not a function expression or record, parse as grouped expression
      this.advance(); // consume (
      const expr = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      return {
        kind: 'ParenthesizedExpression',
        expression: expr,
        range: [this.previous().start, this.previous().end],
      };
    }

    // List literal: [1, 2, 3] or <int>[1, 2]
    if (this.check(TokenType.LEFT_BRACKET) ||
      (this.check(TokenType.LESS) && this.looksLikeTypeArguments())) {
      return this.parseListLiteral();
    }

    // Map/Set literal: {1, 2} or {'a': 1}
    if (this.check(TokenType.LEFT_BRACE) ||
      (this.check(TokenType.LESS) && this.looksLikeTypeArguments())) {
      return this.parseMapOrSetLiteral();
    }

    // Identifier (possibly with type arguments for generic invocation)
    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.previous();

      // Generic function call: foo<int>()
      if (this.check(TokenType.LESS) && this.looksLikeTypeArguments()) {
        const typeArgs = this.parseTypeArguments();
        return {
          kind: 'Identifier',
          name,
          typeArguments: typeArgs,
          range: [name.start, typeArgs.range[1]],
        };
      }

      return {
        kind: 'Identifier',
        name,
        typeArguments: null,
        range: [name.start, name.end],
      };
    }

    // Error recovery
    throw this.error(this.peek(), "Expected expression");
  }

  private looksLikeRecordLiteral(): boolean {
    const saved = this.current;
    if (!this.check(TokenType.LEFT_PAREN)) return false;

    this.advance(); // consume (
    let depth = 1;
    let prev: Token | null = null;

    while (!this.isAtEnd() && depth > 0) {
      const token = this.peek();
      if (token.type === TokenType.LEFT_PAREN) {
        depth++;
      } else if (token.type === TokenType.RIGHT_PAREN) {
        depth--;
        if (depth === 0) break;
      } else if (depth === 1) {
        if (token.type === TokenType.COLON && prev?.type === TokenType.IDENTIFIER) {
          this.current = saved;
          return true;
        }
        if (token.type === TokenType.COMMA) {
          this.current = saved;
          return true;
        }
      }
      prev = token;
      this.advance();
    }

    this.current = saved;
    return false;
  }

  private parseRecordLiteral(): CST.RecordLiteral {
    const start = this.consume(TokenType.LEFT_PAREN, "Expected '(' for record literal");
    const positionalFields: CST.Expression[] = [];
    const namedFields: CST.RecordLiteralField[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      while (true) {
        if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.COLON) {
          const name = this.advance();
          this.consume(TokenType.COLON, "Expected ':' after record field name");
          const value = this.parseExpression();
          namedFields.push({
            kind: 'RecordLiteralField',
            name,
            value,
            range: [name.start, value.range[1]],
          });
        } else {
          const value = this.parseExpression();
          positionalFields.push(value);
        }

        if (this.match(TokenType.COMMA)) {
          if (this.check(TokenType.RIGHT_PAREN)) {
            break;
          }
          continue;
        }
        break;
      }
    }

    const end = this.consume(TokenType.RIGHT_PAREN, "Expected ')' after record literal");
    return {
      kind: 'RecordLiteral',
      positionalFields,
      namedFields,
      range: [start.start, end.end],
    };
  }

  // Operator precedence (Dart spec)
  private getPrecedence(type: TokenType): number {
    switch (type) {
      // Lowest precedence
      case TokenType.EQUALS:
      case TokenType.PLUS_EQUALS:
      case TokenType.MINUS_EQUALS:
      case TokenType.STAR_EQUALS:
      case TokenType.SLASH_EQUALS:
      case TokenType.TILDE_SLASH_EQUALS:
      case TokenType.PERCENT_EQUALS:
      case TokenType.AMPERSAND_EQUALS:
      case TokenType.PIPE_EQUALS:
      case TokenType.CARET_EQUALS:
      case TokenType.LEFT_SHIFT_EQUALS:
      case TokenType.RIGHT_SHIFT_EQUALS:
      case TokenType.TRIPLE_RIGHT_SHIFT_EQUALS:
      case TokenType.QUESTION_QUESTION_EQUALS:
        return 1;

      case TokenType.QUESTION: // ternary
        return 2;

      case TokenType.QUESTION_QUESTION:
        return 3;

      case TokenType.PIPE_PIPE:
        return 4;

      case TokenType.AMPERSAND_AMPERSAND:
        return 5;

      case TokenType.EQUALS_EQUALS:
      case TokenType.BANG_EQUALS:
        return 6;

      case TokenType.LESS:
      case TokenType.LESS_EQUALS:
      case TokenType.GREATER:
      case TokenType.GREATER_EQUALS:
      case TokenType.AS:
      case TokenType.IS:
        return 7;

      case TokenType.PIPE:
        return 8;

      case TokenType.CARET:
        return 9;

      case TokenType.AMPERSAND:
        return 10;

      case TokenType.LEFT_SHIFT:
      case TokenType.RIGHT_SHIFT:
      case TokenType.TRIPLE_RIGHT_SHIFT:
        return 11;

      case TokenType.PLUS:
      case TokenType.MINUS:
        return 12;

      case TokenType.STAR:
      case TokenType.SLASH:
      case TokenType.TILDE_SLASH:
      case TokenType.PERCENT:
        return 13;

      // Postfix: ++, --, ., ?., (), [], cascade
      case TokenType.PLUS_PLUS:
      case TokenType.MINUS_MINUS:
      case TokenType.DOT:
      case TokenType.QUESTION_DOT:
      case TokenType.LEFT_PAREN:
      case TokenType.LEFT_BRACKET:
      case TokenType.DOT_DOT:
      case TokenType.QUESTION_DOT_DOT:
        return 15;

      default:
        return -1;
    }
  }

  private parseCascade(target: CST.Expression): CST.CascadeExpression {
    const sections: CST.CascadeSection[] = [];

    // Save context
    const savedContext = { ...this.context };
    this.context.inCascade = true;

    while (this.check(TokenType.DOT_DOT) || this.check(TokenType.QUESTION_DOT_DOT)) {
      const operator = this.advance();

      // After .., can have:
      // - property access: ..name
      // - method call: ..method()
      // - index: ..[0]
      // - assignment: ..name = value

      let section: CST.Expression;

      if (this.match(TokenType.LEFT_BRACKET)) {
        // Index: ..[index]
        const index = this.parseExpression();
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']'");
        section = {
          kind: 'IndexExpression',
          target: null, // null because it's implicit in cascade
          index,
          range: [operator.start, this.previous().end],
        };
      } else {
        // Property or method
        const name = this.consume(TokenType.IDENTIFIER, "Expected identifier after cascade");

        // Method call?
        if (this.check(TokenType.LEFT_PAREN)) {
          const args = this.parseArgumentList();
          section = {
            kind: 'MethodInvocation',
            target: null, // null because it's implicit
            methodName: name,
            arguments: args,
            range: [operator.start, args.range[1]],
          };
        } else {
          section = {
            kind: 'PropertyAccess',
            target: null, // null because it's implicit
            propertyName: name,
            range: [operator.start, name.end],
          };
        }
      }

      // Check for assignment in cascade: ..name = value
      if (this.check(TokenType.EQUALS)) {
        this.advance();
        const value = this.parseExpression();
        section = {
          kind: 'AssignmentExpression',
          left: section,
          operator: this.previous(),
          right: value,
          range: [section.range[0], value.range[1]],
        };
      }

      sections.push({
        kind: 'CascadeSection',
        operator,
        expression: section,
        range: [operator.start, section.range[1]],
      });
    }

    this.context = savedContext;

    return {
      kind: 'CascadeExpression',
      target,
      sections,
      range: [target.range[0], sections[sections.length - 1].range[1]],
    };
  }

  private synchronize(): void {
    // Skip tokens until we find a synchronization point
    // This allows parsing to continue after an error
    
    // Always advance past the error token first
    this.advance();
    
    let maxIterations = 1000;
    while (!this.isAtEnd() && maxIterations-- > 0) {
      console.log('Synchronizing at token:', this.peek());
      // Semicolon is a natural statement boundary
      if (this.previous().type === TokenType.SEMICOLON) {
        return;
      }
      
      // Check if current token is a synchronization point
      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.ENUM:
        case TokenType.MIXIN:
        case TokenType.EXTENSION:
        case TokenType.TYPEDEF:
        case TokenType.FUNCTION:
        case TokenType.VAR:
        case TokenType.FINAL:
        case TokenType.CONST:
        case TokenType.IF:
        case TokenType.FOR:
        case TokenType.WHILE:
        case TokenType.RETURN:
        case TokenType.IMPORT:
        case TokenType.EXPORT:
          return;
      }
      
      // Move forward
      this.advance();
    }
  }

  private error(token: Token, message: string): ParseError {
    const error = {
      message,
      token,
      expected: [],
    };

    this.errors.push(error);
    return error;
  }

  // Consume with error recovery
  private consume(type: TokenType, message: string): Token {
    // Skip trivia before checking for the expected token
    this.skipTrivia();
    
    if (this.check(type)) {
      return this.advance();
    }

    // Error recovery: insert synthetic token
    const syntheticToken: Token = {
      type,
      lexeme: '',
      start: this.current > 0 ? this.tokens[this.current - 1].end : 0,
      end: this.current > 0 ? this.tokens[this.current - 1].end : 0,
      line: this.current > 0 ? this.tokens[this.current - 1].line : 1,
      column: this.current > 0 ? this.tokens[this.current - 1].column : 1,
    };

    throw this.error(this.peek(), message);

    // In practice, you might want to return synthetic token and continue
    // return syntheticToken;
  }

  private advance(): Token {
    if (this.current < this.tokens.length - 1) {
      this.current++;
    }
    // Save the token we just advanced to, BEFORE skipping trivia
    const token = this.tokens[this.current - 1];
    // Skip trivia after advancing so peek() sees the next meaningful token
    this.skipTrivia();
    return token;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private matchAny(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        return true;
      }
    }
    return false;
  }

  private peek(): Token {
    if (this.current >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.current];
  }

  private previous(): Token {
    if (this.current <= 0) {
      return this.tokens[0];
    }
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    if (!this.tokens || this.tokens.length === 0) {
      return true;
    }
    return this.current >= this.tokens.length || this.peek().type === TokenType.EOF;
  }

  private skipTrivia(): void {
    // Skip whitespace, newlines, and comments
    while (!this.isAtEnd()) {
      const type = this.peek().type;
      if (type === TokenType.WHITESPACE || 
          type === TokenType.NEWLINE || 
          type === TokenType.COMMENT ||
          type === TokenType.DOC_COMMENT) {
        this.current++;
      } else {
        break;
      }
    }
  }

  // Utility methods for operator checking
  private isBinaryOperator(type: TokenType): boolean {
    return this.getPrecedence(type) > 0 &&
      type !== TokenType.PLUS_PLUS &&
      type !== TokenType.MINUS_MINUS &&
      type !== TokenType.DOT &&
      type !== TokenType.QUESTION_DOT &&
      type !== TokenType.LEFT_PAREN &&
      type !== TokenType.LEFT_BRACKET &&
      type !== TokenType.DOT_DOT &&
      type !== TokenType.QUESTION_DOT_DOT &&
      type !== TokenType.QUESTION;
  }

  private isPostfixOperator(type: TokenType): boolean {
    return type === TokenType.PLUS_PLUS || type === TokenType.MINUS_MINUS;
  }

  private isUnaryOperator(type: TokenType): boolean {
    return type === TokenType.BANG ||
      type === TokenType.MINUS ||
      type === TokenType.TILDE ||
      type === TokenType.PLUS_PLUS ||
      type === TokenType.MINUS_MINUS ||
      type === TokenType.AWAIT;
  }

  // Declaration parsing methods
  private parseClassDeclaration(metadata: CST.Metadata[], modifiers: Token[]): CST.ClassDeclaration {
    const keyword = this.consume(TokenType.CLASS, "Expected 'class'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected class name");

    let typeParameters: CST.TypeParameterList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
      typeParameters = this.parseTypeParameters();
    }

    let extendsClause: CST.TypeAnnotation | null = null;
    if (this.match(TokenType.EXTENDS)) {
      extendsClause = this.parseType();
    }

    let withClause: CST.TypeAnnotation[] = [];
    if (this.match(TokenType.WITH)) {
      withClause.push(this.parseType());
      while (this.match(TokenType.COMMA)) {
        withClause.push(this.parseType());
      }
    }

    let implementsClause: CST.TypeAnnotation[] = [];
    if (this.match(TokenType.IMPLEMENTS)) {
      implementsClause.push(this.parseType());
      while (this.match(TokenType.COMMA)) {
        implementsClause.push(this.parseType());
      }
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after class header");

    const members: CST.ClassMember[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const memberMetadata = this.parseMetadata();
      const memberModifiers: Token[] = [];

      while (this.check(TokenType.STATIC) || this.check(TokenType.FINAL) || this.check(TokenType.CONST) ||
        this.check(TokenType.LATE) || this.check(TokenType.ABSTRACT) || this.check(TokenType.EXTERNAL)) {
        memberModifiers.push(this.advance());
      }

      members.push(this.parseClassMember(memberMetadata, memberModifiers));
    }

    const closeBrace = this.consume(TokenType.RIGHT_BRACE, "Expected '}' after class body");

    return {
      kind: 'ClassDeclaration',
      metadata,
      modifiers,
      keyword,
      name,
      typeParameters,
      extendsClause,
      withClause,
      implementsClause,
      members,
      range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? keyword.start, closeBrace.end],
    };
  }

  private parseClassMember(metadata: CST.Metadata[], modifiers: Token[]): CST.ClassMember {
    // Constructors, methods, fields, getters, setters
    // This is similar to parseFunctionOrVariableDeclaration
    return this.parseFunctionOrVariableDeclaration(metadata, modifiers) as CST.ClassMember;
  }

  private parseEnumDeclaration(metadata: CST.Metadata[], modifiers: Token[]): CST.EnumDeclaration {
    const keyword = this.consume(TokenType.ENUM, "Expected 'enum'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected enum name");

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after enum name");

    const values: CST.EnumValue[] = [];
    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        const valueMetadata = this.parseMetadata();
        const valueName = this.consume(TokenType.IDENTIFIER, "Expected enum value name");

        values.push({
          kind: 'EnumValue',
          metadata: valueMetadata,
          name: valueName,
          range: [valueMetadata[0]?.range[0] ?? valueName.start, valueName.end],
        });
      } while (this.match(TokenType.COMMA) && !this.check(TokenType.RIGHT_BRACE));
    }

    const closeBrace = this.consume(TokenType.RIGHT_BRACE, "Expected '}' after enum values");

    return {
      kind: 'EnumDeclaration',
      metadata,
      modifiers,
      keyword,
      name,
      values,
      range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? keyword.start, closeBrace.end],
    };
  }

  private parseMixinDeclaration(metadata: CST.Metadata[], modifiers: Token[]): CST.MixinDeclaration {
    const keyword = this.consume(TokenType.MIXIN, "Expected 'mixin'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected mixin name");

    let typeParameters: CST.TypeParameterList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
      typeParameters = this.parseTypeParameters();
    }

    let onClause: CST.TypeAnnotation[] = [];
    if (this.match(TokenType.ON)) {
      onClause.push(this.parseType());
      while (this.match(TokenType.COMMA)) {
        onClause.push(this.parseType());
      }
    }

    let implementsClause: CST.TypeAnnotation[] = [];
    if (this.match(TokenType.IMPLEMENTS)) {
      implementsClause.push(this.parseType());
      while (this.match(TokenType.COMMA)) {
        implementsClause.push(this.parseType());
      }
    }

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after mixin header");

    const members: CST.ClassMember[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const memberMetadata = this.parseMetadata();
      const memberModifiers: Token[] = [];

      while (this.check(TokenType.STATIC) || this.check(TokenType.FINAL) || this.check(TokenType.CONST) ||
        this.check(TokenType.LATE) || this.check(TokenType.ABSTRACT) || this.check(TokenType.EXTERNAL)) {
        memberModifiers.push(this.advance());
      }

      members.push(this.parseClassMember(memberMetadata, memberModifiers));
    }

    const closeBrace = this.consume(TokenType.RIGHT_BRACE, "Expected '}' after mixin body");

    return {
      kind: 'MixinDeclaration',
      metadata,
      modifiers,
      keyword,
      name,
      typeParameters,
      onClause,
      implementsClause,
      members,
      range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? keyword.start, closeBrace.end],
    };
  }

  private parseExtensionDeclaration(metadata: CST.Metadata[], modifiers: Token[]): CST.ExtensionDeclaration {
    const keyword = this.consume(TokenType.EXTENSION, "Expected 'extension'");

    let name: Token | null = null;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    }

    let typeParameters: CST.TypeParameterList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
      typeParameters = this.parseTypeParameters();
    }

    this.consume(TokenType.ON, "Expected 'on' in extension declaration");
    const extendedType = this.parseType();

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after extension header");

    const members: CST.ClassMember[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const memberMetadata = this.parseMetadata();
      const memberModifiers: Token[] = [];

      while (this.check(TokenType.STATIC) || this.check(TokenType.FINAL) || this.check(TokenType.CONST) ||
        this.check(TokenType.LATE) || this.check(TokenType.ABSTRACT) || this.check(TokenType.EXTERNAL)) {
        memberModifiers.push(this.advance());
      }

      members.push(this.parseClassMember(memberMetadata, memberModifiers));
    }

    const closeBrace = this.consume(TokenType.RIGHT_BRACE, "Expected '}' after extension body");

    return {
      kind: 'ExtensionDeclaration',
      metadata,
      modifiers,
      keyword,
      name,
      typeParameters,
      extendedType,
      members,
      range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? keyword.start, closeBrace.end],
    };
  }

  private parseTypedefDeclaration(metadata: CST.Metadata[], modifiers: Token[]): CST.TypedefDeclaration {
    const keyword = this.consume(TokenType.TYPEDEF, "Expected 'typedef'");

    // Modern syntax: typedef Name<T> = Type; or typedef Name = Type;
    // Legacy syntax: typedef ReturnType Name(params);
    
    // Peek ahead to determine syntax
    // Modern: IDENTIFIER [< ... >] EQUALS
    // Legacy: TYPE IDENTIFIER LPAREN
    
    const checkpoint = this.current;
    
    // Check if it's modern syntax
    if (this.check(TokenType.IDENTIFIER)) {
      this.advance(); // consume identifier
      
      // Check for optional type parameters
      if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
        // Skip type parameters by counting < and > brackets
        this.advance(); // consume <
        let depth = 1;
        while (depth > 0 && !this.isAtEnd()) {
          if (this.check(TokenType.LESS)) {
            depth++;
          } else if (this.check(TokenType.GREATER)) {
            depth--;
          }
          if (depth > 0) {
            this.advance();
          }
        }
        if (depth === 0) {
          this.advance(); // consume final >
        }
      }
      
      if (this.check(TokenType.EQUALS)) {
        // Modern syntax confirmed
        this.current = checkpoint; // reset
        const name = this.consume(TokenType.IDENTIFIER, "Expected typedef name");
        
        let typeParameters: CST.TypeParameterList | null = null;
        if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
          typeParameters = this.parseTypeParameters();
        }
        
        this.consume(TokenType.EQUALS, "Expected '='");
        const aliasedType = this.parseType();
        this.consume(TokenType.SEMICOLON, "Expected ';' after typedef");

        return {
          kind: 'TypedefDeclaration',
          metadata,
          modifiers,
          keyword,
          name,
          aliasedType,
          typeParameters,
          range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? keyword.start, this.previous().end],
        };
      }
    }
    
    // Legacy syntax: typedef ReturnType Name(params);
    this.current = checkpoint; // reset
    const returnType = this.parseType();
    const name = this.consume(TokenType.IDENTIFIER, "Expected typedef name");

    let typeParameters: CST.TypeParameterList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
      typeParameters = this.parseTypeParameters();
    }

    const parameters = this.parseParameterList();
    this.consume(TokenType.SEMICOLON, "Expected ';' after typedef");

    return {
      kind: 'TypedefDeclaration',
      metadata,
      modifiers,
      keyword,
      name,
      returnType,
      typeParameters,
      parameters,
      range: [metadata[0]?.range[0] ?? modifiers[0]?.start ?? keyword.start, this.previous().end],
    };
  }

  // Function and parameter parsing
  private parseFunctionBody(): CST.FunctionBody {
    if (this.match(TokenType.SEMICOLON)) {
      // Abstract or external function
      return {
        kind: 'EmptyFunctionBody',
        range: [this.previous().start, this.previous().end],
      };
    }

    if (this.match(TokenType.ARROW)) {
      // Expression body: => expr;
      const expression = this.parseExpression();
      this.consume(TokenType.SEMICOLON, "Expected ';' after expression body");

      return {
        kind: 'ExpressionFunctionBody',
        expression,
        range: [this.tokens[this.current - 3].start, this.previous().end],
      };
    }

    // Block body: { ... }
    return this.parseBlock();
  }

  private parseBlock(): CST.BlockFunctionBody {
    const start = this.consume(TokenType.LEFT_BRACE, "Expected '{'");
    const statements: CST.Statement[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }

    const end = this.consume(TokenType.RIGHT_BRACE, "Expected '}'");

    return {
      kind: 'BlockFunctionBody',
      statements,
      range: [start.start, end.end],
    };
  }

  private parseStatement(): CST.Statement {
    // Variable declaration
    if (this.check(TokenType.VAR) || this.check(TokenType.FINAL) ||
        this.check(TokenType.CONST) || this.check(TokenType.LATE)) {
      this.advance(); // Consume the keyword so previous() works
      return this.parseVariableDeclarationStatement();
    }

    // Control flow
    if (this.match(TokenType.IF)) {
      return this.parseIfStatement();
    }

    if (this.match(TokenType.FOR)) {
      return this.parseForStatement();
    }

    if (this.match(TokenType.WHILE)) {
      return this.parseWhileStatement();
    }

    if (this.match(TokenType.DO)) {
      return this.parseDoWhileStatement();
    }

    if (this.match(TokenType.SWITCH)) {
      return this.parseSwitchStatement();
    }

    if (this.match(TokenType.RETURN)) {
      return this.parseReturnStatement();
    }

    if (this.match(TokenType.BREAK)) {
      const keyword = this.previous();
      this.consume(TokenType.SEMICOLON, "Expected ';' after break");
      return {
        kind: 'BreakStatement',
        keyword,
        range: [keyword.start, this.previous().end],
      };
    }

    if (this.match(TokenType.CONTINUE)) {
      const keyword = this.previous();
      this.consume(TokenType.SEMICOLON, "Expected ';' after continue");
      return {
        kind: 'ContinueStatement',
        keyword,
        range: [keyword.start, this.previous().end],
      };
    }

    if (this.match(TokenType.TRY)) {
      return this.parseTryStatement();
    }

    if (this.match(TokenType.THROW)) {
      const keyword = this.previous();
      const expression = this.parseExpression();
      this.consume(TokenType.SEMICOLON, "Expected ';' after throw");
      return {
        kind: 'ThrowStatement',
        keyword,
        expression,
        range: [keyword.start, this.previous().end],
      };
    }

    // Expression statement
    const expression = this.parseExpression();
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression");

    return {
      kind: 'ExpressionStatement',
      expression,
      range: [expression.range[0], this.previous().end],
    };
  }

  private parseVariableDeclarationStatement(): CST.Statement {
    const modifiers: Token[] = [this.previous()];

    // Check for type annotation - use looksLikeTypeFollowedByName to distinguish
    // "final Type name = ..." from "final name = ..."
    let type: CST.TypeAnnotation | null = null;
    if (this.looksLikeTypeFollowedByName()) {
      type = this.parseType();
    }

    const name = this.consume(TokenType.IDENTIFIER, "Expected variable name");

    let initializer: CST.Expression | null = null;
    if (this.match(TokenType.EQUALS)) {
      initializer = this.parseExpression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");

    return {
      kind: 'VariableDeclarationStatement',
      modifiers,
      type,
      name,
      initializer,
      range: [modifiers[0].start, this.previous().end],
    };
  }

  private parseIfStatement(): CST.Statement {
    const keyword = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after condition");

    const thenBranch = this.parseStatement();

    let elseBranch: CST.Statement | null = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.parseStatement();
    }

    return {
      kind: 'IfStatement',
      keyword,
      condition,
      thenBranch,
      elseBranch,
      range: [keyword.start, elseBranch?.range[1] ?? thenBranch.range[1]],
    };
  }

  private parseForStatement(): CST.Statement {
    const keyword = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'");

    // For-in loop or C-style for loop
    // Need lookahead to distinguish

    const initializer = this.parseExpression();

    if (this.match(TokenType.IN)) {
      // For-in loop
      const iterable = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for-in");
      const body = this.parseStatement();

      return {
        kind: 'ForInStatement',
        keyword,
        variable: initializer,
        iterable,
        body,
        range: [keyword.start, body.range[1]],
      };
    }

    // C-style for loop
    this.consume(TokenType.SEMICOLON, "Expected ';' after initializer");

    let condition: CST.Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.parseExpression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after condition");

    let increment: CST.Expression | null = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.parseExpression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for clauses");

    const body = this.parseStatement();

    return {
      kind: 'ForStatement',
      keyword,
      initializer,
      condition,
      increment,
      body,
      range: [keyword.start, body.range[1]],
    };
  }

  private parseWhileStatement(): CST.Statement {
    const keyword = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after condition");
    const body = this.parseStatement();

    return {
      kind: 'WhileStatement',
      keyword,
      condition,
      body,
      range: [keyword.start, body.range[1]],
    };
  }

  private parseDoWhileStatement(): CST.Statement {
    const keyword = this.previous();
    const body = this.parseStatement();
    this.consume(TokenType.WHILE, "Expected 'while' after do body");
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after condition");
    this.consume(TokenType.SEMICOLON, "Expected ';' after do-while");

    return {
      kind: 'DoWhileStatement',
      keyword,
      body,
      condition,
      range: [keyword.start, this.previous().end],
    };
  }

  private parseSwitchStatement(): CST.Statement {
    const keyword = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'switch'");
    const expression = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after switch");

    const cases: CST.SwitchCase[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.CASE)) {
        const caseKeyword = this.previous();
        const caseExpression = this.parseExpression();
        this.consume(TokenType.COLON, "Expected ':' after case");

        const statements: CST.Statement[] = [];
        while (!this.check(TokenType.CASE) &&
          !this.check(TokenType.DEFAULT) &&
          !this.check(TokenType.RIGHT_BRACE)) {
          statements.push(this.parseStatement());
        }

        cases.push({
          kind: 'SwitchCase',
          keyword: caseKeyword,
          expression: caseExpression,
          statements,
          range: [caseKeyword.start, statements[statements.length - 1]?.range[1] ?? caseExpression.range[1]],
        });
      } else if (this.match(TokenType.DEFAULT)) {
        const defaultKeyword = this.previous();
        this.consume(TokenType.COLON, "Expected ':' after default");

        const statements: CST.Statement[] = [];
        while (!this.check(TokenType.CASE) &&
          !this.check(TokenType.DEFAULT) &&
          !this.check(TokenType.RIGHT_BRACE)) {
          statements.push(this.parseStatement());
        }

        cases.push({
          kind: 'SwitchCase',
          keyword: defaultKeyword,
          expression: null,
          statements,
          range: [defaultKeyword.start, statements[statements.length - 1]?.range[1] ?? defaultKeyword.end],
        });
      } else {
        this.advance();
      }
    }

    const closeBrace = this.consume(TokenType.RIGHT_BRACE, "Expected '}' after switch cases");

    return {
      kind: 'SwitchStatement',
      keyword,
      expression,
      cases,
      range: [keyword.start, closeBrace.end],
    };
  }

  private parseReturnStatement(): CST.Statement {
    const keyword = this.previous();

    let expression: CST.Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      expression = this.parseExpression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after return");

    return {
      kind: 'ReturnStatement',
      keyword,
      expression,
      range: [keyword.start, this.previous().end],
    };
  }

  private parseTryStatement(): CST.Statement {
    const keyword = this.previous();
    const body = this.parseBlock();

    const catchClauses: CST.CatchClause[] = [];
    while (this.match(TokenType.ON) || this.match(TokenType.CATCH)) {
      const onOrCatch = this.previous();

      let exceptionType: CST.TypeAnnotation | null = null;
      if (onOrCatch.type === TokenType.ON) {
        exceptionType = this.parseType();
      }

      let exceptionVar: Token | null = null;
      let stackTraceVar: Token | null = null;

      if (this.match(TokenType.CATCH)) {
        this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'catch'");
        exceptionVar = this.consume(TokenType.IDENTIFIER, "Expected exception variable");

        if (this.match(TokenType.COMMA)) {
          stackTraceVar = this.consume(TokenType.IDENTIFIER, "Expected stack trace variable");
        }

        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after catch parameters");
      }

      const catchBody = this.parseBlock();

      catchClauses.push({
        kind: 'CatchClause',
        exceptionType,
        exceptionVar,
        stackTraceVar,
        body: catchBody,
        range: [onOrCatch.start, catchBody.range[1]],
      });
    }

    let finallyClause: CST.BlockFunctionBody | null = null;
    if (this.match(TokenType.FINALLY)) {
      finallyClause = this.parseBlock();
    }

    return {
      kind: 'TryStatement',
      keyword,
      body,
      catchClauses,
      finallyClause,
      range: [keyword.start, finallyClause?.range[1] ?? catchClauses[catchClauses.length - 1]?.range[1] ?? body.range[1]],
    };
  }

  private parseParameterList(): CST.ParameterList {
    const start = this.consume(TokenType.LEFT_PAREN, "Expected '('");
    const parameters: CST.Parameter[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      // Required parameters
      do {
        if (this.check(TokenType.LEFT_BRACKET) || this.check(TokenType.LEFT_BRACE)) {
          break; // Optional/named parameters
        }

        parameters.push(this.parseParameter());
      } while (this.match(TokenType.COMMA));

      // Optional positional parameters: [...]
      if (this.match(TokenType.LEFT_BRACKET)) {
        do {
          parameters.push(this.parseParameter(true));
        } while (this.match(TokenType.COMMA));

        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after optional parameters");
      }

      // Named parameters: {...}
      if (this.match(TokenType.LEFT_BRACE)) {
        do {
          parameters.push(this.parseParameter(false, true));
        } while (this.match(TokenType.COMMA));

        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after named parameters");
      }
    }

    const end = this.consume(TokenType.RIGHT_PAREN, "Expected ')'");

    return {
      kind: 'ParameterList',
      parameters,
      range: [start.start, end.end],
    };
  }

  private parseParameter(isOptional: boolean = false, isNamed: boolean = false): CST.Parameter {
    const metadata = this.parseMetadata();

    let isRequired = false;
    if (this.match(TokenType.REQUIRED)) {
      isRequired = true;
    }

    let type: CST.TypeAnnotation | null = null;
    // Only try to parse type if it looks like a type followed by a name
    // This handles the ambiguity between "Type name" and just "name" in lambda expressions
    if (this.isType() && !this.check(TokenType.THIS) && !this.check(TokenType.SUPER)) {
      // Check if this is "Type name" pattern by looking ahead
      // If we see identifier followed by ) or , or =, it's just a name, not a type
      const savedCurrent = this.current;
      
      // Skip to after the potential type to see what follows
      this.advanceRaw();
      this.skipTriviaRaw();
      
      const nextToken = this.peek();
      const isJustName = nextToken.type === TokenType.RIGHT_PAREN || 
                        nextToken.type === TokenType.COMMA ||
                        nextToken.type === TokenType.EQUALS;
      
      this.current = savedCurrent;
      
      if (!isJustName) {
        type = this.parseType();
      }
    }

    // Handle this.name or super.name initializing formals
    let isThis = false;
    let isSuper = false;
    if (this.match(TokenType.THIS)) {
      isThis = true;
      this.consume(TokenType.DOT, "Expected '.' after 'this'");
    } else if (this.match(TokenType.SUPER)) {
      isSuper = true;
      this.consume(TokenType.DOT, "Expected '.' after 'super'");
    }

    const name = this.consume(TokenType.IDENTIFIER, "Expected parameter name");

    let defaultValue: CST.Expression | null = null;
    if (this.match(TokenType.EQUALS)) {
      defaultValue = this.parseExpression();
    }

    return {
      kind: 'Parameter',
      metadata,
      isRequired,
      isOptional,
      isNamed,
      isThis,
      isSuper,
      type,
      name,
      defaultValue,
      range: [metadata[0]?.range[0] ?? type?.range[0] ?? name.start, defaultValue?.range[1] ?? name.end],
    };
  }

  private parseTypeParameters(): CST.TypeParameterList {
    const start = this.consume(TokenType.LESS, "Expected '<'");
    const typeParameters: CST.TypeParameter[] = [];

    do {
      const name = this.consume(TokenType.IDENTIFIER, "Expected type parameter name");

      let bound: CST.TypeAnnotation | null = null;
      if (this.match(TokenType.EXTENDS)) {
        bound = this.parseType();
      }

      typeParameters.push({
        kind: 'TypeParameter',
        name,
        bound,
        range: [name.start, bound?.range[1] ?? name.end],
      });
    } while (this.match(TokenType.COMMA));

    const end = this.consume(TokenType.GREATER, "Expected '>'");

    return {
      kind: 'TypeParameterList',
      typeParameters,
      range: [start.start, end.end],
    };
  }

  private parseFunctionType(): CST.TypeName {
    const start = this.peek();

    let returnType: CST.TypeAnnotation | null = null;
    if (this.match(TokenType.VOID)) {
      returnType = {
        kind: 'TypeAnnotation',
        typeName: {
          kind: 'TypeName',
          parts: [this.previous()],
          range: [this.previous().start, this.previous().end],
        },
        typeArguments: null,
        isNullable: false,
        range: [this.previous().start, this.previous().end],
      };
    }

    this.consume(TokenType.FUNCTION, "Expected 'Function'");

    let typeParameters: CST.TypeParameterList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
      typeParameters = this.parseTypeParameters();
    }

    // For function types, parameter names are optional - just parse types
    let parameters: CST.FunctionTypeParameterList | null = null;
    if (this.check(TokenType.LEFT_PAREN)) {
      parameters = this.parseFunctionTypeParameterList();
    }

    return {
      kind: 'FunctionTypeName',
      returnType,
      typeParameters,
      parameters,
      range: [start.start, parameters?.range[1] ?? typeParameters?.range[1] ?? this.previous().end],
    } as any;
  }

  // Parse function type parameters (just types, names optional)
  private parseFunctionTypeParameterList(): CST.FunctionTypeParameterList {
    const start = this.consume(TokenType.LEFT_PAREN, "Expected '('");
    const parameters: CST.FunctionTypeParameter[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        // Handle named parameters: {Type name, ...}
        if (this.match(TokenType.LEFT_BRACE)) {
          while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            let isRequired = false;
            if (this.match(TokenType.REQUIRED)) {
              isRequired = true;
            }
            const type = this.parseType();
            let name: Token | null = null;
            if (this.check(TokenType.IDENTIFIER)) {
              name = this.advance();
            }
            parameters.push({
              kind: 'FunctionTypeParameter',
              type,
              name,
              isNamed: true,
              isRequired,
              range: [type.range[0], name?.end ?? type.range[1]],
            });
            if (!this.match(TokenType.COMMA)) break;
          }
          this.consume(TokenType.RIGHT_BRACE, "Expected '}'");
          break;
        }

        // Handle optional positional parameters: [Type name, ...]
        if (this.match(TokenType.LEFT_BRACKET)) {
          while (!this.check(TokenType.RIGHT_BRACKET) && !this.isAtEnd()) {
            const type = this.parseType();
            let name: Token | null = null;
            if (this.check(TokenType.IDENTIFIER)) {
              name = this.advance();
            }
            parameters.push({
              kind: 'FunctionTypeParameter',
              type,
              name,
              isOptional: true,
              range: [type.range[0], name?.end ?? type.range[1]],
            });
            if (!this.match(TokenType.COMMA)) break;
          }
          this.consume(TokenType.RIGHT_BRACKET, "Expected ']'");
          break;
        }

        // Regular positional parameter (just type, name optional)
        const type = this.parseType();
        let name: Token | null = null;
        // Check if next token is identifier (name) followed by comma or )
        if (this.check(TokenType.IDENTIFIER) && 
            (this.peekNext()?.type === TokenType.COMMA || 
             this.peekNext()?.type === TokenType.RIGHT_PAREN)) {
          name = this.advance();
        }
        parameters.push({
          kind: 'FunctionTypeParameter',
          type,
          name,
          range: [type.range[0], name?.end ?? type.range[1]],
        });
      } while (this.match(TokenType.COMMA));
    }

    const end = this.consume(TokenType.RIGHT_PAREN, "Expected ')'");

    return {
      kind: 'FunctionTypeParameterList',
      parameters,
      range: [start.start, end.end],
    };
  }

  // Peek at next non-trivia token (one ahead of current)
  private peekNext(): Token | null {
    let next = this.current + 1;
    while (next < this.tokens.length) {
      const token = this.tokens[next];
      if (token.type !== TokenType.WHITESPACE && 
          token.type !== TokenType.NEWLINE && 
          token.type !== TokenType.COMMENT &&
          token.type !== TokenType.DOC_COMMENT) {
        return token;
      }
      next++;
    }
    return null;
  }

  // Expression parsing helpers
  private parseConditional(condition: CST.Expression): CST.Expression {
    this.advance(); // consume ?
    const thenExpr = this.parseExpression();
    this.consume(TokenType.COLON, "Expected ':' in conditional expression");
    const elseExpr = this.parseExpression();

    return {
      kind: 'ConditionalExpression',
      condition,
      thenExpression: thenExpr,
      elseExpression: elseExpr,
      range: [condition.range[0], elseExpr.range[1]],
    };
  }

  private parseMemberAccess(target: CST.Expression): CST.Expression {
    console.log('Parsing member access for target:', target);
    const operator = this.advance();
    const propertyName = this.consume(TokenType.IDENTIFIER, "Expected property name");

    // Check if this is a method call: target.method()
    if (this.check(TokenType.LEFT_PAREN)) {
      const arguments_ = this.parseArgumentList();
      return {
        kind: 'MethodInvocation',
        target,
        methodName: propertyName,
        arguments: arguments_,
        range: [target.range[0], arguments_.range[1]],
      };
    }

    return {
      kind: 'PropertyAccess',
      target,
      operator,
      propertyName,
      range: [target.range[0], propertyName.end],
    };
  }

  private parseFunctionCall(target: CST.Expression): CST.Expression {
    const arguments_ = this.parseArgumentList();

    return {
      kind: 'FunctionCall',
      target,
      arguments: arguments_,
      range: [target.range[0], arguments_.range[1]],
    };
  }

  private parseIndexAccess(target: CST.Expression): CST.Expression {
    this.advance(); // consume [
    const index = this.parseExpression();
    const closeBracket = this.consume(TokenType.RIGHT_BRACKET, "Expected ']'");

    return {
      kind: 'IndexExpression',
      target,
      index,
      range: [target.range[0], closeBracket.end],
    };
  }

  private parseArgumentList(): CST.ArgumentList {
    const start = this.consume(TokenType.LEFT_PAREN, "Expected '('");
    const args: CST.Argument[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(this.parseArgument());
      } while (this.match(TokenType.COMMA));
    }

    const end = this.consume(TokenType.RIGHT_PAREN, "Expected ')'");

    return {
      kind: 'ArgumentList',
      arguments: args,
      range: [start.start, end.end],
    };
  }

  private parseArgument(): CST.Argument {
    // Check for named argument: identifier ':'
    if (this.check(TokenType.IDENTIFIER)) {
      const saved = this.current;
      const name = this.advance();
      this.skipTrivia();
      
      if (this.check(TokenType.COLON)) {
        this.advance(); // consume ':'
        this.skipTrivia();
        const value = this.parseExpression();
        return {
          kind: 'NamedArgument',
          name,
          value,
          range: [name.start, value.range[1]],
        };
      }
      
      // Not a named argument, backtrack
      this.current = saved;
    }
    
    // Positional argument
    const expression = this.parseExpression();
    return {
      kind: 'PositionalArgument',
      expression,
      range: expression.range,
    };
  }

  // Literal parsing methods
  
  /**
   * Parse a list literal: [elements]
   * Supports: expressions, spreads (...), if elements, for elements
   */
  private parseListLiteral(): CST.Expression {
    // Optional const keyword (handled at call site typically, but check here too)
    let constKeyword: Token | null = null;
    if (this.check(TokenType.CONST)) {
      constKeyword = this.advance();
    }

    // Optional type arguments: <T>
    let typeArguments: CST.TypeArgumentList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeArguments()) {
      typeArguments = this.parseTypeArguments();
    }

    const openBracket = this.consume(TokenType.LEFT_BRACKET, "Expected '['");
    const elements: CST.CollectionElement[] = [];

    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        // Skip trailing comma case
        if (this.check(TokenType.RIGHT_BRACKET)) break;
        elements.push(this.parseCollectionElement());
      } while (this.match(TokenType.COMMA));
    }

    const closeBracket = this.consume(TokenType.RIGHT_BRACKET, "Expected ']'");

    return {
      kind: 'ListLiteral',
      constKeyword,
      typeArguments,
      openBracket,
      closeBracket,
      elements,
      range: [constKeyword?.start ?? typeArguments?.range[0] ?? openBracket.start, closeBracket.end],
    };
  }

  /**
   * Parse a set or map literal: {elements}
   * During parsing, this produces a SetOrMapLiteral node.
   * Resolution to Set or Map happens in semantic analysis.
   * 
   * Resolution rules:
   * 1. Type arguments: <T>{} = Set, <K,V>{} = Map
   * 2. Elements: MapEntryElement present = Map, otherwise = Set
   * 3. Spreads only: resolved by spread source types
   * 4. Empty {}: context type, or default to Map<dynamic, dynamic>
   */
  private parseMapOrSetLiteral(): CST.Expression {
    // Optional const keyword
    let constKeyword: Token | null = null;
    if (this.check(TokenType.CONST)) {
      constKeyword = this.advance();
    }

    // Optional type arguments
    let typeArguments: CST.TypeArgumentList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeArguments()) {
      typeArguments = this.parseTypeArguments();
    }

    const openBrace = this.consume(TokenType.LEFT_BRACE, "Expected '{'");
    const elements: CST.CollectionElement[] = [];

    // Empty literal: {}
    if (this.check(TokenType.RIGHT_BRACE)) {
      const closeBrace = this.advance();
      return {
        kind: 'SetOrMapLiteral',
        constKeyword,
        typeArguments,
        openBrace,
        closeBrace,
        elements: [],
        range: [constKeyword?.start ?? typeArguments?.range[0] ?? openBrace.start, closeBrace.end],
      };
    }

    // Parse elements - could be set elements, map entries, or control flow
    do {
      // Skip trailing comma case
      if (this.check(TokenType.RIGHT_BRACE)) break;
      elements.push(this.parseSetOrMapElement());
    } while (this.match(TokenType.COMMA));

    const closeBrace = this.consume(TokenType.RIGHT_BRACE, "Expected '}'");

    return {
      kind: 'SetOrMapLiteral',
      constKeyword,
      typeArguments,
      openBrace,
      closeBrace,
      elements,
      range: [constKeyword?.start ?? typeArguments?.range[0] ?? openBrace.start, closeBrace.end],
    };
  }

  /**
   * Parse a collection element (for lists).
   * Can be: expression, spread, if-element, or for-element
   */
  private parseCollectionElement(): CST.CollectionElement {
    // Spread: ... or ...?
    if (this.check(TokenType.DOT_DOT_DOT)) {
      return this.parseSpreadElement();
    }

    // If element: if (condition) element [else element]
    if (this.check(TokenType.IF)) {
      return this.parseIfElement();
    }

    // For element: for (... in ...) element or for (...;...;...) element
    if (this.check(TokenType.FOR)) {
      return this.parseForElement();
    }

    // Plain expression element
    const expression = this.parseExpression();
    return {
      kind: 'ExpressionElement',
      expression,
      range: expression.range,
    };
  }

  /**
   * Parse a set or map element.
   * Can be: map entry (key: value), expression, spread, if-element, or for-element
   */
  private parseSetOrMapElement(): CST.CollectionElement {
    // Spread: ... or ...?
    if (this.check(TokenType.DOT_DOT_DOT)) {
      return this.parseSpreadElement();
    }

    // If element: if (condition) element [else element]
    if (this.check(TokenType.IF)) {
      return this.parseIfElementForSetOrMap();
    }

    // For element: for (... in ...) element or for (...;...;...) element
    if (this.check(TokenType.FOR)) {
      return this.parseForElementForSetOrMap();
    }

    // Could be map entry (key: value) or set element (expression)
    // Parse expression first, then check for colon
    const expression = this.parseExpression();

    if (this.check(TokenType.COLON)) {
      // Map entry: key: value
      const colonToken = this.advance();
      const value = this.parseExpression();
      return {
        kind: 'MapEntryElement',
        key: expression,
        colonToken,
        value,
        range: [expression.range[0], value.range[1]],
      };
    }

    // Plain expression element (set element)
    return {
      kind: 'ExpressionElement',
      expression,
      range: expression.range,
    };
  }

  /**
   * Parse spread element: ...expr or ...?expr
   */
  private parseSpreadElement(): CST.SpreadElement {
    const spreadOperator = this.consume(TokenType.DOT_DOT_DOT, "Expected '...'");
    
    // Check for null-aware spread: ...?
    const isNullAware = this.match(TokenType.QUESTION);
    
    const expression = this.parseExpression();
    return {
      kind: 'SpreadElement',
      spreadOperator,
      isNullAware,
      expression,
      range: [spreadOperator.start, expression.range[1]],
    };
  }

  /**
   * Parse if element for list: if (condition) element [else element]
   */
  private parseIfElement(): CST.IfElement {
    const ifKeyword = this.consume(TokenType.IF, "Expected 'if'");
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");

    const thenElement = this.parseCollectionElement();

    let elseKeyword: Token | null = null;
    let elseElement: CST.CollectionElement | null = null;

    if (this.check(TokenType.ELSE)) {
      elseKeyword = this.advance();
      elseElement = this.parseCollectionElement();
    }

    return {
      kind: 'IfElement',
      ifKeyword,
      condition,
      thenElement,
      elseKeyword,
      elseElement,
      range: [ifKeyword.start, elseElement?.range[1] ?? thenElement.range[1]],
    };
  }

  /**
   * Parse if element for set/map: if (condition) element [else element]
   * Elements can be map entries or set elements
   */
  private parseIfElementForSetOrMap(): CST.IfElement {
    const ifKeyword = this.consume(TokenType.IF, "Expected 'if'");
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");

    const thenElement = this.parseSetOrMapElement();

    let elseKeyword: Token | null = null;
    let elseElement: CST.CollectionElement | null = null;

    if (this.check(TokenType.ELSE)) {
      elseKeyword = this.advance();
      elseElement = this.parseSetOrMapElement();
    }

    return {
      kind: 'IfElement',
      ifKeyword,
      condition,
      thenElement,
      elseKeyword,
      elseElement,
      range: [ifKeyword.start, elseElement?.range[1] ?? thenElement.range[1]],
    };
  }

  /**
   * Parse for element for list: for (var x in iterable) element
   * or: for (init; condition; increment) element
   */
  private parseForElement(): CST.ForElement {
    const forKeyword = this.consume(TokenType.FOR, "Expected 'for'");
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'");

    // Determine if for-in or C-style for
    const forParts = this.parseForElementParts();
    
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for parts");

    const body = this.parseCollectionElement();

    return {
      kind: 'ForElement',
      forKeyword,
      ...forParts,
      body,
      range: [forKeyword.start, body.range[1]],
    };
  }

  /**
   * Parse for element for set/map
   */
  private parseForElementForSetOrMap(): CST.ForElement {
    const forKeyword = this.consume(TokenType.FOR, "Expected 'for'");
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'");

    const forParts = this.parseForElementParts();
    
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for parts");

    const body = this.parseSetOrMapElement();

    return {
      kind: 'ForElement',
      forKeyword,
      ...forParts,
      body,
      range: [forKeyword.start, body.range[1]],
    };
  }

  /**
   * Parse the parts inside for(...) - either for-in or C-style
   */
  private parseForElementParts(): {
    loopVariable: CST.ForLoopVariable | null;
    iterable: CST.Expression | null;
    initializer: CST.Expression | null;
    condition: CST.Expression | null;
    increment: CST.Expression | null;
  } {
    // Check for for-in pattern: [var|final|Type] identifier in expr
    const savedPosition = this.current;

    // Try to parse as for-in
    let keyword: Token | null = null;
    let varType: CST.TypeAnnotation | null = null;

    if (this.match(TokenType.VAR, TokenType.FINAL)) {
      keyword = this.previous();
    } else if (this.looksLikeTypeFollowedByName()) {
      varType = this.parseType();
    }

    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance();
      
      if (this.match(TokenType.IN)) {
        // It's a for-in loop
        const iterable = this.parseExpression();
        return {
          loopVariable: {
            kind: 'ForLoopVariable',
            keyword,
            type: varType,
            name,
            range: [keyword?.start ?? varType?.range[0] ?? name.start, name.end],
          },
          iterable,
          initializer: null,
          condition: null,
          increment: null,
        };
      }
    }

    // Not a for-in, reset and parse C-style for
    this.current = savedPosition;

    // C-style for: for (init; condition; increment)
    let initializer: CST.Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      initializer = this.parseExpression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' in for loop");

    let condition: CST.Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.parseExpression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' in for loop");

    let increment: CST.Expression | null = null;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      increment = this.parseExpression();
    }

    return {
      loopVariable: null,
      iterable: null,
      initializer,
      condition,
      increment,
    };
  }

  private parseFunctionExpression(): CST.Expression {
    let typeParameters: CST.TypeParameterList | null = null;
    if (this.check(TokenType.LESS) && this.looksLikeTypeParameters()) {
      typeParameters = this.parseTypeParameters();
    }

    const parameters = this.parseParameterList();

    let body: CST.FunctionBody;
    if (this.match(TokenType.ARROW)) {
      const expression = this.parseExpression();
      body = {
        kind: 'ExpressionFunctionBody',
        expression,
        range: [this.tokens[this.current - 2].start, expression.range[1]],
      };
    } else {
      body = this.parseBlock();
    }

    return {
      kind: 'FunctionExpression',
      typeParameters,
      parameters,
      body,
      range: [typeParameters?.range[0] ?? parameters.range[0], body.range[1]],
    };
  }

  private looksLikeFunctionExpression(): boolean {
    // Try to determine if () starts a function expression or grouped expression
    // Function expressions: () => expr, () { ... }, (x) => x + 1, (Type x) { ... }
    // Grouped expressions: (x + y)

    const savedCurrent = this.current;

    try {
      this.advance(); // consume (
      this.skipTrivia();

      // Empty parens: () => expr or () { }
      if (this.check(TokenType.RIGHT_PAREN)) {
        this.advance();
        this.skipTrivia();
        const result = this.check(TokenType.ARROW) || this.check(TokenType.LEFT_BRACE);
        this.current = savedCurrent;
        return result;
      }

      // Check if it looks like parameter list
      // Parameters have type annotations or names followed by , or )
      // Expressions are more complex

      // Simple heuristic: if we see => or { after matching ), it's a function
      let depth = 1;
      while (depth > 0 && !this.isAtEnd()) {
        if (this.check(TokenType.LEFT_PAREN)) {
          depth++;
        } else if (this.check(TokenType.RIGHT_PAREN)) {
          depth--;
          if (depth === 0) {
            this.advance();
            this.skipTrivia(); // Skip whitespace before checking for => or {
            const result = this.check(TokenType.ARROW) || this.check(TokenType.LEFT_BRACE) || this.check(TokenType.ASYNC);
            this.current = savedCurrent;
            return result;
          }
        }
        this.advance();
      }

      this.current = savedCurrent;
      return false;

    } catch (e) {
      this.current = savedCurrent;
      return false;
    }
  }

  // Directive parsing
  private parseDirective(): CST.Directive {
    const keyword = this.advance();

    if (keyword.type === TokenType.IMPORT || keyword.type === TokenType.EXPORT) {
      const uri = this.consume(TokenType.STRING, "Expected URI string");

      // Optional: as prefix / show / hide
      let asPrefix: Token | null = null;
      let combinators: CST.Combinator[] = [];

      if (this.match(TokenType.AS)) {
        asPrefix = this.consume(TokenType.IDENTIFIER, "Expected prefix identifier");
      }

      while (this.check(TokenType.SHOW) || this.check(TokenType.HIDE)) {
        const combinatorType = this.advance();
        const identifiers: Token[] = [];

        identifiers.push(this.consume(TokenType.IDENTIFIER, "Expected identifier"));
        while (this.match(TokenType.COMMA)) {
          identifiers.push(this.consume(TokenType.IDENTIFIER, "Expected identifier"));
        }

        combinators.push({
          kind: combinatorType.type === TokenType.SHOW ? 'ShowCombinator' : 'HideCombinator',
          identifiers,
          range: [combinatorType.start, identifiers[identifiers.length - 1].end],
        });
      }

      this.consume(TokenType.SEMICOLON, "Expected ';' after directive");

      return {
        kind: keyword.type === TokenType.IMPORT ? 'ImportDirective' : 'ExportDirective',
        keyword,
        uri,
        asPrefix,
        combinators,
        range: [keyword.start, this.previous().end],
      };
    }

    if (keyword.type === TokenType.PART) {
      const uri = this.consume(TokenType.STRING, "Expected URI string");
      this.consume(TokenType.SEMICOLON, "Expected ';' after part directive");

      return {
        kind: 'PartDirective',
        keyword,
        uri,
        range: [keyword.start, this.previous().end],
      };
    }

    if (keyword.type === TokenType.LIBRARY) {
      const name: Token[] = [];
      name.push(this.consume(TokenType.IDENTIFIER, "Expected library name"));

      while (this.match(TokenType.DOT)) {
        name.push(this.consume(TokenType.IDENTIFIER, "Expected identifier after '.'"));
      }

      this.consume(TokenType.SEMICOLON, "Expected ';' after library directive");

      return {
        kind: 'LibraryDirective',
        keyword,
        name,
        range: [keyword.start, this.previous().end],
      };
    }

    throw this.error(keyword, "Expected import, export, part, or library directive");
  }

  private parseMetadata(): CST.Metadata[] {
    const metadata: CST.Metadata[] = [];

    while (this.match(TokenType.AT)) {
      const at = this.previous();
      const name = this.consume(TokenType.IDENTIFIER, "Expected annotation name");

      // Optional constructor call: @override() or @Deprecated('message')
      let arguments_: CST.ArgumentList | null = null;
      if (this.match(TokenType.LEFT_PAREN)) {
        arguments_ = this.parseArgumentList();
      }

      metadata.push({
        kind: 'Metadata',
        at,
        name,
        arguments: arguments_,
        range: [at.start, arguments_?.range[1] ?? name.end],
      });
    }

    return metadata;
  }
}

interface ParseContext {
  allowTypes: boolean;      // Are type annotations allowed here?
  inTypeContext: boolean;   // Currently parsing a type
  inDeclaration: boolean;   // Inside a declaration (class, function, etc.)
  inCascade: boolean;       // Inside a cascade sequence
}

interface ParseError {
  message: string;
  token: Token;
  expected?: TokenType[];
}
