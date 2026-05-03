# AGENTS.md

## Repository Context
Zero-dependency static web app for TerraFirmaCraft anvil step calculation. No build step, no package manager dependencies.

## Critical Conventions
- **No build/install commands**: Do not run `npm install`, `yarn`, or any build tooling. The app runs directly from `index.html` in the root.
- **GitHub Pages deployment**: Serves from `main` branch `/root` directory. `.nojekyll` disables Jekyll processing. Push to `main` to deploy; no CI workflows exist.
- **Move image naming**: Step images in `/images/` follow `{sign}{delta}.png` naming (e.g., `+2.png` for +2 delta moves). Script.js references these directly; adding new moves requires matching image files.
- **No test/lint tooling**: No test framework, linter, or typechecker configured. Do not look for `npm test`, `lint`, or similar commands.
- **Result rendering**: `script.js` `renderResult` groups consecutive identical moves into a single line with a count (e.g., `軽く叩く ×3`) and total delta. Preserve this behavior when modifying result display.
- **Branch workflow**: Always work on `develop` branch. Direct pushes to `main` are blocked by pre-push hook in `.githooks/pre-push`. Merge `develop` into `main` to deploy to GitHub Pages.
