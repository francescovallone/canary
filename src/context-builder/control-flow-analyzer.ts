class ControlFlowAnalyzer {
  /**
   * Find all return statements in a lambda/block
   * Handle implicit returns for non-void paths
   */
  static analyzeReturns(body: Node): ReturnInfo {
    // Returns:
    // - explicit returns: all 'return expr;' statements
    // - implicit returns: paths that don't return (→ null)
    // - hasVoidReturn: true if any bare 'return;' or no return
  }
  
  private static visitNode(node: Node, collector: ReturnCollector): void;
  private static checkExhaustive(node: Node): boolean; // all paths return?
}

interface ReturnInfo {
  explicitReturns: Node[]; // return expressions
  hasImplicitNull: boolean; // some path ends without return
  hasVoidReturn: boolean; // bare 'return;' exists
  allPathsReturn: boolean; // no fallthrough
}