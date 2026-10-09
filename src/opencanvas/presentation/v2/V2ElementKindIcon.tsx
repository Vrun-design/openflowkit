import {
  IconBox, IconCube, IconDatabase, IconPuzzle, IconServer, IconServer2, IconStack2, IconUser, IconWorld,
} from '@tabler/icons-react';
import { Icon, type IconComponent } from '../design-system';
import type { ElementKind } from '../../../dsl/model/types';

const KIND_ICON: Readonly<Record<ElementKind, IconComponent>> = {
  person: IconUser, system: IconBox, external: IconWorld, container: IconServer,
  component: IconPuzzle, store: IconDatabase, queue: IconStack2, node: IconServer2, instance: IconCube,
};

/** A kind's glyph, neutral: the word beside it says what it is, the icon makes rows scannable. */
export function ElementKindIcon({ kind }: { readonly kind: ElementKind }): React.JSX.Element {
  return <Icon icon={KIND_ICON[kind]} />;
}
