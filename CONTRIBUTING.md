# Contributing to GitSave

Thank you for contributing to GitSave! This document outlines the process for contributing to the project and how to set up your development environment.

## Setting up your development environment

1. **Fork this repository**\
    You can do that in GitHub itself.

3. **Clone your forked repository**
   ```
   git clone https://github.com/<YOUR USERNAME>/GitSave && cd GitSave
   ```

4. **Install dependencies**
   ```
   npm install
   ```

5. **Set up the database**
   ```
   npx prisma push
   ```

6. **Run the development server**
   For frontend development only:
   ```
   npm run dev
   ```
   
   or for the production environment (with available backend):
   ```
   npm run build && node server.js
   ```

7. **Run the tests**
   The test suite covers the backend API, services, middlewares and the React components. It uses an isolated temporary SQLite database, so your local `data/GitSave.db` is never touched and no environment setup is required.
   ```
   npm test              # unit + integration tests (Vitest)
   npm run test:watch    # re-run on file changes
   npm run test:coverage # run with a coverage report
   ```
   End-to-end tests drive the real app in a headless browser (Playwright). They build the app, start it on port 3100 with a throw-away database and cover the setup, login, schedule, access token and settings flows.
   ```
   npx playwright install chromium  # one time: download the browser
   npm run test:e2e
   npm run test:all                 # unit + end-to-end
   ```
   Please make sure `npm test` passes before opening a pull request.

## Making Contributions

1. Create a new branch for your feature or bug fix:
   ```
   git checkout -b your-contribution-name
   ```

2. Make your changes and commit them with a clear, descriptive commit message.

3. Push your changes to your fork:
   ```
   git push origin your-contribution-name
   ```

4. Open a pull request against the main repository.

## Reporting issues

If you find a bug or have a suggestion for improvement, please open an issue in the GitHub repository.

## Questions?

If you have any questions about contributing, feel free to open an issue or contact the maintainer per [email](mailto:contact@witzdam.com). 
