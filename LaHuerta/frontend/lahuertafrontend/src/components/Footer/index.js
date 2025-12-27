import React from 'react';

const Footer = ({ linkedinUrl, title, icon }) => {
  return (
    <footer className="p-5 text-center w-full bottom-0 text-white">
      <a 
        href={linkedinUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center justify-center space-x-2"
      >
        {icon}
      </a>
      <p>{title}</p>
    </footer>
  );
};

export default Footer;