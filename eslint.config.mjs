import babelParser from "@babel/eslint-parser";
import babel from "@babel/eslint-plugin";
import globals from "globals";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";
import reactHooks  from "eslint-plugin-react-hooks";


export default [
  {
    files          : [ "**/*.{js,jsx,mjs,cjs,ts,tsx}" ],
    languageOptions: {
      ecmaVersion  : "latest",
      sourceType   : "module",
      parser       : babelParser,
      parserOptions: {
        babelOptions: {
          presets: ["@babel/preset-env", "@babel/preset-react"],
        },
        plugins: ["jsx"]
     },
       globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      '@babel': babel
    },
    rules: {
      "react/no-string-refs": "off"
    }
    
  }
]
