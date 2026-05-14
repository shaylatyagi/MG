import React from 'react';

const MobilityGridLogo = ({ width = 300, height = 100 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 350 100" 
      width={width} 
      height={height}
      className="mobility-grid-logo"
    >
      <defs>
        {/* Deep Blue to Vibrant Teal Gradient */}
        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A365D" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        
        {/* Subtle Inner Grid Pattern */}
        <pattern id="innerGrid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.2"/>
        </pattern>
      </defs>

      {/* The Monogram Icon Container */}
      <g transform="translate(10, 15)">
        {/* Hexagon Base representing structure and nodes */}
        <polygon 
          points="35,0 70,20 70,60 35,80 0,60 0,20" 
          fill="url(#brandGradient)" 
        />
        <polygon 
          points="35,0 70,20 70,60 35,80 0,60 0,20" 
          fill="url(#innerGrid)" 
        />
        
        {/* Abstract 'M' and 'G' in White */}
        <path 
          d="M 15,55 L 15,25 L 35,40 L 55,25 L 55,55" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="4" 
          strokeLinejoin="round"
        />
        {/* Forward Arrow/G element overlapping */}
        <path 
          d="M 25,65 L 35,75 L 60,50 L 45,35" 
          fill="none" 
          stroke="#4FD1C5" 
          strokeWidth="4" 
          strokeLinejoin="round"
        />
      </g>

      {/* Brand Typography */}
      <text 
        x="95" 
        y="58" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontWeight="800" 
        fontSize="32" 
        fill="#1A365D"
        letterSpacing="-0.5"
      >
        Mobility
      </text>
      <text 
        x="232" 
        y="58" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontWeight="800" 
        fontSize="32" 
        fill="#0D9488"
        letterSpacing="-0.5"
      >
        Grid
      </text>

      {/* Subtitle / Tagline */}
      <text 
        x="98" 
        y="78" 
        fontFamily="system-ui, -apple-system, sans-serif" 
        fontWeight="500" 
        fontSize="11" 
        fill="#64748B"
        letterSpacing="1.5"
        textTransform="uppercase"
      >
        Fleet Intelligence
      </text>
    </svg>
  );
};

export default MobilityGridLogo;