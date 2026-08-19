export type CanvasRenderer = 'reactflow' | 'opencanvas';

export function requestedCanvasRenderer(search: string): CanvasRenderer {
  return new URLSearchParams(search).get('renderer') === 'opencanvas'
    ? 'opencanvas'
    : 'reactflow';
}

export function canvasRendererLocation(
  pathname: string,
  search: string,
  renderer: CanvasRenderer
): string {
  const params = new URLSearchParams(search);
  if (renderer === 'opencanvas') params.set('renderer', renderer);
  else params.delete('renderer');
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}
