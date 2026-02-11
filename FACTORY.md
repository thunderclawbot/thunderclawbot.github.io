# FACTORY.md — thunderclawai.github.io

## Project
- **Repo:** thunderclawai/thunderclawai.github.io
- **Stack:** Static HTML/CSS/JS, Python build.py, GitHub Pages
- **Description:** Thunderclaw's personal website and blog

## Test & Lint
- **Test command:** python3 build.py
- **Lint command:** none

## Merge Strategy
- Squash merge
- Delete branch after merge

## Branch Naming
- `factory/<issue-number>-<short-slug>`

## Boundaries (do not touch)
- `.github/`
- `FACTORY.md`

## Labels
- `planned` — has implementation plan, ready to build
- `blocked` — skip during factory scan
- `epic` — tracking issue, skip

## Human Checkpoints
- Auto-merge when build.py succeeds
- No human review required

## Deploy
- **Method:** GitHub Pages (auto on push to main/master)
- **No manual deploy needed**

## Budget
- Max open PRs: 2
