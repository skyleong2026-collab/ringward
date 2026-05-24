export const animationStyles = `
  @keyframes aura-pulse {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(126, 211, 33, 0.3)); }
    50% { filter: drop-shadow(0 0 16px rgba(126, 211, 33, 0.7)); }
  }

  @keyframes level-up-banner {
    0% { transform: translateY(-20px); opacity: 0; }
    15% { transform: translateY(0); opacity: 1; }
    85% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-20px); opacity: 0; }
  }

  @keyframes card-bounce {
    0%, 100% { transform: scale(1) translateY(0); }
    25% { transform: scale(1.1) translateY(-8px); }
    50% { transform: scale(1.08) translateY(-4px); }
  }

  @keyframes level-flash {
    0% { background: rgba(212, 175, 55, 0.2); }
    100% { background: rgba(212, 175, 55, 0); }
  }

  .pulse-aura {
    animation: aura-pulse 0.6s ease-in-out;
  }

  .level-up-text {
    animation: level-up-banner 2s ease-out;
  }

  .bounce-card {
    animation: card-bounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .level-flash {
    animation: level-flash 0.5s ease-out;
  }
`;
