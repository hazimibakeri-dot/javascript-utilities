# Contributing

Thanks for helping improve this library. Bug reports with a failing example, documentation fixes
and focused pull requests are all welcome.

## Before you start

- For a new utility, open an issue first. A good candidate is small, broadly useful, has no
  runtime dependencies, and is not already well covered by a standard API.
- Keep pull requests focused on one change.
- Do not include credentials, personal data or code you do not have the right to share.

## Setup

```bash
npm install
npm test
```

Use the Node.js version in `.nvmrc`.

## Checks

```bash
npm run check
```

This runs the TypeScript check, ESLint, the Prettier format check, the tests with coverage
thresholds, and the build. CI runs the same steps plus the example script.

## Guidelines

- Write strict TypeScript and add a JSDoc comment with an example for every exported function.
- Decide and document what happens with invalid input (throw a `RangeError`, or return `null` or
  `false`). Never return `NaN` or an invalid `Date` silently.
- Accept explicit `locale` and `timeZone` options wherever output depends on them.
- Do not mutate arguments.
- Add tests for normal use, edge cases (empty input, boundaries, Unicode, daylight saving time)
  and invalid input. Tests run in the `America/New_York` time zone.
- Update the API section and, if needed, the limitations section of the README.

## Commit messages

Use short, imperative subjects, for example `Add isPostalCode validator` or
`Fix truncate for combining characters`.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
