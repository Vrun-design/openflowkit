import React from 'react';
import {
  CLASS_MARKER_ARROW_FILLED,
  CLASS_MARKER_ARROW_OPEN,
  CLASS_MARKER_DIAMOND_FILLED,
  CLASS_MARKER_DIAMOND_OPEN,
  CLASS_MARKER_TRIANGLE_OPEN,
  ER_MARKER_BAR,
  ER_MARKER_CIRCLE,
  ER_MARKER_CROW,
} from './classRelationSemantics';
interface EdgeMarkerDefsProps {
  standardMarkers: {
    defs: Array<{ id: string; width: number; height: number; side: string; color: string }>;
  };
}

export function EdgeMarkerDefs({ standardMarkers }: EdgeMarkerDefsProps): React.ReactElement {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <marker
          id={CLASS_MARKER_ARROW_FILLED}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
        </marker>
        <marker
          id={CLASS_MARKER_ARROW_OPEN}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M1,1 L9,5 L1,9" fill="none" stroke="context-stroke" strokeWidth="1.5" />
        </marker>
        <marker
          id={CLASS_MARKER_TRIANGLE_OPEN}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M1,1 L10,6 L1,11 z" fill="white" stroke="context-stroke" strokeWidth="1.5" />
        </marker>
        <marker
          id={CLASS_MARKER_DIAMOND_OPEN}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M1,6 L5.5,1 L10,6 L5.5,11 z"
            fill="white"
            stroke="context-stroke"
            strokeWidth="1.5"
          />
        </marker>
        <marker
          id={CLASS_MARKER_DIAMOND_FILLED}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M1,6 L5.5,1 L10,6 L5.5,11 z" fill="context-stroke" />
        </marker>
        <marker
          id={ER_MARKER_BAR}
          markerWidth="8"
          markerHeight="12"
          refX="6"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M1,1 L1,11" fill="none" stroke="context-stroke" strokeWidth="1.6" />
        </marker>
        <marker
          id={ER_MARKER_CIRCLE}
          markerWidth="12"
          markerHeight="12"
          refX="9"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <circle cx="4" cy="6" r="2.7" fill="white" stroke="context-stroke" strokeWidth="1.4" />
        </marker>
        <marker
          id={ER_MARKER_CROW}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M1,1 L10,6 L1,11 M1,6 L10,6"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.4"
          />
        </marker>
        {standardMarkers.defs.map((markerDef) => (
          <marker
            key={markerDef.id}
            id={markerDef.id}
            markerWidth={markerDef.width}
            markerHeight={markerDef.height}
            refX={markerDef.side === 'end' ? markerDef.width - 1 : 1}
            refY={markerDef.height / 2}
            orient={markerDef.side === 'start' ? 'auto-start-reverse' : 'auto'}
            markerUnits="userSpaceOnUse"
          >
            <path
              d={`M0,0 L${markerDef.width},${markerDef.height / 2} L0,${markerDef.height} z`}
              fill={markerDef.color}
            />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
