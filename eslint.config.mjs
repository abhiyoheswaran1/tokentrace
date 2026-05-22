import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    ignores: [".next/**", "dist/**", "node_modules/**", "coverage/**", "next-env.d.ts"]
  }
];

export default eslintConfig;
