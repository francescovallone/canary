export enum TokenType {
  // Literals
  IDENTIFIER,
  STRING,
  STRING_INTERPOLATION_START,  // ${
  STRING_INTERPOLATION_END,    // }
  NUMBER,
  
  // Keywords (contextual and reserved)
  ABSTRACT, AS, ASSERT, ASYNC, AWAIT,
  BREAK, CASE, CATCH, CLASS, CONST, CONTINUE,
  DEFAULT, DEFERRED, DO, DYNAMIC,
  ELSE, ENUM, EXPORT, EXTENDS, EXTENSION, EXTERNAL,
  FACTORY, FALSE, FINAL, FINALLY, FOR, FUNCTION,
  GET, HIDE, IF, IMPLEMENTS, IMPORT, IN, INTERFACE, IS,
  LATE, LIBRARY,
  MIXIN,
  NATIVE, NEW, NULL,
  OF, ON, OPERATOR,
  PART,
  REQUIRED, RETHROW, RETURN,
  SET, SHOW, STATIC, SUPER, SWITCH, SYNC,
  THIS, THROW, TRUE, TRY, TYPEDEF,
  VAR, VOID,
  WHILE, WITH,
  YIELD,
  
  // Multi-character operators (CRITICAL - order matters for maximal munch)
  DOT_DOT_DOT,        // ...
  QUESTION_DOT_DOT,   // ?..
  DOT_DOT,            // ..
  QUESTION_DOT,       // ?.
  QUESTION_QUESTION_EQUALS, // ??=
  QUESTION_QUESTION,  // ??
  ARROW,              // =>
  TILDE_SLASH,        // ~/
  TILDE_SLASH_EQUALS, // ~/=
  
  LEFT_SHIFT_EQUALS,  // <<=
  RIGHT_SHIFT_EQUALS, // >>=
  TRIPLE_RIGHT_SHIFT_EQUALS, // >>>=
  LEFT_SHIFT,         // 
  RIGHT_SHIFT,        // >>
  TRIPLE_RIGHT_SHIFT, // >>>
  
  LESS_EQUALS,        // <=
  GREATER_EQUALS,     // >=
  EQUALS_EQUALS,      // ==
  BANG_EQUALS,        // !=
  
  AMPERSAND_AMPERSAND, // &&
  PIPE_PIPE,          // ||
  
  PLUS_PLUS,          // ++
  MINUS_MINUS,        // --
  PLUS_EQUALS,        // +=
  MINUS_EQUALS,       // -=
  STAR_EQUALS,        // *=
  SLASH_EQUALS,       // /=
  PERCENT_EQUALS,     // %=
  AMPERSAND_EQUALS,   // &=
  PIPE_EQUALS,        // |=
  CARET_EQUALS,       // ^=
  
  // Single-character operators
  LEFT_PAREN,    // (
  RIGHT_PAREN,   // )
  LEFT_BRACE,    // {
  RIGHT_BRACE,   // }
  LEFT_BRACKET,  // [
  RIGHT_BRACKET, // ]
  SEMICOLON,     // ;
  COMMA,         // ,
  DOT,           // .
  QUESTION,      // ?
  COLON,         // :
  TILDE,         // ~
  BANG,          // !
  EQUALS,        // =
  LESS,          // <  (NOT generics - parser handles that)
  GREATER,       // >  (NOT generics - parser handles that)
  PLUS,          // +
  MINUS,         // -
  STAR,          // *
  SLASH,         // /
  PERCENT,       // %
  AMPERSAND,     // &
  PIPE,          // |
  CARET,         // ^
  AT,            // @
  HASH,          // #
  
  // Comments
  COMMENT,
  DOC_COMMENT,
  
  // Special
  WHITESPACE,
  NEWLINE,
  EOF,
  ERROR,
}

export interface Token {
  type: TokenType;
  lexeme: string;
  start: number;
  end: number;
  line: number;
  column: number;
  
  // For string interpolation
  interpolations?: Token[][];
}

export class DartLexer {
  private source: string;
  private start: number = 0;    // Start of current token
  private current: number = 0;  // Current position
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor() {
    this.source = '';
  }
  
  tokenize(source: string): Token[] {
    this.source = source;
    this.start = 0;
    this.current = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];

    while (!this.isAtEnd()) {
      this.start = this.current;
      const token = this.scanToken();
      if (token) this.tokens.push(token);
    }
    
    this.tokens.push(this.makeToken(TokenType.EOF, ''));
    return this.tokens;
  }
  
  private scanToken(interpolationStart?: number): Token | null {
    const c = this.advance();
    
    // Whitespace - skip but track position
    if (this.isWhitespace(c)) {
      return this.whitespace();
    }
    
    // Newlines - track line numbers
    if (c === '\n') {
      this.line++;
      this.column = 1;
      return null; // Or return as NEWLINE token if needed
    }
    
    // Comments
    if (c === '/') {
      return this.slash();
    }
    
    // Strings
    if (c === '"' || c === "'") {
      return this.string(c);
    }
    
    // Raw strings
    if (c === 'r' && (this.peek() === '"' || this.peek() === "'")) {
      return this.rawString();
    }
    
    // Numbers
    if (this.isDigit(c)) {
      return this.number();
    }
    
    // Special case: .5 or .digits
    if (c === '.' && this.isDigit(this.peek())) {
      return this.number();
    }
    
    // Identifiers and keywords
    if (this.isAlpha(c) || c === '_' || c === '$') {
      return this.identifier(interpolationStart);
    }
    
    // Operators and punctuation
    return this.operator(c);
  }

  private operator(first: string): Token {
    // The key: try longest matches first, fall back to shorter
    
    switch (first) {
      case '.':
        if (this.match('.')) {
          if (this.match('.')) {
            return this.makeToken(TokenType.DOT_DOT_DOT, '...');
          }
          return this.makeToken(TokenType.DOT_DOT, '..');
        }
        return this.makeToken(TokenType.DOT, '.');
      
      case '?':
        if (this.match('.')) {
          if (this.match('.')) {
            return this.makeToken(TokenType.QUESTION_DOT_DOT, '?..');
          }
          return this.makeToken(TokenType.QUESTION_DOT, '?.');
        }
        if (this.match('?')) {
          if (this.match('=')) {
            return this.makeToken(TokenType.QUESTION_QUESTION_EQUALS, '??=');
          }
          return this.makeToken(TokenType.QUESTION_QUESTION, '??');
        }
        return this.makeToken(TokenType.QUESTION, '?');
      
      case '=':
        if (this.match('=')) {
          return this.makeToken(TokenType.EQUALS_EQUALS, '==');
        }
        if (this.match('>')) {
          return this.makeToken(TokenType.ARROW, '=>');
        }
        return this.makeToken(TokenType.EQUALS, '=');
      
      case '<':
        if (this.match('<')) {
          if (this.match('=')) {
            return this.makeToken(TokenType.LEFT_SHIFT_EQUALS, '<<=');
          }
          return this.makeToken(TokenType.LEFT_SHIFT, '<<');
        }
        if (this.match('=')) {
          return this.makeToken(TokenType.LESS_EQUALS, '<=');
        }
        // CRITICAL: Just emit LESS, let parser handle generics
        return this.makeToken(TokenType.LESS, '<');
      
      case '>':
        if (this.match('>')) {
          if (this.match('>')) {
            if (this.match('=')) {
              return this.makeToken(TokenType.TRIPLE_RIGHT_SHIFT_EQUALS, '>>>=');
            }
            return this.makeToken(TokenType.TRIPLE_RIGHT_SHIFT, '>>>');
          }
          if (this.match('=')) {
            return this.makeToken(TokenType.RIGHT_SHIFT_EQUALS, '>>=');
          }
          return this.makeToken(TokenType.RIGHT_SHIFT, '>>');
        }
        if (this.match('=')) {
          return this.makeToken(TokenType.GREATER_EQUALS, '>=');
        }
        // CRITICAL: Just emit GREATER, let parser handle generics
        return this.makeToken(TokenType.GREATER, '>');
      
      case '~':
        if (this.match('/')) {
          if (this.match('=')) {
            return this.makeToken(TokenType.TILDE_SLASH_EQUALS, '~/=');
          }
          return this.makeToken(TokenType.TILDE_SLASH, '~/');
        }
        return this.makeToken(TokenType.TILDE, '~');
      
      case '!':
        if (this.match('=')) {
          return this.makeToken(TokenType.BANG_EQUALS, '!=');
        }
        return this.makeToken(TokenType.BANG, '!');
      
      case '&':
        if (this.match('&')) {
          return this.makeToken(TokenType.AMPERSAND_AMPERSAND, '&&');
        }
        if (this.match('=')) {
          return this.makeToken(TokenType.AMPERSAND_EQUALS, '&=');
        }
        return this.makeToken(TokenType.AMPERSAND, '&');
      
      case '|':
        if (this.match('|')) {
          return this.makeToken(TokenType.PIPE_PIPE, '||');
        }
        if (this.match('=')) {
          return this.makeToken(TokenType.PIPE_EQUALS, '|=');
        }
        return this.makeToken(TokenType.PIPE, '|');
      
      case '+':
        if (this.match('+')) {
          return this.makeToken(TokenType.PLUS_PLUS, '++');
        }
        if (this.match('=')) {
          return this.makeToken(TokenType.PLUS_EQUALS, '+=');
        }
        return this.makeToken(TokenType.PLUS, '+');
      
      case '-':
        if (this.match('-')) {
          return this.makeToken(TokenType.MINUS_MINUS, '--');
        }
        if (this.match('=')) {
          return this.makeToken(TokenType.MINUS_EQUALS, '-=');
        }
        return this.makeToken(TokenType.MINUS, '-');
      
      case '*':
        if (this.match('=')) {
          return this.makeToken(TokenType.STAR_EQUALS, '*=');
        }
        return this.makeToken(TokenType.STAR, '*');
      
      case '%':
        if (this.match('=')) {
          return this.makeToken(TokenType.PERCENT_EQUALS, '%=');
        }
        return this.makeToken(TokenType.PERCENT, '%');
      
      case '^':
        if (this.match('=')) {
          return this.makeToken(TokenType.CARET_EQUALS, '^=');
        }
        return this.makeToken(TokenType.CARET, '^');
      
      // Single-character operators
      case '(': return this.makeToken(TokenType.LEFT_PAREN, '(');
      case ')': return this.makeToken(TokenType.RIGHT_PAREN, ')');
      case '{': return this.makeToken(TokenType.LEFT_BRACE, '{');
      case '}': return this.makeToken(TokenType.RIGHT_BRACE, '}');
      case '[': return this.makeToken(TokenType.LEFT_BRACKET, '[');
      case ']': return this.makeToken(TokenType.RIGHT_BRACKET, ']');
      case ';': return this.makeToken(TokenType.SEMICOLON, ';');
      case ',': return this.makeToken(TokenType.COMMA, ',');
      case ':': return this.makeToken(TokenType.COLON, ':');
      case '@': return this.makeToken(TokenType.AT, '@');
      case '#': return this.makeToken(TokenType.HASH, '#');
      
      default:
        return this.makeToken(TokenType.ERROR, first);
    }
  }

  private slash(): Token {
    if (this.match('/')) {
      // Single-line comment
      const isDocComment = this.match('/');
      
      // Consume until end of line
      while (this.peek() !== '\n' && !this.isAtEnd()) {
        this.advance();
      }
      
      const type = isDocComment ? TokenType.DOC_COMMENT : TokenType.COMMENT;
      return this.makeToken(type, this.source.substring(this.start, this.current));
    }
    
    if (this.match('*')) {
      // Multi-line comment
      const isDocComment = this.match('*');
      
      // Consume until */
      while (!this.isAtEnd()) {
        if (this.peek() === '*' && this.peekNext() === '/') {
          this.advance(); // consume *
          this.advance(); // consume /
          break;
        }
        if (this.peek() === '\n') {
          this.line++;
          this.column = 0;
        }
        this.advance();
      }
      
      const type = isDocComment ? TokenType.DOC_COMMENT : TokenType.COMMENT;
      return this.makeToken(type, this.source.substring(this.start, this.current));
    }
    
    // Just a division operator
    if (this.match('=')) {
      return this.makeToken(TokenType.SLASH_EQUALS, '/=');
    }
    return this.makeToken(TokenType.SLASH, '/');
  }

  private string(quote: string): Token {
    // Check for multiline strings (''' or """) by peeking ahead
    // Don't consume yet - only consume if it's truly multiline
    const isMultiline = this.peek() === quote && this.peekNext() === quote;
    if (isMultiline) {
      this.advance(); // consume second quote
      this.advance(); // consume third quote
    }
    const endPattern = isMultiline ? quote + quote + quote : quote;
    
    const interpolations: Token[][] = [];
    while (!this.isAtEnd()) {
      // Check for end
      if (this.matchSequence(endPattern)) {
        break;
      }
      
      // Check for interpolation
      if (this.peek() === '$') {
        this.advance(); // consume $
        const start = this.current
        if (this.peek() === '{') {
          // ${expression} - need to tokenize the expression
          this.advance(); // consume {
          const exprTokens = this.scanInterpolation(start + 1);
          interpolations.push(exprTokens);
          continue;
        } else if (this.isAlpha(this.peek()) || this.peek() === '_') {
          // $identifier - simple form
          const ident = this.identifier(start);
          interpolations.push([ident]);
          continue;
        }
      }
      
      // Check for escape sequences
      if (this.peek() === '\\') {
        this.advance(); // consume \
        if (!this.isAtEnd()) {
          this.advance(); // consume escaped char
        }
        continue;
      }
      
      // Handle newlines in multiline strings
      if (this.peek() === '\n') {
        if (!isMultiline) {
          return this.makeToken(TokenType.ERROR, 'Unterminated string');
        }
        this.line++;
        this.column = 0;
      }
      
      this.advance();
    }
    
    const token = this.makeToken(TokenType.STRING, this.source.substring(this.start, this.current));
    if (interpolations.length > 0) {
      token.interpolations = interpolations;
    }
    return token;
  }

  private scanInterpolation(startInterpolation: number): Token[] {
    const tokens: Token[] = [];
    let braceDepth = 1;

    while (!this.isAtEnd() && braceDepth > 0) {
      const token = this.scanToken(startInterpolation);
      if (!token) continue;

      if (token.lexeme === '{') {
        braceDepth++;
      } else if (token.lexeme === '}') {
        braceDepth--;
        if (braceDepth === 0) break;
      }

      tokens.push(token);
    }
    return tokens;
  }

  private rawString(): Token {
    this.advance(); // consume 'r'
    const quote = this.advance(); // consume ' or "
    
    const isMultiline = this.match(quote) && this.match(quote);
    const endPattern = isMultiline ? quote + quote + quote : quote;
    
    // Raw strings have no escape sequences or interpolation
    while (!this.isAtEnd()) {
      if (this.matchSequence(endPattern)) {
        break;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      this.advance();
    }
    
    return this.makeToken(TokenType.STRING, this.source.substring(this.start, this.current));
  }

  private number(): Token {
    // Handle .5 case
    if (this.source[this.start] === '.') {
      while (this.isDigit(this.peek())) {
        this.advance();
      }
      return this.makeToken(TokenType.NUMBER, this.source.substring(this.start, this.current));
    }
    
    // Hex literals: 0x...
    if (this.source[this.start] === '0' && this.match('x')) {
      while (this.isHexDigit(this.peek())) {
        this.advance();
      }
      return this.makeToken(TokenType.NUMBER, this.source.substring(this.start, this.current));
    }
    
    // Decimal digits
    while (this.isDigit(this.peek())) {
      this.advance();
    }
    
    // Fractional part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // consume .
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }
    
    // Exponent: 1e10, 1e-5, 1E+3
    if (this.peek() === 'e' || this.peek() === 'E') {
      this.advance(); // consume e/E
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance(); // consume sign
      }
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }
    
    return this.makeToken(TokenType.NUMBER, this.source.substring(this.start, this.current));
  }

  private identifier(startIdentifier?: number): Token {
    // Scan identifier characters
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_' || this.peek() === '$') {
      this.advance();
    }
    
    const text = this.source.substring(startIdentifier || this.start, this.current);
    const type = this.keywordType(text);
    
    return this.makeToken(type, text, startIdentifier || this.start);
  }

  private keywordType(text: string): TokenType {
    // Hash map lookup for keywords
    const keywords = new Map<string, TokenType>([
      ['abstract', TokenType.ABSTRACT],
      ['as', TokenType.AS],
      ['assert', TokenType.ASSERT],
      // contextual keywords (async, await, etc.) are intentionally *not* mapped here so they tokenize as identifiers
      ['break', TokenType.BREAK],
      ['case', TokenType.CASE],
      ['catch', TokenType.CATCH],
      ['class', TokenType.CLASS],
      ['const', TokenType.CONST],
      ['continue', TokenType.CONTINUE],
      ['default', TokenType.DEFAULT],
      ['deferred', TokenType.DEFERRED],
      ['do', TokenType.DO],
      ['dynamic', TokenType.DYNAMIC],
      ['else', TokenType.ELSE],
      ['enum', TokenType.ENUM],
      ['export', TokenType.EXPORT],
      ['extends', TokenType.EXTENDS],
      // extension (contextual)
      ['external', TokenType.EXTERNAL],
      // factory (contextual)
      ['false', TokenType.FALSE],
      ['final', TokenType.FINAL],
      ['finally', TokenType.FINALLY],
      ['for', TokenType.FOR],
      ['function', TokenType.FUNCTION],
      ['Function', TokenType.FUNCTION],  // Dart uses capital F for function types
      // get/hide are contextual
      ['if', TokenType.IF],
      ['implements', TokenType.IMPLEMENTS],
      ['import', TokenType.IMPORT],
      ['in', TokenType.IN],
      ['interface', TokenType.INTERFACE],
      ['is', TokenType.IS],
      // late (contextual)
      ['library', TokenType.LIBRARY],
      // mixin (contextual)
      ['native', TokenType.NATIVE],
      ['new', TokenType.NEW],
      ['null', TokenType.NULL],
      ['of', TokenType.OF],
      // operator (contextual)
      ['part', TokenType.PART],
      // required (contextual)
      ['rethrow', TokenType.RETHROW],
      ['return', TokenType.RETURN],
      // set/show are contextual
      ['static', TokenType.STATIC],
      ['super', TokenType.SUPER],
      ['switch', TokenType.SWITCH],
      ['sync', TokenType.SYNC],
      ['this', TokenType.THIS],
      ['throw', TokenType.THROW],
      ['true', TokenType.TRUE],
      ['try', TokenType.TRY],
      // typedef (contextual)
      ['var', TokenType.VAR],
      ['void', TokenType.VOID],
      ['while', TokenType.WHILE],
      ['with', TokenType.WITH],
      // yield (contextual)
    ]);
    
    return keywords.get(text) || TokenType.IDENTIFIER;
  }

  private advance(): string {
    const c = this.source[this.current];
    this.current++;
    this.column++;
    return c;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] !== expected) return false;
    this.advance();
    return true;
  }

  private matchSequence(sequence: string): boolean {
    for (let i = 0; i < sequence.length; i++) {
      if (this.current + i >= this.source.length) return false;
      if (this.source[this.current + i] !== sequence[i]) return false;
    }
    // Consume the sequence
    for (let i = 0; i < sequence.length; i++) {
      this.advance();
    }
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current];
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1];
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isHexDigit(c: string): boolean {
    return (c >= '0' && c <= '9') ||
          (c >= 'a' && c <= 'f') ||
          (c >= 'A' && c <= 'F');
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') ||
          (c >= 'A' && c <= 'Z') ||
          c === '_' || c === '$';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private isWhitespace(c: string): boolean {
    return c === ' ' || c === '\r' || c === '\t';
  }

  private makeToken(type: TokenType, lexeme: string, startPosition: number = this.start): Token {
    return {
      type,
      lexeme,
      start: startPosition,
      end: this.current,
      line: this.line,
      column: this.column - (this.current - startPosition),
    };
  }

  private whitespace(): Token | null {
    // Consume all consecutive whitespace characters
    while (!this.isAtEnd() && this.isWhitespace(this.peek())) {
      this.advance();
    }
    
    // Option 1: Return whitespace tokens (for full CST fidelity)
    return this.makeToken(
      TokenType.WHITESPACE, 
      this.source.substring(this.start, this.current)
    );
    
    // Option 2: Skip whitespace entirely (simpler, but loses fidelity)
    // return null;
  }

}
