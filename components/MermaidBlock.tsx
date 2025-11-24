
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  
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

        // SANITIZATION: Fix common LLM output issues with Chinese punctuation
        // Using explicit unicode escapes to avoid file encoding/copy-paste issues
        const cleanCode = code
            .replace(/\uFF1A/g, ':') // Full-width colon (：)
            .replace(/\uFF0C/g, ',') // Full-width comma (，)
            .replace(/\uFF1B/g, ';') // Full-width semicolon (；)
            .replace(/\uFF08/g, '(') // Full-width (
            .replace(/\uFF09/g, ')') // Full-width )
            .replace(/\u00A0/g, ' ') // Non-breaking space
            .replace(/\u3000/g, ' '); // Ideographic space

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, cleanCode);
        
        if (mountedRef.current) {
            setSvg(svg);
        }
      } catch (err) {
        console.warn("Mermaid Render Error:", err);
        if (mountedRef.current) {
            setError("Failed to render diagram. Syntax might be incorrect.");
        }
      } finally {
        if (mountedRef.current) {
            setLoading(false);
        }
      }
    };

    renderDiagram();
  }, [code, theme]);

  if (error) {
      return (
          <div className="border-2 border-red-500 bg-red-100/10 p-2 text-xs font-mono text-red-500 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle size={16} /> Rendering Failed
              </div>
              <div className="opacity-80">
                  The model generated invalid Mermaid syntax (likely special characters).
              </div>
              <pre className="p-2 bg-black/20 overflow-x-auto text-[10px] select-all whitespace-pre-wrap">
                  {code}
              </pre>
          </div>
      );
  }

  return (
    <div className={`
        relative my-4 p-4 border-2 border-black overflow-x-auto
        ${theme === Theme.LIGHT ? 'bg-white/50' : 'bg-black/20'}
    `}>
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-inherit z-10 opacity-70">
                <Loader2 className="animate-spin text-current" />
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
