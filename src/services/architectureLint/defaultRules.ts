/** Example rules shown when a user opens the Lint panel for the first time. */
export const EXAMPLE_LINT_RULES = `{
  "rules": [
    {
      "id": "no-direct-db-call",
      "description": "Services must not call databases directly — use a data layer",
      "severity": "error",
      "type": "cannot-connect",
      "from": { "labelContains": "service" },
      "to":   { "labelContains": "database" }
    },
    {
      "id": "no-frontend-to-db",
      "description": "Frontend components cannot connect directly to databases",
      "severity": "error",
      "type": "cannot-connect",
      "from": { "nodeType": "custom", "labelContains": "frontend" },
      "to":   { "labelContains": "db" }
    },
    {
      "id": "api-must-reach-auth",
      "description": "Any API gateway must connect to an Auth service",
      "severity": "warning",
      "type": "must-connect",
      "from": { "labelContains": "api gateway" },
      "to":   { "labelContains": "auth" }
    }
  ]
}`;
