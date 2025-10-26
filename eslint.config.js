module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        // Browser globals
        browser: true,
        document: "readonly",
        window: "readonly",
        console: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        Event: "readonly",
        FileReader: "readonly",
        Blob: "readonly",
        URL: "readonly",
        FormData: "readonly",
        navigator: "readonly",
        performance: "readonly",
        setInterval: "readonly",
        URLSearchParams: "readonly",

        // Library globals
        Chart: "readonly",

        // Custom project globals from auth-common.js etc.
        initPage: "readonly",
        showNotification: "readonly",
        apiRequest: "readonly",
        handleLogout: "readonly",
        currentUser: "writable",
        sessionToken: "writable",
        CONFIG: "readonly",
        WORKER_URL: "readonly",
        escapeHtml: "readonly",
        
        // Globals from other files that need to be defined
        initClientsExtended: "readonly",
        loadClientsExtended: "readonly",
        faqData: "readonly",
        initUnifiedTasks: "readonly",
        formatDate: "readonly",
        getStatusText: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "args": "none", "varsIgnorePattern": "^_" }],
      "no-undef": "warn"
    }
  }
];
