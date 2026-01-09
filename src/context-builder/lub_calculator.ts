import { Type } from "./node";

export class LubCalculator {

	/**
   * Compute the least upper bound of multiple types
   * Examples:
   * - LUB(int, int) = int
   * - LUB(int, Null) = int?
   * - LUB(int, String) = Object
   * - LUB(Never, int) = int
   * - LUB(void, void) = void
   */
  static compute(types: Type[]): Type {
    // Algorithm:
    // 1. Filter out Never types
    // 2. If all remaining are same type → return that type
    // 3. If includes Null → make result nullable
    // 4. If includes void → return void if all void, else error
    // 5. Find common supertype hierarchy
    // 6. Return most specific common ancestor
  }
  
  private static findCommonSupertype(t1: Type, t2: Type): Type;
  private static getSupertypes(t: Type): Type[];
}