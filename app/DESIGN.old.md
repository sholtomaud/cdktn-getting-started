# CDKTN Nebula Dark Design System

> [!IMPORTANT]
> **Master Design Spec**
> This block is the source of truth for all CDKTN implementations and E2E tests.

## Overview
A high-performance, dark-mode cloud infrastructure dashboard.
Focuses on technical precision and visual depth through glassmorphism.

## Colors
```yaml
name: "Nebula Dark"
colors:
  primary: "#6366f1"
  background: "#030712"
  surface: "#111827"
  surface-border: "#374151"
  text: "#f9fafb"
  accent: "#8b5cf6"
  success: "#10b981"
  error: "#ef4444"
```

## Typography
```yaml
typography:
  h1:
    fontFamily: "Inter, sans-serif"
    fontSize: "38.4px"
    fontWeight: 800
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
```

## Layout
The palette is rooted in deep indigo neutrals with vibrant technical accents.

## Elevation & Depth
Depth is achieved through glassmorphism — not drop shadows.

## Shapes
```yaml
rounded:
  md: "20px"
```

## Spacing
```yaml
spacing:
  card-pad: "48px 56px"
```

## Components
### Card
The primary content container. One per page.

## Do's and Don'ts
- **Do** apply the accent gradient.
