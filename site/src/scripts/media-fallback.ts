for (const image of document.querySelectorAll<HTMLImageElement>('[data-media] img')) {
  const showError = () => {
    const container = image.closest<HTMLElement>('[data-media]');
    if (container) container.dataset.mediaError = 'true';
    console.warn('Imagine indisponibilă:', image.currentSrc || image.src);
  };
  image.addEventListener('error', showError, { once: true });
  if (image.complete && !image.naturalWidth) showError();
}
