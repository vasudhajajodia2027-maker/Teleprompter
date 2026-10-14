import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitleText?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  subtitleText = 'Studio',
}) => {
  const textClasses =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const dotClasses = size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5';

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className={`font-display font-medium tracking-tight text-ink flex items-center leading-none ${textClasses}`}>
        <span>First</span>
        <span className="ml-1 px-1.5 py-0.5 rounded-xs bg-marker text-ink relative inline-flex items-center font-medium">
          Take
          <span className={`${dotClasses} rounded-full bg-ink ml-1 inline-block`}></span>
        </span>
      </div>
      {showSubtitle && (
        <span className="font-label-eyebrow text-xs tracking-widest uppercase text-ink-soft hidden sm:inline-block">
          {subtitleText}
        </span>
      )}
    </div>
  );
};
