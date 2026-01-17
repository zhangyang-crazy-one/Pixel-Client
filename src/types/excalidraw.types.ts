/**
 * Excalidraw 类型定义
 * 兼容官方 @excalidraw/excalidraw 库的数据格式
 * 
 * 官方文档: https://docs.excalidraw.com/docs/@excalidraw/excalidraw
 */

// ============================================================================
// 元素类型
// ============================================================================

export type ExcalidrawElementType =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'text'
  | 'line'
  | 'arrow'
  | 'image'
  | 'frame'
  | 'freedraw'
  | 'embeddable';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type StrokeRoundness = 'round' | 'sharp';
export type FillStyle = 'hachure' | 'cross-hatch' | 'solid';
export type FontFamily = 1 | 2 | 3 | 4 | 5;
export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type Arrowhead = 'none' | 'arrow' | 'bar' | 'bracket' | 'dot' | 'triangle';

export interface Point {
  0: number;
  1: number;
}

export interface ArrowheadPoint {
  x: number;
  y: number;
  angle: number;
}

// ============================================================================
// 基础元素接口
// ============================================================================

export interface BaseExcalidrawElement {
  /** 元素唯一 ID */
  id: string;
  
  /** 元素类型 */
  type: ExcalidrawElementType;
  
  /** 位置和尺寸 */
  x: number;
  y: number;
  width: number;
  height: number;
  
  /** 角度 (弧度) */
  angle: number;
  
  /** 渲染状态 */
  isDeleted: boolean;
  version: number;
  versionNonce: number;
  updated: number;
  
  /** 样式属性 */
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  opacity: number;
  
  /** 关系属性 */
  groupIds: string[];
  boundElements: BoundElement[] | null;
  
  /** 链接 */
  link: string | null;
  
  /** 锁定状态 */
  locked: boolean;
  
  /** 随机种子 (用于手绘风格一致性) */
  seed: number;
}

// ============================================================================
// 形状元素 (矩形、椭圆、菱形)
// ============================================================================

export interface ExcalidrawShapeElement extends BaseExcalidrawElement {
  type: 'rectangle' | 'ellipse' | 'diamond';
  
  /** 圆角样式 */
  roundness: StrokeRoundness | null;
}

// ============================================================================
// 文本元素
// ============================================================================

export interface ExcalidrawTextElement extends BaseExcalidrawElement {
  type: 'text';
  
  /** 文本内容 */
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  
  /** 文本宽度和高度 (计算值) */
  textWidth: number;
  textHeight: number;
  
  /** 基准线 */
  baseline: number;
}

// ============================================================================
// 线条/箭头元素
// ============================================================================

export interface ExcalidrawLinearElement extends BaseExcalidrawElement {
  type: 'line' | 'arrow';
  
  /** 点坐标数组 */
  points: Point[];
  
  /** 箭头样式 */
  startArrowhead: Arrowhead | null;
  endArrowhead: Arrowhead | null;
  
  /** 箭头格式 */
  arrowheadFormat: 'arrow' | 'bar' | 'bracket' | 'dot' | 'triangle';
  
  /** 绑定关系 */
  startBinding: ElementBinding | null;
  endBinding: ElementBinding | null;
  
  /** 最后一个提交的点 */
  lastCommittedPoint: Point | null;
  
  /** 拖拽状态 */
  isDragging?: boolean;
}

// ============================================================================
// 自由绘制元素
// ============================================================================

export interface ExcalidrawFreeDrawElement extends BaseExcalidrawElement {
  type: 'freedraw';
  
  /** 压感点数 */
  pressure: number[];
  
  /** 简化点 */
  simplifiedPoints: Point[];
  
  /** 点数 */
  pointCount: number;
}

// ============================================================================
// 图像元素
// ============================================================================

export interface ExcalidrawImageElement extends BaseExcalidrawElement {
  type: 'image';
  
  /** 文件 ID */
  fileId: string;
  
  /** 缩放比例 */
  scale: [number, number];
  
  /** 原始宽度和高度 */
  originalWidth: number;
  originalHeight: number;
}

// ============================================================================
// 框架元素
// ============================================================================

export interface ExcalidrawFrameElement extends BaseExcalidrawElement {
  type: 'frame';
  
  /** 框架名称 */
  name: string;
  
  /** 子元素 ID 数组 */
  children: string[];
  
  /** 框架颜色 */
  frameColor: string;
}

// ============================================================================
// 绑定和引用
// ============================================================================

export interface BoundElement {
  type: 'element' | 'text';
  id: string;
}

export interface ElementBinding {
  elementId: string;
  focus: number;
  gap: number;
  point: Point | null;
}

// ============================================================================
// 文件数据
// ============================================================================

export interface FileData {
  mimeType: string;
  id: string;
  dataURL: string;
  created: number;
  lastRetrieved: number;
}

export type BinaryFiles = Record<string, FileData>;

// ============================================================================
// 工具类型 (与 @excalidraw/excalidraw 库保持一致)
// ============================================================================

export type ToolType =
  | 'selection'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'eraser'
  | 'hand'
  | 'frame'
  | 'magicframe'
  | 'embeddable'
  | 'laser';

export type ActiveTool =
  | { type: ToolType; customType: null }
  | { type: 'custom'; customType: string };

export type ElementOrToolType = ExcalidrawElementType | ToolType | 'custom';

// ============================================================================
// AppState (应用状态) - 与 @excalidraw/excalidraw 库保持一致
// ============================================================================

export interface AppState {
  // 视图状态
  zoom: { value: number };
  scrollX: number;
  scrollY: number;

  // 画布设置
  gridSize: number | null;
  viewBackgroundColor: string;

  // 主题
  theme: 'light' | 'dark';

  // 工具状态 - 与库的类型匹配
  activeTool: {
    lastActiveTool: ActiveTool | null;
    locked: boolean;
  } & ActiveTool;

  // 元素选择
  selectedElementIds: Record<string, boolean>;
  selectedGroupIds: Record<string, boolean>;

  // 编辑器模式
  viewModeEnabled: boolean;
  zenModeEnabled: boolean;
  gridModeEnabled: boolean;
  objectsSnapModeEnabled: boolean;

  // UI 状态
  openDialog: { name: 'imageExport' | 'jsonExport' | 'help' } | null;
  openSidebar: { name: string; tab?: string } | null;

  // 当前项目样式
  currentItemStrokeColor: string;
  currentItemBackgroundColor: string;
  currentItemFillStyle: FillStyle;
  currentItemStrokeWidth: number;
  currentItemStrokeStyle: StrokeStyle;
  currentItemFontSize: number;
  currentItemFontFamily: FontFamily;
  currentItemTextAlign: TextAlign;
  currentItemRoundness: StrokeRoundness | null;

  // 对齐和分布
  showStats: boolean;

  // 协作
  collaborators: Map<string, Collaborator>;
  userToFollow: { socketId: string; username: string } | null;

  // 文档信息
  name: string | null;
  fileHandle: FileSystemHandle | null;

  // 其他状态
  scrolledOutside: boolean;
  offsetLeft: number;
  offsetTop: number;
  width: number;
  height: number;
}

// ============================================================================
// 协作者
// ============================================================================

export interface Collaborator {
  cursor: Point;
  selection: string[];
  color: string;
  username?: string;
}

// ============================================================================
// 完整场景数据
// ============================================================================

export interface ExcalidrawData {
  /** Schema 类型标识 */
  type: 'excalidraw';
  
  /** Schema 版本号 */
  version: number;
  
  /** 来源 URL */
  source: string;
  
  /** 元素数组 */
  elements: ExcalidrawElement[];
  
  /** 应用状态 */
  appState: AppState;
  
  /** 文件数据 */
  files: BinaryFiles;
}

// ============================================================================
// 联合类型
// ============================================================================

export type ExcalidrawElement =
  | ExcalidrawShapeElement
  | ExcalidrawTextElement
  | ExcalidrawLinearElement
  | ExcalidrawFreeDrawElement
  | ExcalidrawImageElement
  | ExcalidrawFrameElement;

// 排序后的元素 (非删除的)
export type OrderedExcalidrawElement = ExcalidrawElement & { index: number };

// 非删除元素
export type NonDeleted<T extends ExcalidrawElement = ExcalidrawElement> = 
  T extends { isDeleted: true } ? never : T;

// ============================================================================
// 场景列表项
// ============================================================================

export interface ExcalidrawSceneInfo {
  id: string;
  conversationId: string;
  createdAt: number;
  updatedAt: number;
  elementCount: number;
  name?: string;
}

// ============================================================================
// 初始数据
// ============================================================================

export interface ExcalidrawInitialData {
  elements?: readonly ExcalidrawElement[] | null;
  appState?: Partial<AppState> | null;
  files?: BinaryFiles | null;
  libraryItems?: unknown | null;
}

// ============================================================================
// 导出/导入
// ============================================================================

export interface ExportOptions {
  format: 'json' | 'png' | 'svg';
  withBackground?: boolean;
  withTheme?: boolean;
  scale?: number;
  padding?: number;
}

// ============================================================================
// 主题
// ============================================================================

export type Theme = 'light' | 'dark';

// ============================================================================
// Imperative API
// ============================================================================

export interface ExcalidrawImperativeAPI {
  // 场景操作
  updateScene: (data: { elements?: readonly ExcalidrawElement[]; appState?: Partial<AppState>; files?: BinaryFiles }) => void;
  getSceneElements: () => readonly ExcalidrawElement[];
  getSceneElementsIncludingDeleted: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  getFiles: () => BinaryFiles;
  resetScene: (options?: { resetLoadingState: boolean }) => void;
  
  // 元素操作
  addElements: (elements: ExcalidrawElement[], position?: number) => void;
  addFiles: (files: BinaryFiles) => void;
  
  // 视图操作
  scrollToContent: (elements?: readonly ExcalidrawElement[], options?: { fitToContent?: boolean; maxZoom?: number }) => void;
  setZoom: (value: number, center?: { x: number; y: number }) => void;
  
  // 工具操作
  setActiveTool: (tool: { type: string; customType?: string | null }) => void;
  
  // 历史操作
  history: {
    clear: () => void;
    undo: () => void;
    redo: () => void;
    hasUndo: () => boolean;
    hasRedo: () => boolean;
  };
  
  // 事件订阅
  onChange: (callback: (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => void) => () => void;
  onIncrement: (callback: (event: { element: ExcalidrawElement }) => void) => () => void;
  onPointerDown: (callback: (activeTool: AppState['activeTool'], pointerDownState: unknown, event: PointerEvent) => void) => () => void;
  
  // UI 操作
  setToast: (toast: { message: string; closable?: boolean; type?: 'success' | 'error' | 'warning' }) => void;
  showToast: (toast: { message: string; closable?: boolean; type?: 'success' | 'error' | 'warning' }) => void;
  
  // 导入/导出
  loadFile: (file: File) => Promise<void>;
  exportToBlob: (options: { format: 'json' | 'png' | 'svg'; quality?: number }) => Promise<Blob>;
  getExportSvg: (options?: { exportBackground?: boolean; exportPadding?: number }) => Promise<SVGElement | null>;
}

// ============================================================================
// 场景版本
// ============================================================================

export function getSceneVersion(elements: readonly ExcalidrawElement[]): number {
  return elements.reduce((version, el) => {
    return version + el.version + el.versionNonce;
  }, 0);
}
