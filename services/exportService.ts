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

    if (node.type === 'decision') { shapeStart = '{'; shapeEnd = '}'; }
    else if (node.type === 'start' || node.type === 'end') { shapeStart = '(['; shapeEnd = '])'; }

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
    let type = 'rectangle';

    if (node.type === 'decision') type = 'diamond';
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
