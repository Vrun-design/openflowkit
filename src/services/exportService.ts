import { Node, Edge } from 'reactflow';

const sanitizeLabel = (label: string) => {
  return label.replace(/['"()]/g, '').trim() || 'Node';
};

const sanitizeId = (id: string) => {
  return id.replace(/[-]/g, '_');
};

export const toMermaid = (nodes: Node[], edges: Edge[]) => {
  let mermaid = 'flowchart TD\n';

  nodes.forEach((node) => {
    const label = sanitizeLabel(node.data.label);
    const id = sanitizeId(node.id);
    let shapeStart = '[';
    let shapeEnd = ']';

    const shape = node.data.shape || 'rounded';
    const type = node.type;

    if (shape === 'diamond') { shapeStart = '{'; shapeEnd = '}'; }
    else if (shape === 'hexagon') { shapeStart = '{{'; shapeEnd = '}}'; }
    else if (shape === 'cylinder') { shapeStart = '[('; shapeEnd = ')]'; }
    else if (shape === 'ellipse') { shapeStart = '(['; shapeEnd = '])'; }
    else if (shape === 'circle') { shapeStart = '(('; shapeEnd = '))'; }
    else if (shape === 'parallelogram') { shapeStart = '>'; shapeEnd = ']'; } // asymmetric
    // Fallback based on type if no specific shape
    else if (type === 'decision') { shapeStart = '{'; shapeEnd = '}'; }
    else if (type === 'start' || type === 'end') { shapeStart = '(['; shapeEnd = '])'; }

    mermaid += `    ${id}${shapeStart}"${label}"${shapeEnd}\n`;
  });

  edges.forEach((edge) => {
    const source = sanitizeId(edge.source);
    const target = sanitizeId(edge.target);
    if (edge.label) {
      const label = sanitizeLabel(edge.label as string);
      mermaid += `    ${source} -->|"${label}"| ${target}\n`;
    } else {
      mermaid += `    ${source} --> ${target}\n`;
    }
  });

  return mermaid;
};

export const toPlantUML = (nodes: Node[], edges: Edge[]) => {
  let plantuml = '@startuml\n\n';

  nodes.forEach((node) => {
    const label = sanitizeLabel(node.data.label);
    const id = sanitizeId(node.id);
    const shape = node.data.shape;
    let type = 'rectangle';

    if (shape === 'diamond') type = 'diamond';
    else if (shape === 'cylinder') type = 'database';
    else if (shape === 'circle') type = 'circle';
    else if (shape === 'hexagon') type = 'hexagon';
    else if (shape === 'ellipse') type = 'usecase';
    else if (shape === 'parallelogram') type = 'card'; // closest mapping
    // Fallback
    else if (node.type === 'decision') type = 'diamond';
    else if (node.type === 'start' || node.type === 'end') type = 'circle';
    else if (node.type === 'custom') type = 'component';

    plantuml += `${type} "${label}" as ${id}\n`;
  });

  plantuml += '\n';

  edges.forEach((edge) => {
    const source = sanitizeId(edge.source);
    const target = sanitizeId(edge.target);
    const label = edge.label ? ` : ${sanitizeLabel(edge.label as string)}` : '';
    plantuml += `${source} --> ${target}${label}\n`;
  });

  plantuml += '\n@enduml';
  return plantuml;
};
