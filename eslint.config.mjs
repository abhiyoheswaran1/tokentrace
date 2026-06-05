import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } }
      ]
    }
  },
  {
    ignores: [".next/**", "dist/**", "node_modules/**", "coverage/**", "next-env.d.ts"]
  }
];

export default eslintConfig;
