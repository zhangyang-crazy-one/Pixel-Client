import React, { useEffect, useState, useRef } from 'react';
// We use the global variable from the script tag
declare const mermaid: any;

import { Theme } from '../types';
import { THEME_STYLES } from '../constants';
import { Loader2, AlertTriangle } from 'lucide-react';

interface MermaidBlockProps {
  code: string;
  theme: Theme;
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, theme }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Extract hex colors from current theme styles
  const getThemeColors = () => {
      const style = THEME_STYLES[theme];
      
      const extractColor = (cls: string) => {
          const match = cls.match(/\[(#[0-9a-fA-F]{6})\]/);
          return match ? match[1] : null;
      };

      const bg = extractColor(style.bg) || '#ffffff';
      const text = extractColor(style.text) || '#000000';
      const primary = extractColor(style.primary) || '#ff00ff';
      const secondary = extractColor(style.secondary) || '#cccccc';
      const border = extractColor(style.border) || '#000000';
      const accent = extractColor(style.accent) || '#00ffff';
      
      return { bg, text, primary, secondary, border, accent };
  };

  useEffect(() => {
    const renderDiagram = async () => {
      // Ensure mermaid is loaded
      if (typeof mermaid === 'undefined') {
          setError("Mermaid library not loaded.");
          setLoading(false);
          return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const colors = getThemeColors();
        const isDark = theme !== Theme.LIGHT;

        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: '"VT323", monospace',
          themeVariables: {
              darkMode: isDark,
              background: colors.bg,
              primaryColor: colors.secondary,
              primaryTextColor: colors.text,
              primaryBorderColor: colors.border,
              lineColor: isDark ? colors.accent : colors.text,
              secondaryColor: colors.primary,
              tertiaryColor: colors.bg,
              mainBkg: colors.bg,
              nodeBorder: colors.border,
              clusterBkg: colors.bg,
              clusterBorder: colors.border,
              titleColor: colors.accent,
              edgeLabelBackground: colors.bg,
              fontFamily: '"VT323", monospace',
              fontSize: '16px'
          }
        });

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid Render Error:", err);
        setError("Failed to render diagram. Syntax might be incorrect.");
      } finally {
        setLoading(false);
      }
    };

    renderDiagram();
  }, [code, theme]);

  if (error) {
      return (
          <div className="border-2 border-red-500 bg-red-100/10 p-2 text-xs font-mono text-red-500 flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <pre className="ml-2 opacity-50 text-[10px]">{code.substring(0, 50)}...</pre>
          </div>
      );
  }

  return (
    <div className={`
        relative my-4 p-4 border-2 border-black overflow-x-auto
        ${theme === Theme.LIGHT ? 'bg-white/50' : 'bg-black/20'}
    `}>
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-inherit z-10">
                <Loader2 className="animate-spin" />
            </div>
        )}
        <div 
            ref={containerRef}
            className="mermaid-output flex justify-center min-w-min"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    </div>
  );
};