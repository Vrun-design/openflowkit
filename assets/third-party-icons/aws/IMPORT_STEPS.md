# AWS Official Pack Import Steps

Use this when environment networking is unavailable and assets must be dropped manually.

## 1) Download official package

- Open: https://aws.amazon.com/architecture/icons/
- Download the latest official asset package zip.

## 2) Place files locally

1. Put the zip in: `assets/third-party-icons/aws/raw/`
2. Extract SVGs into: `assets/third-party-icons/aws/processed/`

Layout convention (matches how `providerCatalog.ts` derives shapeIds — `category/filename`):

- **Architecture-Service**: flatten so each service category sits directly at the
  `processed/` root (e.g. `processed/Compute/Lambda.svg` → shapeId `compute-lambda`).
  Do **not** keep an `Architecture-Service/` wrapper folder, or every service id would
  gain an `architecture-service-` prefix and collapse into one catalog category.
- **Architecture-Group**, **Category**, **Resource**: keep as their own top-level
  folders under `processed/` (e.g. `processed/Resource/Compute/EC2_Instance.svg` →
  shapeId `resource-compute-ec2-instance`, category "Resource"). The `Category` and
  `Architecture Group` sets are excluded from icon auto-matching in `iconMatcher.ts`.

When AWS renames a category, the derived shapeId prefix changes; grep `src/` for any
hard-coded `archIconShapeId` / `archResourceType` referencing the old prefix and update.

## 3) Generate shape manifest

Run:

```bash
npm run shape-pack:manifest -- \
  assets/third-party-icons/aws/processed \
  assets/third-party-icons/aws/processed/aws-starter-pack.manifest.json \
  aws-official-starter-v1 \
  "AWS Official Starter Pack" \
  1.0.0 \
  "Amazon Web Services"
```

## 4) Validate before wiring

Run:

```bash
npx tsc -b --pretty false
npm run test -- --run \
  src/services/shapeLibrary/ingestionPipeline.test.ts \
  src/services/shapeLibrary/manifestValidation.test.ts \
  src/services/templates.selector.test.ts
```
