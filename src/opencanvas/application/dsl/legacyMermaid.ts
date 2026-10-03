import { compile, type CompileOptions } from '../../../dsl/compile';
import type { LegacyMermaidConverter } from '../../domain/document/legacyWorkspace';
import { mermaidToDsl } from '../../../services/dsl/mermaidToDsl';
import { buildDslPageCommand } from './dslPageCommand';

/** v1 `mermaid_svg` source → a native DSL frame at the node's spot; null when Mermaid can't convert it. */
export function legacyMermaidConverter(options: Omit<CompileOptions, 'origin'>): LegacyMermaidConverter {
  return async (page, source, origin) => {
    const conversion = mermaidToDsl(source);
    if ('error' in conversion) return null;
    const command = buildDslPageCommand(page, await compile(conversion.dsl, { ...options, origin }));
    return command?.kind === 'set-page' ? command.after : null;
  };
}
