import { describe, it, expect } from 'vitest';
import { SECTION_MIN_HEIGHT, SECTION_MIN_WIDTH } from '@/hooks/node-operations/sectionBounds';
import { parseMermaid } from '@/lib/mermaidParser';

describe('mermaidParser', () => {
  it('should parse a basic flowchart with TD direction', () => {
    const input = `
            flowchart TD
            A[Start] --> B[End]
        `;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0].data.label).toBe('Start');
    expect(result.nodes[1].data.label).toBe('End');
    expect(result.edges[0].source).toBe('A');
    expect(result.edges[0].target).toBe('B');
  });

  it('should handle different node types based on shapes', () => {
    const input = `
            flowchart TD
            S([Start Node])
            P[Process Node]
            D{Decision Node}
            E((End Node))
        `;
    const result = parseMermaid(input);
    expect(result.nodes.find((n) => n.id === 'S')?.type).toBe('start');
    expect(result.nodes.find((n) => n.id === 'P')?.type).toBe('process');
    expect(result.nodes.find((n) => n.id === 'D')?.type).toBe('decision');
    expect(result.nodes.find((n) => n.id === 'E')?.type).toBe('end');
  });

  it('should parse edges with labels', () => {
    const input = `
            flowchart TD
            A --> |Yes| B
            A --> |No| C
        `;
    const result = parseMermaid(input);
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].label).toBe('Yes');
    expect(result.edges[1].label).toBe('No');
  });

  it('should handle LR direction', () => {
    const input = `
            flowchart LR
            A --> B
        `;
    const result = parseMermaid(input);
    expect(result.direction).toBe('LR');
  });

  it('should return error if no flowchart declaration is found', () => {
    const input = `A --> B`;
    const result = parseMermaid(input);
    expect(result.error).toBeDefined();
    expect(result.nodes).toHaveLength(0);
  });

  it('should handle inline node declarations in edges', () => {
    const input = `
            flowchart TD
            A[Node A] --> B((Node B))
        `;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.find((n) => n.id === 'A')?.data.label).toBe('Node A');
    expect(result.nodes.find((n) => n.id === 'B')?.type).toBe('end');
  });

  // --- NEW TESTS ---

  it('should support "graph TD" keyword (not just flowchart)', () => {
    const input = `
            graph TD
            A[Start] --> B[End]
        `;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.direction).toBe('TB');
  });

  it('should strip fa: icon prefixes from labels', () => {
    const input = `
            graph TD
            Bat(fa:fa-car-battery Batteries) --> ShutOff[Shut Off]
        `;
    const result = parseMermaid(input);
    expect(result.nodes.find((n) => n.id === 'Bat')?.data.label).toBe('Batteries');
    expect(result.nodes.find((n) => n.id === 'ShutOff')?.data.label).toBe('Shut Off');
  });

  it('should handle modern @{shape: name} syntax', () => {
    const input = `
            flowchart TD
            A@{shape: cyl}[(Database)]
            B@{shape: diamond}{Is Valid?}
            C@{shape: stadium}[Start]
        `;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.find((n) => n.id === 'A')?.type).toBe('process');
    expect(result.nodes.find((n) => n.id === 'A')?.data.shape).toBe('cylinder');
    expect(result.nodes.find((n) => n.id === 'B')?.type).toBe('decision');
    expect(result.nodes.find((n) => n.id === 'B')?.data.shape).toBe('diamond');
    expect(result.nodes.find((n) => n.id === 'C')?.type).toBe('start');
  });

  it('should preserve modern annotation-only labels and shapes without legacy brackets', () => {
    const input = `
            flowchart TD
            API@{ shape: rect, label: "API Gateway" }
            DB@{ shape: cyl, label: "Primary DB" }
            API --> DB
        `;
    const result = parseMermaid(input);

    expect(result.error).toBeUndefined();
    expect(result.nodes.find((n) => n.id === 'API')?.data.label).toBe('API Gateway');
    expect(result.nodes.find((n) => n.id === 'API')?.data.shape).toBe('rounded');
    expect(result.nodes.find((n) => n.id === 'DB')?.data.label).toBe('Primary DB');
    expect(result.nodes.find((n) => n.id === 'DB')?.data.shape).toBe('cylinder');
    expect(result.edges).toHaveLength(1);
  });

  it('should preserve modern annotation-only endpoints when used inline in edges', () => {
    const input = `
            flowchart TD
            Start@{ shape: stadium, label: "Start Here" } --> End@{ shape: circle, label: "Finish" }
        `;
    const result = parseMermaid(input);

    expect(result.error).toBeUndefined();
    expect(result.nodes.find((n) => n.id === 'Start')?.data.label).toBe('Start Here');
    expect(result.nodes.find((n) => n.id === 'Start')?.type).toBe('start');
    expect(result.nodes.find((n) => n.id === 'End')?.data.label).toBe('Finish');
    expect(result.nodes.find((n) => n.id === 'End')?.type).toBe('end');
    expect(result.edges).toHaveLength(1);
  });

  it('should parse dotted flowchart ids in standalone node declarations', () => {
    const input = `
            flowchart TD
            api.gateway[API Gateway]
            db.primary[(Primary DB)]
            api.gateway --> db.primary
        `;
    const result = parseMermaid(input);

    expect(result.error).toBeUndefined();
    expect(result.nodes.find((n) => n.id === 'api.gateway')?.data.label).toBe('API Gateway');
    expect(result.nodes.find((n) => n.id === 'db.primary')?.data.label).toBe('Primary DB');
    expect(result.nodes.find((n) => n.id === 'db.primary')?.data.shape).toBe('cylinder');
    expect(result.edges[0]).toMatchObject({
      source: 'api.gateway',
      target: 'db.primary',
    });
  });

  it('should parse dotted flowchart ids in inline edge endpoints and subgraphs', () => {
    const input = `
            flowchart TD
            subgraph cluster.api[API Cluster]
              api.gateway[Gateway] --> service.core[Core Service]
            end
        `;
    const result = parseMermaid(input);
    const sectionNode = result.nodes.find((node) => node.type === 'section');

    expect(result.error).toBeUndefined();
    expect(sectionNode?.id).toBe('cluster.api');
    expect(sectionNode?.data.label).toBe('API Cluster');
    expect(result.nodes.find((n) => n.id === 'api.gateway')?.parentId).toBe('cluster.api');
    expect(result.nodes.find((n) => n.id === 'service.core')?.parentId).toBe('cluster.api');
    expect(result.edges[0]).toMatchObject({
      source: 'api.gateway',
      target: 'service.core',
    });
  });

  it('should strip markdown from labels', () => {
    const input = `
            flowchart TD
            A[**Bold** text] --> B[*Italic* label]
        `;
    const result = parseMermaid(input);
    expect(result.nodes.find((n) => n.id === 'A')?.data.label).toBe('Bold text');
    expect(result.nodes.find((n) => n.id === 'B')?.data.label).toBe('Italic label');
  });

  it('should handle chained edges: A --> B --> C', () => {
    const input = `
            flowchart TD
            A --> B --> C
        `;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].source).toBe('A');
    expect(result.edges[0].target).toBe('B');
    expect(result.edges[1].source).toBe('B');
    expect(result.edges[1].target).toBe('C');
  });

  it('should handle chained edges with labels', () => {
    const input = `
            flowchart TD
            Fuse -->|1.5a| Switch -->|1.5a| Wifi
        `;
    const result = parseMermaid(input);
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].source).toBe('Fuse');
    expect(result.edges[0].target).toBe('Switch');
    expect(result.edges[0].label).toBe('1.5a');
    expect(result.edges[1].source).toBe('Switch');
    expect(result.edges[1].target).toBe('Wifi');
    expect(result.edges[1].label).toBe('1.5a');
  });

  it('creates section nodes for subgraph wrappers and sets parentId on children', () => {
    const input = `
            flowchart TD
            subgraph Services
              API[API]
              DB[(Database)]
            end
        `;
    const result = parseMermaid(input);
    expect(result.nodes.length).toBeGreaterThanOrEqual(3);
    const sectionNode = result.nodes.find((node) => node.type === 'section');
    expect(sectionNode).toBeDefined();
    expect(sectionNode?.data.label).toBe('Services');
    expect(sectionNode?.style).toMatchObject({
      width: SECTION_MIN_WIDTH,
      height: SECTION_MIN_HEIGHT,
    });
    const apiNode = result.nodes.find((node) => node.id === 'API');
    expect(apiNode?.parentId).toBe(sectionNode?.id);
    expect(apiNode?.extent).toBeUndefined();
    const dbNode = result.nodes.find((node) => node.id === 'DB');
    expect(dbNode?.parentId).toBe(sectionNode?.id);
    expect(dbNode?.extent).toBeUndefined();
  });

  it('parses subgraph declarations with explicit ids and human labels', () => {
    const input = `
            flowchart TD
            subgraph api[API Layer]
              A[Gateway] --> B[Service]
            end
        `;
    const result = parseMermaid(input);
    const sectionNode = result.nodes.find((node) => node.type === 'section');

    expect(sectionNode?.id).toBe('api');
    expect(sectionNode?.data.label).toBe('API Layer');
    expect(result.nodes.find((node) => node.id === 'A')?.parentId).toBe('api');
    expect(result.nodes.find((node) => node.id === 'B')?.parentId).toBe('api');
  });

  it('applies classDef styles to inline node declarations used inside edges', () => {
    const input = `
            flowchart TD
            A[One]:::hot --> B[Two]
            classDef hot fill:#f66,color:#fff,stroke:#900
        `;
    const result = parseMermaid(input);
    const nodeA = result.nodes.find((node) => node.id === 'A');

    expect(nodeA?.style).toMatchObject({
      backgroundColor: '#f66',
      color: '#fff',
      borderColor: '#900',
    });
  });

  it('applies classDef styles referenced by Mermaid class assignment lines', () => {
    const input = `
            flowchart TD
            A[Gateway]
            B[(Primary DB)]
            classDef hot fill:#f66,color:#fff,stroke:#900
            class A,B hot
        `;
    const result = parseMermaid(input);
    const nodeA = result.nodes.find((node) => node.id === 'A');
    const nodeB = result.nodes.find((node) => node.id === 'B');

    expect(nodeA?.style).toMatchObject({
      backgroundColor: '#f66',
      color: '#fff',
      borderColor: '#900',
    });
    expect(nodeB?.style).toMatchObject({
      backgroundColor: '#f66',
      color: '#fff',
      borderColor: '#900',
    });
  });

  it('applies class assignment lines to dotted node ids', () => {
    const input = `
            flowchart TD
            api.gateway[Gateway]
            service.core[Core Service]
            classDef selected fill:#dff,stroke:#08c,color:#024
            class api.gateway,service.core selected;
        `;
    const result = parseMermaid(input);

    expect(result.nodes.find((node) => node.id === 'api.gateway')?.style).toMatchObject({
      backgroundColor: '#dff',
      borderColor: '#08c',
      color: '#024',
    });
    expect(result.nodes.find((node) => node.id === 'service.core')?.style).toMatchObject({
      backgroundColor: '#dff',
      borderColor: '#08c',
      color: '#024',
    });
  });

  it('should handle duplicate edges between same pair', () => {
    const input = `
            flowchart TD
            Fuse -->|10a| Cig1[Cigarette Lighter]
            Fuse -->|10a| Cig1
        `;
    const result = parseMermaid(input);
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].source).toBe('Fuse');
    expect(result.edges[1].source).toBe('Fuse');
  });

  it('should return direction in ParseResult', () => {
    const lr = parseMermaid('flowchart LR\n A --> B');
    expect(lr.direction).toBe('LR');

    const rl = parseMermaid('graph RL\n A --> B');
    expect(rl.direction).toBe('RL');

    const bt = parseMermaid('flowchart BT\n A --> B');
    expect(bt.direction).toBe('BT');
  });

  it('should skip linkStyle, classDef, style directives gracefully', () => {
    const input = `
            graph TD
            A --> B
            linkStyle 0 stroke-width:2px,fill:none,stroke:red;
            classDef default fill:#f9f
            style A fill:#bbf
        `;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it('should parse linkStyle and apply stroke color to edges', () => {
    const input = `
            graph TD
            A --> B
            B --> C
            linkStyle 0 stroke-width:2px,fill:none,stroke:red;
            linkStyle 1 stroke-width:2px,fill:none,stroke:green;
        `;
    const result = parseMermaid(input);
    expect(result.edges[0].style).toEqual(expect.objectContaining({ stroke: 'red' }));
    expect(result.edges[1].style).toEqual(expect.objectContaining({ stroke: 'green' }));
  });

  it('should handle the full battery diagram', () => {
    const input = `graph TD
    Bat(fa:fa-car-battery Batteries) -->|150a 50mm| ShutOff
    Bat -->|150a 50mm| Shunt

    ShutOff[Shut Off] -->|150a 50mm| BusPos[Bus Bar +]

    Shunt -->|150a 50mm| BusNeg[Bus Bar -]

    BusPos -->|40a| Fuse[Fuse Box]
    BusPos -->|?a| Old{Old Wiring}

    BusNeg -->|40a| Fuse

    Fuse -->|10a| USB(USB-C)
    Fuse -->|10a| USB
    Fuse -->|1.5a| Switch -->|1.5a| Wifi

    Wifi -->|1.5a| Fuse

    Fuse -->|10a| Cig1[Cigarette Lighter]
    Fuse -->|10a| Cig1 

    Fuse -->|10a| Cig2[Cigarette Lighter Near Bed]
    Fuse -->|10a| Cig2 

    BusNeg -->|?a| Old

    Solar --> SolarCont[Solar Controller]
    Solar --> SolarCont

    SolarCont --> BusNeg
    SolarCont --> BusPos

    linkStyle 0,1,2,4,5,8,9 stroke-width:2px,fill:none,stroke:red;
    linkStyle 3,6,7 stroke-width:2px,fill:none,stroke:black;
    linkStyle 10 stroke-width:2px,fill:none,stroke:red;
    linkStyle 11 stroke-width:2px,fill:none,stroke:green;
    linkStyle 12 stroke-width:2px,fill:none,stroke:red;
    linkStyle 13 stroke-width:2px,fill:none,stroke:green;
    linkStyle 14 stroke-width:2px,fill:none,stroke:red;
    linkStyle 15 stroke-width:2px,fill:none,stroke:green;
    linkStyle 16 stroke-width:2px,fill:none,stroke:green;
    linkStyle 17 stroke-width:2px,fill:none,stroke:red;
    linkStyle 18 stroke-width:2px,fill:none,stroke:green;
    linkStyle 19 stroke-width:2px,fill:none,stroke:green;`;

    const result = parseMermaid(input);

    // Should have no errors
    expect(result.error).toBeUndefined();

    // Direction should be TB
    expect(result.direction).toBe('TB');

    // Should find all unique nodes
    const nodeIds = result.nodes.map((n) => n.id);
    expect(nodeIds).toContain('Bat');
    expect(nodeIds).toContain('ShutOff');
    expect(nodeIds).toContain('Shunt');
    expect(nodeIds).toContain('BusPos');
    expect(nodeIds).toContain('BusNeg');
    expect(nodeIds).toContain('Fuse');
    expect(nodeIds).toContain('Old');
    expect(nodeIds).toContain('USB');
    expect(nodeIds).toContain('Switch');
    expect(nodeIds).toContain('Wifi');
    expect(nodeIds).toContain('Cig1');
    expect(nodeIds).toContain('Cig2');
    expect(nodeIds).toContain('Solar');
    expect(nodeIds).toContain('SolarCont');

    // Check labels
    expect(result.nodes.find((n) => n.id === 'Bat')?.data.label).toBe('Batteries');
    expect(result.nodes.find((n) => n.id === 'ShutOff')?.data.label).toBe('Shut Off');
    expect(result.nodes.find((n) => n.id === 'BusPos')?.data.label).toBe('Bus Bar +');
    expect(result.nodes.find((n) => n.id === 'USB')?.data.label).toBe('USB-C');

    // Check that Old is a decision node (diamond shape)
    expect(result.nodes.find((n) => n.id === 'Old')?.type).toBe('decision');

    // Should have many edges (20 in the original)
    expect(result.edges.length).toBeGreaterThanOrEqual(18);

    // Check edge labels
    const batToShutoff = result.edges.find((e) => e.source === 'Bat' && e.target === 'ShutOff');
    expect(batToShutoff?.label).toBe('150a 50mm');

    // Check linkStyle applied colors
    expect(result.edges[0].style).toEqual(expect.objectContaining({ stroke: 'red' }));
  });

  it('should handle dotted arrow -.-> ', () => {
    const input = `
            flowchart TD
            A -.-> B
        `;
    const result = parseMermaid(input);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].style).toEqual(expect.objectContaining({ strokeDasharray: '5 3' }));
  });

  it('should handle thick arrow ==>', () => {
    const input = `
            flowchart TD
            A ==> B
        `;
    const result = parseMermaid(input);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].style).toEqual(expect.objectContaining({ strokeWidth: 4 }));
  });

  it('should handle thick arrow ==> with inline label', () => {
    const input = `
            flowchart TD
            A == Yes ==> B
        `;
    const result = parseMermaid(input);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].style).toEqual(expect.objectContaining({ strokeWidth: 4 }));
    expect(result.edges[0].label).toBe('Yes');
  });

  it('should handle reverse arrow <-- with markerStart', () => {
    const input = `
            flowchart TD
            A <-- B
        `;
    const result = parseMermaid(input);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].markerStart).toBeDefined();
    expect(result.edges[0].markerEnd).toBeUndefined();
  });

  it('should handle bidirectional arrow <--> with both markers', () => {
    const input = `
            flowchart TD
            A <--> B
        `;
    const result = parseMermaid(input);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].markerStart).toBeDefined();
    expect(result.edges[0].markerEnd).toBeDefined();
  });

  it('should handle multiline quoted strings', () => {
    const input = `
            graph TD
            A["Line 1
            Line 2"]
        `;
    const result = parseMermaid(input);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].data.label).toBe('Line 1\nLine 2');
  });

  it('should handle the Service Learning example', () => {
    const input = `graph TB
A("Do you think online service
learning is right for you?")
B("Do you have time to design
a service learning component?")
C("What is the civic or public purpose of your discipline?
How do you teach that without service learning?")
D("Do you have departmental or school
support to plan and implement service learning?")
E["Are you willing to be a trailblazer?"]
F["What type of service learning to you want to plan?"]

A==Yes==>B
A--No-->C
B==Yes==>D
B--No-->E
D--Yes-->F
D--No-->E
E--Yes-->F
E--No-->C`;

    const result = parseMermaid(input);

    // Should parse 6 nodes
    expect(result.nodes).toHaveLength(6);
    // ID A should have multiline label
    const nodeA = result.nodes.find((n) => n.id === 'A');
    expect(nodeA).toBeDefined();
    expect(nodeA?.data.label).toContain('online service\nlearning');

    // Should parse 8 edges
    expect(result.edges).toHaveLength(8);

    // Check specific edges
    const startYes = result.edges.find((e) => e.source === 'A' && e.target === 'B');
    expect(startYes).toBeDefined();
    expect(startYes?.label).toBe('Yes');
    expect(startYes?.style?.strokeWidth).toBe(4); // ==> is thick

    const startNo = result.edges.find((e) => e.source === 'A' && e.target === 'C');
    expect(startNo).toBeDefined();
    expect(startNo?.label).toBe('No');
  });

  it('emits diagnostics for malformed flowchart blocks and unrecognized lines', () => {
    const input = `
      flowchart TD
      subgraph
        A --> B
      orphan text
      end
      end
    `;

    const result = parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.diagnostics?.some((message) => message.includes('Invalid flowchart subgraph declaration at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Unrecognized flowchart line at line'))).toBe(true);
    expect(result.diagnostics?.some((message) => message.includes('Unexpected flowchart block closer at line'))).toBe(true);
  });

  it('emits diagnostics when flowchart subgraph blocks are left unclosed', () => {
    const input = `
      flowchart TD
      subgraph api[API]
        A --> B
    `;

    const result = parseMermaid(input);
    expect(result.error).toBeUndefined();
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.diagnostics?.some((message) => message.includes('Unclosed flowchart block detected'))).toBe(true);
  });
});
