let audioContext: AudioContext | null = null;
let userHasInteracted = false;

if (typeof window !== 'undefined') {
  const handleInteraction = () => {
    userHasInteracted = true;
    document.removeEventListener('click', handleInteraction);
    document.removeEventListener('keydown', handleInteraction);
    document.removeEventListener('touchstart', handleInteraction);
  };

  document.addEventListener('click', handleInteraction, { once: true });
  document.addEventListener('keydown', handleInteraction, { once: true });
  document.addEventListener('touchstart', handleInteraction, { once: true });
}

export function playNotificationSound(): void {
  if (typeof window === 'undefined' || !document.hasFocus() || !userHasInteracted) {
    return;
  }

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as { AudioContext: typeof AudioContext }).AudioContext)();
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);

    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gainNode.gain.setValueAtTime(0.4, now + 0.2);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}
