import { compile, type CompileOptions, type CompileResult } from '../dsl/compile';
import { readAgentSource } from './lint';

/**
 * The first frame of what an assistant wrote: OpenFlow DSL, or Mermaid, Structurizr or D2 converted
 * first, exactly as the code panel and the MCP tools read them. Throws a RangeError saying why a
 * language it recognises cannot be converted.
 */
export async function compileSource(text: string, options?: CompileOptions): Promise<CompileResult> {
  return compile(readAgentSource(text).dsl, options);
}
