const dialog = document.querySelector<HTMLDialogElement>('.lightbox');
if (dialog) {
  const image = dialog.querySelector<HTMLImageElement>('[data-full-image]');
  const caption = dialog.querySelector<HTMLElement>('#lightbox-caption');
  const close = dialog.querySelector<HTMLButtonElement>('[data-close]');
  const error = dialog.querySelector<HTMLElement>('[data-lightbox-error]');
  if (!image || !caption || !close || !error) throw new Error('Structura galeriei este incompletă.');
  image.addEventListener('error', () => {
    error.hidden = false;
    console.warn('Fotografia mărită nu s-a putut încărca:', image.src);
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-gallery-image]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      error.hidden = true;
      image.alt = link.dataset.alt ?? '';
      image.src = link.href;
      caption.textContent = link.dataset.caption ?? '';
      dialog.showModal();
      close.focus();
    });
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
}
