export enum NodeType {
  ROOT = 'ROOT',

  INBOX = 'INBOX',
  TRASH = 'TRASH',
  FAVORITE = 'FAVORITE',
  DAILY = 'DAILY',

  DAILY_ROOT = 'DAILY_ROOT',

  // Database
  DATABASE_ROOT = 'DATABASE_ROOT',

  COMMON = 'COMMON',

  LIST = 'LIST',
  LIST_ITEM = 'LIST_ITEM',

  DATABASE = 'DATABASE',
  CELL = 'CELL',
  ROW = 'ROW',
  COLUMN = 'COLUMN',
  VIEW = 'VIEW',
  FILTER = 'FILTER',
  OPTION = 'OPTION',
}

export interface INode {
  id: string

  spaceId: string

  parentId?: string

  databaseId?: string

  type: NodeType

  element: any | any[]

  // for dynamic data
  props: {
    name?: string
    date?: string // 2024-01-01
    viewType?: ViewType
    [key: string]: any
  }

  /**
   * for editor
   */
  collapsed: boolean

  /**
   * for tree view
   */
  folded: boolean

  children: string[]

  openedAt: Date

  createdAt: Date

  updatedAt: Date
}

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  PASSWORD = 'PASSWORD',
  BOOLEAN = 'BOOLEAN',
  MARKDOWN = 'MARKDOWN',
  URL = 'URL',
  IMAGE = 'IMAGE',
  RATE = 'RATE',

  SINGLE_SELECT = 'SINGLE_SELECT',
  MULTIPLE_SELECT = 'MULTIPLE_SELECT',
  DATE = 'DATE',
  CREATED_AT = 'CREATED_AT',
  UPDATED_AT = 'UPDATED_AT',
}

export interface IRootNode extends INode {
  type: NodeType.ROOT
  props: {
    catalogue: any
  }
}

export interface IDailyRootNode extends INode {
  type: NodeType.DAILY_ROOT
}

export interface IDatabaseRootNode extends INode {
  type: NodeType.DATABASE_ROOT
}

export enum DataSource {
  TAG = 'TAG',
  COMMON = 'COMMON',
}

export interface IDatabaseNode extends INode {
  type: NodeType.DATABASE
  props: {
    name: string // database name, same with tag name
    color: string
    activeViewId: string
    viewIds: string[]
    dataSource: DataSource
  }
}

export interface IColumnNode extends INode {
  parentId: string // should be database id
  type: NodeType.COLUMN
  props: {
    name: string
    description: string
    fieldType: FieldType
    isPrimary: boolean
    config: any
    optionIds?: string[]
  }
}

export interface IRowNode extends INode {
  parentId: string // should be database id
  type: NodeType.ROW
  props: {
    sort: number
  }
}

export interface ICellNode extends INode {
  parentId: string // should be database id
  type: NodeType.CELL
  props: {
    columnId: string
    rowId: string
    ref: string // ref to a node id
    data: any
  }
}

export function isCellNode(node: any): node is ICellNode {
  return node?.type === NodeType.CELL
}

export enum ViewType {
  TABLE = 'TABLE',
  LIST = 'LIST',
  CALENDAR = 'CALENDAR',
  GALLERY = 'GALLERY',
  KANBAN = 'KANBAN',
}

export interface ViewColumn {
  columnId: string
  width: number
  visible: boolean
}

export interface Sort {
  columnId: string
  isAscending: boolean
}

export interface Group {
  columnId: string
  isAscending: boolean
  showEmptyGroup: boolean
}

export enum ConjunctionType {
  OR = 'OR',
  AND = 'AND',
}

export enum OperatorType {
  IS_EMPTY = 'IS_EMPTY',
  IS_NOT_EMPTY = 'IS_NOT_EMPTY',
  CONTAINS = 'CONTAINS',
  DOES_NOT_CONTAIN = 'DOES_NOT_CONTAIN',

  IS = 'IS',
  IS_NOT = 'IS_NOT',

  EQUAL = 'EQUAL', // =
  NOT_EQUAL = 'NOT_EQUAL', //!=
  LESS_THAN = 'LESS_THAN', // <
  MORE_THAN = 'MORE_THAN', // >

  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL', // <=
  MORE_THAN_OR_EQUAL = 'MORE_THAN_OR_EQUAL', // >=

  FILENAME = 'FILENAME',
  FILETYPE = 'FILETYPE',
}

export interface Filter {
  columnId: string // column id
  conjunction: ConjunctionType
  operator: OperatorType
  value: any
}

export interface IViewNode extends INode {
  parentId: string // should be database id
  type: NodeType.VIEW
  children: string[]
  props: {
    name: string
    viewType: ViewType
    viewColumns: ViewColumn[]
    sorts: Sort[]
    groups: Group[]
    filters: Filter[]
    kanbanColumnId: string // columnId for kanban
    kanbanOptionIds: string[] // for kanban sorts
  }
}

export interface IFilterNode extends INode {
  parentId: string // should be database id
  type: NodeType.FILTER
  props: {
    columnId: string
    viewId: string
  }
}

export interface IOptionNode extends INode {
  parentId: string // should be database id
  type: NodeType.OPTION
  props: {
    columnId: string
    name: string
    color: string
  }
}
