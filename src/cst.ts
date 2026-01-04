type NodeKind = 'file' |
    'class' |
    'method' |
    'field' |
    'variable' |
    'parameter' |
    'property' |
    'function' |
    'constructor';

interface BaseNode {
  kind: NodeKind
  name: string
  start: number
  end: number
}

export interface FileNode extends BaseNode {
    kind: 'file',
    children: Node[],
}

export interface ClassNode extends BaseNode {
    kind: 'class',
    type: string,
    children: Node[],
}

export interface MethodNode extends BaseNode {
    kind: 'method',
    returnType: string,
    name: string,
    parameters: ParameterNode[],
}

export interface FieldNode extends BaseNode {
    kind: 'field',
    type: string,
    name: string,
}

export interface VariableNode extends BaseNode {
    kind: 'variable',
    type: string,
    name: string,
}

export interface ParameterNode extends BaseNode {
    kind: 'parameter',
    type: string,
    name: string,
}

export interface PropertyNode extends BaseNode {
    kind: 'property',
    type: string,
    name: string,
}

export interface FunctionNode extends BaseNode {
    kind: 'function',
    returnType: string,
    name: string,
    parameters: ParameterNode[],
}

export interface ConstructorNode extends BaseNode {
    kind: 'constructor',
    name: string,
    parameters: ParameterNode[],
}

export type Node = FileNode | ClassNode | MethodNode | FieldNode | VariableNode | ParameterNode | PropertyNode | FunctionNode | ConstructorNode;

export class CST {
    root: FileNode;

    constructor(root: FileNode) {
        this.root = root;
    }
    
}