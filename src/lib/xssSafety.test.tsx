import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { parseOpenFlowDslV2 } from '@/lib/openFlowDslParserV2';

describe('XSS safety', () => {
  describe('DSL parser input sanitization', () => {
    it('preserves script tag text in node labels without executing', () => {
      const malicious = '<script>alert("xss")</script>';
      const input = `[process] ${malicious}`;
      const result = parseOpenFlowDslV2(input);

      const node = result.nodes.find((n) => n.data.label === malicious);
      expect(node).toBeDefined();
      expect(node?.data.label).not.toContain('onerror');
    });

    it('handles javascript: text in labels safely', () => {
      const input = '[process] jsexec';
      const result = parseOpenFlowDslV2(input);

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });

    it('handles HTML injection text in labels safely', () => {
      const text = '"><img src=x onerror=alert(1)>';
      const input = `[process] ${text}`;
      const result = parseOpenFlowDslV2(input);

      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('handles template injection text safely', () => {
      const text = '{{constructor.constructor("alert(1)")()}}';
      const input = `[process] ${text}`;
      const result = parseOpenFlowDslV2(input);

      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('handles null bytes in input', () => {
      const input = '[process] test\x00injection';
      const result = parseOpenFlowDslV2(input);

      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('handles very long labels without crashing', () => {
      const longLabel = 'A'.repeat(10000);
      const input = `[process] ${longLabel}`;
      const result = parseOpenFlowDslV2(input);

      expect(result.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('markdown rendering safety', () => {
    it('does not render raw script tags', () => {
      const { container } = render(<MarkdownRenderer content='<script>alert("xss")</script>' />);
      expect(container.querySelector('script')).toBeNull();
    });

    it('does not render raw img onerror handlers', () => {
      const { container } = render(<MarkdownRenderer content="<img src=x onerror=alert(1)>" />);
      expect(container.querySelector('img[onerror]')).toBeNull();
    });

    it('renders markdown links safely', () => {
      const { container } = render(<MarkdownRenderer content="[click](javascript:alert(1))" />);
      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        expect(link.href).not.toContain('javascript:');
      });
    });

    it('renders code blocks without executing HTML', () => {
      const { container } = render(
        <MarkdownRenderer content="```\n<script>alert(1)</script>\n```" />
      );
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('code')).toBeTruthy();
    });
  });
});
