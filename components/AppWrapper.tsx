import React, { useState, useCallback } from 'react';
import { ToastProvider } from './Toast';
import App from '../App';
import { Theme } from '../types';

/**
 * AppWrapper - 包装 App 组件，提供 ToastProvider
 *
 * 解决 useToast 必须在 ToastProvider 内调用的架构问题
 */
export const AppWrapper: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
  }, []);

  return (
    <ToastProvider theme={theme}>
      <App onThemeChange={handleThemeChange} />
    </ToastProvider>
  );
};

export default AppWrapper;
