// Kept free of image imports so the release gate also runs outside Astro.
export const publicationMediaRights = [
  'patrula', 'race', 'casa', 'unicorn', 'tren', 'castel', 'mini-monstru', 'lateral', 'detaliu',
].map((id) => ({
  id,
  displayApproved: true,
  thirdPartyCleared: false,
}));
