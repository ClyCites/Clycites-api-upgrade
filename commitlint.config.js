module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',      // A new feature
        'fix',       // A bug fix
        'docs',      // Documentation only changes
        'style',     // Changes that don't affect code meaning (formatting, etc)
        'refactor',  // Code change that neither fixes a bug nor adds a feature
        'perf',      // Code change that improves performance
        'test',      // Adding missing tests or correcting existing tests
        'chore',     // Changes to build process, dependencies, tooling
        'ci',        // Changes to CI configuration files and scripts
        'revert',    // Revert a previous commit
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'always', 'lower-case'],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
  },
  prompt: {
    questions: {
      type: {
        description: "Select the type of change that you're committing",
        enum: {
          feat: {
            description: "A new feature",
            title: "Features",
            emoji: "✨",
          },
          fix: {
            description: "A bug fix",
            title: "Bug Fixes",
            emoji: "🐛",
          },
          docs: {
            description: "Documentation only changes",
            title: "Documentation",
            emoji: "📚",
          },
          style: {
            description:
              "Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)",
            title: "Styles",
            emoji: "💎",
          },
          refactor: {
            description:
              "A code change that neither fixes a bug nor adds a feature",
            title: "Code Refactoring",
            emoji: "📦",
          },
          perf: {
            description: "A code change that improves performance",
            title: "Performance Improvements",
            emoji: "🚀",
          },
          test: {
            description: "Adding missing tests or correcting existing tests",
            title: "Tests",
            emoji: "🧪",
          },
          chore: {
            description:
              "Changes to the build process or auxiliary tools such as change generation mechanisms",
            title: "Chores",
            emoji: "🔧",
          },
          ci: {
            description: "Changes to CI configuration files and scripts",
            title: "CI",
            emoji: "⚙️",
          },
        },
      },
      scope: {
        description: "What is the scope of this change (optional)?",
      },
      subject: {
        description: "Write a short, imperative tense description of the change",
      },
      body: {
        description: "Provide a longer description of the change (optional)",
      },
      isBreaking: {
        description: "Are there any breaking changes?",
      },
      breakingBody: {
        description:
          "A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself",
      },
      breaking: {
        description: "Describe the breaking changes",
      },
      isIssueAffected: {
        description: "Does this change affect any open issues?",
      },
      issuesBody: {
        description:
          "If issues are closed, the commit requires a body. Please enter a longer description of the commit itself",
      },
      issues: {
        description: "Add issue references (e.g. fixes #123, resolves #456)",
      },
    },
  },
};
