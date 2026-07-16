import type { Config } from "tailwindcss";

const config: Config = {
  // 'media'면 dark: 변형이 OS 설정만 따라가 앱 안의 테마 토글을 무시한다.
  // html[data-theme]에 묶어야 CSS 변수와 dark: 변형이 같이 움직인다.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ['Pretendard Variable', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
