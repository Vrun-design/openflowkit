import type {
  SceneConnector, SceneDocumentV1, SceneLayer, SceneNode, ScenePage,
} from '../document/types';

interface CommandBase {
  readonly id: string;
  readonly label: string;
  readonly pageId: string;
}

export interface SetNodeCommand extends CommandBase {
  readonly kind: 'set-node';
  readonly before: SceneNode;
  readonly after: SceneNode;
}

export interface SetLayerCommand extends CommandBase {
  readonly kind: 'set-layer';
  readonly before: SceneLayer;
  readonly after: SceneLayer;
}

export interface InsertLayerCommand extends CommandBase {
  readonly kind: 'insert-layer';
  readonly index: number;
  readonly layer: SceneLayer;
}

export interface RemoveLayerCommand extends CommandBase {
  readonly kind: 'remove-layer';
  readonly index: number;
  readonly layer: SceneLayer;
}

export interface SetPageCommand extends CommandBase {
  readonly kind: 'set-page';
  readonly before: ScenePage;
  readonly after: ScenePage;
}

export interface InsertPageCommand {
  readonly kind: 'insert-page';
  readonly id: string;
  readonly label: string;
  readonly index: number;
  readonly page: ScenePage;
}

export interface RemovePageCommand {
  readonly kind: 'remove-page';
  readonly id: string;
  readonly label: string;
  readonly index: number;
  readonly page: ScenePage;
}

export interface InsertNodeCommand extends CommandBase {
  readonly kind: 'insert-node';
  readonly index: number;
  readonly node: SceneNode;
}

export interface RemoveNodeCommand extends CommandBase {
  readonly kind: 'remove-node';
  readonly index: number;
  readonly node: SceneNode;
}

export interface SetConnectorCommand extends CommandBase {
  readonly kind: 'set-connector';
  readonly before: SceneConnector;
  readonly after: SceneConnector;
}

export interface InsertConnectorCommand extends CommandBase {
  readonly kind: 'insert-connector';
  readonly index: number;
  readonly connector: SceneConnector;
}

export interface RemoveConnectorCommand extends CommandBase {
  readonly kind: 'remove-connector';
  readonly index: number;
  readonly connector: SceneConnector;
}

export interface BatchDocumentCommand {
  readonly kind: 'batch';
  readonly id: string;
  readonly label: string;
  readonly commands: readonly DocumentCommand[];
}

export type DocumentCommand =
  | SetNodeCommand
  | SetLayerCommand
  | InsertLayerCommand
  | RemoveLayerCommand
  | SetPageCommand
  | InsertPageCommand
  | RemovePageCommand
  | InsertNodeCommand
  | RemoveNodeCommand
  | SetConnectorCommand
  | InsertConnectorCommand
  | RemoveConnectorCommand
  | BatchDocumentCommand;

export interface AppliedDocumentCommand {
  readonly document: SceneDocumentV1;
  readonly inverse: DocumentCommand;
}
