import React from 'react';

const Footer = ({ linkedinUrl, title }) => {
  return (
    <footer className="ml-[65px] w-[calc(100%-65px)] py-4 mt-auto bg-surface-low border-t border-border-subtle flex flex-wrap justify-between items-center gap-3 px-8">
      <p className="text-xs font-medium text-on-surface-muted whitespace-nowrap">
        {title}
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-on-surface-muted hover:text-blue-lahuerta transition-colors whitespace-nowrap"
        >
          LinkedIn
        </a>
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-card rounded-full border border-border-subtle whitespace-nowrap">
          <span className="w-2 h-2 shrink-0 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[0.625rem] font-bold text-on-surface-muted uppercase tracking-tighter">Sistemas operativos</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
