export const animationStyles = `
  @keyframes aura-pulse {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(126, 211, 33, 0.3)); }
    50% { filter: drop-shadow(0 0 16px rgba(126, 211, 33, 0.7)); }
  }

  @keyframes level-up-banner {
    0% { transform: translateY(-12px); opacity: 0; }
    20% { transform: translateY(0); opacity: 1; }
    80% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-12px); opacity: 0; }
  }

  @keyframes card-bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  .pulse-aura {
    animation: aura-pulse 0.6s ease-in-out;
  }

  .level-up-text {
    animation: level-up-banner 2s ease-out;
  }

  .bounce-card {
    animation: card-bounce 0.4s ease-out;
  }
`;
