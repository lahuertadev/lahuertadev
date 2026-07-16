import React from 'react';
import packageJson from '../../../package.json';
const { version } = packageJson;

const Footer = () => {
  return (
    <footer className="w-full sm:ml-[65px] sm:w-[calc(100%-65px)] py-4 mt-auto bg-surface-low border-t border-border-subtle flex items-center justify-between px-8">
      <p className="text-xs font-medium text-on-surface-muted">La Huerta</p>
      <div className="flex items-center gap-2 px-3 py-1 bg-surface-card rounded-full border border-border-subtle">
        <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-[0.625rem] font-bold text-on-surface-muted uppercase tracking-tighter">Sistemas operativos</span>
      </div>
    </footer>
  );
};

export default Footer;
