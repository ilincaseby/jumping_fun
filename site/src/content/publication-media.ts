import { gallerySources } from './gallery-sources';

// Permissions and image consents confirmed by the user on 2026-10-28.
export const publicationMediaRights = [
  'patrula', 'race', 'casa', 'unicorn', 'tren', 'castel', 'mini-monstru',
  'patrula-interior', 'lateral', 'detaliu', 'anpc-sal',
  ...gallerySources.map((photo) => photo.id),
].map((id) => ({
  id,
  displayApproved: true,
  thirdPartyCleared: true,
}));
