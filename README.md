# RetinaVision AI

> AI-Powered Retinal Disease Detection — Built for hospitals, trusted by ophthalmologists.

## Overview

RetinaVision AI is a futuristic web application that uses deep learning to detect retinal diseases from fundus images. The system classifies images into 6 disease categories with explainable AI (Grad-CAM heatmaps) and generates professional medical reports.

## Features

- **AI Image Analysis** — Upload retinal images for instant deep learning classification
- **Explainable AI** — Grad-CAM heatmaps visualize which retinal regions influenced the prediction
- **Medical Reports** — Auto-generated professional reports with diagnosis, risk assessment, and treatment guidance
- **Analysis History** — Track and review all past analyses with search and filtering
- **Performance Metrics** — Training curves, confusion matrix, per-class radar charts
- **Settings & Configuration** — Dark mode, notifications, language preferences

## Disease Classes

| Class | Description |
|-------|-------------|
| Normal | Healthy retina with no abnormalities |
| Retinoblastoma | Rare childhood retinal cancer |
| Uveal Melanoma | Most common primary intraocular malignancy in adults |
| Retinal Capillary Hemangioma | Benign vascular tumor of the retina |
| Choroidal Osteoma | Rare benign ossifying tumor |
| Choroidal Hemangioma | Benign vascular tumor of the choroid |

## Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| TypeScript | Type-safe development |
| Tailwind CSS 4 | Utility-first styling |
| Framer Motion | Animations |
| Recharts | Data visualization |
| Vite | Build tool |

### AI / Backend (Model)

| Technology | Purpose |
|-----------|---------|
| PyTorch | Deep learning framework |
| EfficientNet-B0 | Base CNN architecture |
| Grad-CAM | Explainable AI visualization |
| Python | Model training and inference |

## Project Structure

```
retinavision-ai/
├── client/
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       │   ├── ui/          # shadcn/ui primitives
│       │   └── DashboardLayout.tsx
│       ├── pages/           # Route-level pages
│       │   ├── LandingPage.tsx
│       │   ├── ImageAnalysis.tsx
│       │   ├── HistoryPage.tsx
│       │   ├── ReportsPage.tsx
│       │   ├── MetricsPage.tsx
│       │   ├── SettingsPage.tsx
│       │   └── AboutPage.tsx
│       ├── hooks/           # Custom React hooks
│       ├── lib/             # Utility functions
│       ├── contexts/        # React contexts
│       ├── App.tsx          # Routes & layout
│       ├── index.css        # Global styles & design tokens
│       └── main.tsx         # Entry point
├── server/                  # Backend server (placeholder)
├── shared/                  # Shared types & constants
├── package.json
├── tsconfig.json
├── vite.config.ts
├── requirements.txt         # Python dependencies for ML model
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Python 3.11+ (for ML backend)

### Frontend Setup

```bash
pnpm install
pnpm dev
```

The development server starts at `http://localhost:3000`.

### Production Build

```bash
pnpm build
pnpm start
```

### ML Backend Setup (for real inference)

```bash
pip install -r requirements.txt
```

## Design System

RetinaVision AI uses the **"Clinical Nebula"** design system:

- **Background**: Deep cosmic dark (#0B1220)
- **Accent**: Luminous blue (#3B82F6)
- **Typography**: DM Sans (headings), Inter (body), JetBrains Mono (data)
- **UI Pattern**: Glassmorphism floating panels with frosted glass effects
- **Animations**: Purposeful, physics-based transitions

## Screenshots

The application includes:

- **Landing Page** — Cinematic hero with animated retina illustration, features grid, technology section, and CTA
- **Dashboard** — Persistent sidebar with navigation, top bar with user info
- **Image Analysis** — Drag-and-drop upload, AI prediction with animated probability bars, Grad-CAM visualization, medical report
- **History** — Searchable table of past analyses
- **Performance Metrics** — Training curves, confusion matrix, per-class radar chart
- **Settings** — Dark mode, notifications, language configuration
- **About** — Technology stack, methodology, model performance summary

## License

MIT

## Disclaimer

This application is designed for research and educational purposes. It should not be used as a substitute for professional medical diagnosis. Always consult a qualified ophthalmologist for clinical decisions.
