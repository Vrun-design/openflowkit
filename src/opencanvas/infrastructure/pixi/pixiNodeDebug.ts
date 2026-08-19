export type PixiMediaState = 'none' | 'loading' | 'loaded' | 'missing';

export interface PixiNodeDebugRecord {
  readonly id: string;
  readonly kind: string;
  readonly shape: string;
  readonly fill: number;
  readonly stroke: number;
  readonly mediaState: PixiMediaState;
  readonly provider?: string;
  readonly iconSource?: string;
  readonly fillAlpha?: number;
  readonly childCount?: number;
  readonly parentId?: string | null;
  readonly structuralState?: string;
  readonly rowCount?: number;
  readonly compartmentCount?: number;
  readonly depth?: number;
  readonly branchSide?: 'left' | 'right' | null;
  readonly descendantCount?: number;
  readonly journeySection?: string;
  readonly journeyScore?: number | null;
  readonly sequenceParticipantKind?: 'participant' | 'actor';
  readonly sequenceAlias?: string | null;
  readonly activationCount?: number;
  readonly sequenceOrder?: number;
  readonly sequenceTargetCount?: number;
  readonly sequenceFragmentType?: string | null;
  readonly sequenceFragmentId?: string;
  readonly wireframeVariant?: string;
  readonly wireframeSecure?: boolean;
  readonly wireframeHasMedia?: boolean;
}
