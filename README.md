# Milestone-Automation
Automatically adds a Milestone to a pull requests or issue, based on the name/pattern of the Milestone.

# Usage
Example `milestones.yml` (without patterns)
```yml
name: Milestone Automation

on:
  pull_request:
    types:
      - opened
  issues:
    types:
      - opened

jobs:
  run:
    name: Add Milestone
    runs-on: ubuntu-latest
    steps:
      - uses: Julexar/Milestone-Automation@1.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          milestone: "Milestone Name"
```

Example `milestones.yml` (with patterns)
```yml
name: Milestone Automation

on:
  pull_request:
    types:
      - opened
  issues:
    types:
      - opened

jobs:
  run:
    name: Add Milestone
    runs-on: ubuntu-latest
    steps:
      - uses: Julexar/Milestone-Automation@1.0
        with:
          token: ${{ secrets.WORKFLOW_TOKEN }}
          milestone: "Milestone *"
          regex: 'true'
```

# Inputs

| Name          | Description                                                                                   | Required | Default |
| ------------- | --------------------------------------------------------------------------------------------- | -------- | ------- |
| `token`       | GitHub Token. You can get one [here](https://github.com/settings/tokens)                      | `true`   |         |
| `milestone`   | Name of the Milestone or glob pattern                                                         | `true`   |         |
| `regex`       | Tigger pattern matching using globs with [minimatch](https://www.npmjs.com/package/minimatch) | `false`  | `false` |