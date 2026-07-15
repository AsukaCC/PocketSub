import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var storedTheme = window.localStorage.getItem('@pocketsub/theme-v1');
    var theme = storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.themePending = theme === 'dark' ? 'true' : 'false';
    root.style.colorScheme = theme;
    root.style.backgroundColor = theme === 'dark' ? '#111315' : '#f4f6f8';
    window.setTimeout(function () {
      delete root.dataset.themePending;
    }, 2000);
  } catch (_) {}
})();
`;

const THEME_BOOTSTRAP_STYLE = `
html[data-theme='dark'][data-theme-pending='true'] #root {
  visibility: hidden;
}
`;

export default function Root({ children }: PropsWithChildren) {
  const { bodyAttributes, bodyNodes, headNodes, htmlAttributes } = useServerDocumentContext();

  return (
    <html {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_STYLE }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
