import type { DiagramType, FlowTab, PlaybackState } from '@/lib/types';
import { createEmptyFlowHistory } from '@/store/historyState';
import type {
  LoadedDocument,
  PersistedDocument,
  PersistedDocumentContent,
  PersistedDocumentPage,
  WorkspaceMeta,
} from './persistenceTypes';

export interface FlowPage {
  id: string;
  name: string;
  diagramType?: DiagramType;
  updatedAt?: string;
  nodes: FlowTab['nodes'];
  edges: FlowTab['edges'];
  playback?: PlaybackState;
  history: FlowTab['history'];
}

export interface FlowDocument {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  activePageId: string;
  pages: FlowPage[];
}

export interface LoadedFlowWorkspace {
  activeDocumentId: string | null;
  documents: FlowDocument[];
  workspaceMeta: WorkspaceMeta;
}

function createFlowPageFromPersistedContent(
  documentId: string,
  name: string,
  diagramType: DiagramType | undefined,
  updatedAt: string,
  content: PersistedDocumentContent
): FlowPage {
  return {
    id: `${documentId}:page:primary`,
    name,
    diagramType,
    updatedAt,
    nodes: content.nodes,
    edges: content.edges,
    playback: content.playback,
    history: content.history ?? createEmptyFlowHistory(),
  };
}

function createFlowPageFromPersistedPage(page: PersistedDocumentPage): FlowPage {
  return {
    id: page.id,
    name: page.name,
    diagramType: page.diagramType,
    updatedAt: page.updatedAt,
    nodes: page.content.nodes,
    edges: page.content.edges,
    playback: page.content.playback,
    history: page.content.history ?? createEmptyFlowHistory(),
  };
}

export function createFlowDocumentFromPersistedDocument(
  document: PersistedDocument
): FlowDocument {
  const pages = document.pages?.length
    ? document.pages.map(createFlowPageFromPersistedPage)
    : document.content
      ? [createFlowPageFromPersistedContent(
        document.id,
        document.name,
        document.diagramType,
        document.updatedAt,
        document.content,
      )]
      : [];

  if (pages.length === 0) {
    throw new Error(`Persisted document "${document.id}" is missing page content.`);
  }

  const activePageId = pages.some((page) => page.id === document.activePageId)
    ? (document.activePageId as string)
    : pages[0].id;

  return {
    id: document.id,
    name: document.name,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    activePageId,
    pages,
  };
}

export function createFlowDocumentsFromPersistedDocuments(
  documents: PersistedDocument[]
): FlowDocument[] {
  return documents.map(createFlowDocumentFromPersistedDocument);
}

export function createLoadedFlowWorkspace(
  loaded: LoadedDocument
): LoadedFlowWorkspace {
  const documents = createFlowDocumentsFromPersistedDocuments(loaded.documents);
  const activeDocumentId = loaded.document?.id ?? loaded.workspaceMeta.activeDocumentId ?? documents[0]?.id ?? null;

  return {
    activeDocumentId,
    documents,
    workspaceMeta: loaded.workspaceMeta,
  };
}

export function convertFlowDocumentsToTabs(documents: FlowDocument[]): FlowTab[] {
  return documents.flatMap((document) =>
    document.pages.map((page) => ({
      id: document.pages.length === 1 ? document.id : page.id,
      name: document.pages.length === 1 ? document.name : `${document.name} / ${page.name}`,
      diagramType: page.diagramType,
      updatedAt: page.updatedAt ?? document.updatedAt,
      nodes: page.nodes,
      edges: page.edges,
      playback: page.playback,
      history: page.history,
    }))
  );
}
