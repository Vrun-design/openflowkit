# OpenCanvas Geometry Domain

Pure, renderer-independent 2D geometry used by future document, scene, connector,
selection, and renderer adapters.

## Conventions

- every persisted or constructed number must be finite.
- sizes and bounds allow zero but never negative width or height.
- bounds use top-left `x` / `y` plus non-negative `width` / `height`.
- touching bounds intersect; their intersection may have zero area.
- rotation is always named `rotationRadians`; adapters perform any degree conversion.
- transforms apply scale, then rotation, then translation.
- matrix multiplication applies the right matrix first, then the left matrix.
- singular matrix inversion returns `null`.
- path helpers operate on domain points, never SVG path strings or renderer objects.
- direct module imports are intentional; there is no barrel that can hide cycles.

These modules are unused in CS-002. Runtime adoption begins only through later,
flagged adapters.
