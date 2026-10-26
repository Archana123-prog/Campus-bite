const KEY = 'campusbite-theme';

export function initTheme() {
  const saved = localStorage.getItem(KEY);
  const dark = saved !== 'light';
  document.documentElement.classList.toggle('dark', dark);
}

export const isDark = () => document.documentElement.classList.contains('dark');

export function toggleTheme() {
  const dark = !isDark();
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem(KEY, dark ? 'dark' : 'light');
  return dark;
}
