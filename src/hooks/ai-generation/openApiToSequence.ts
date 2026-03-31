import { formatOpenApiForPrompt, parseOpenApi } from './openApiParser';

export function buildOpenApiToSequencePrompt(spec: string): string {
    const parsed = parseOpenApi(spec);

    const apiSection = parsed
        ? formatOpenApiForPrompt(parsed)
        : `OPENAPI SPEC (parse directly):\n\`\`\`\n${spec}\n\`\`\`\n\nNote: Spec could not be parsed as JSON — extract resource groups manually.`;

    const authRule = parsed?.securitySchemes.length
        ? '\n- Add a [system] "Auth Service" node and show the auth flow from Client → API → Auth Service'
        : '';

    return `Generate a high-level architecture overview diagram for this API.

${apiSection}

Rules:
- Create a [browser] node for "Client" and a [system] node for the main "API" entry point
- Create one [system] node per resource group listed above
- Show 1–2 representative flows per resource group as directed edges (e.g. "GET /users", "POST /orders")
- Do NOT map every endpoint — show only the flows that best explain each group's purpose${authRule}
- Do not use section or group containers; keep related resource nodes adjacent by domain
- Skip: deeply nested paths, query parameter variations, error response details, webhook callbacks

Goal: a useful architecture overview a developer can understand in 30 seconds.`;
}
