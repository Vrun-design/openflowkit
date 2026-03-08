const MARKDOWN_SYNTAX_PATTERN = /[#*_`~[()\-|>]|^\d+\./m;

export function hasMarkdownSyntax(content: string): boolean {
  return MARKDOWN_SYNTAX_PATTERN.test(content);
}
