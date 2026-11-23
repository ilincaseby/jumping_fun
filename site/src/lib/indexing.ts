import { business } from '../config/business';
import { publicationMediaRights } from '../content/publication-media';

export function allowsIndexing(site: URL | undefined): site is URL {
  return import.meta.env.PROD
    && process.env.JUMPING_FUN_INDEXABLE === 'true'
    && site?.protocol === 'https:'
    && business.status === 'verified'
    && publicationMediaRights.every((item) => item.displayApproved && item.thirdPartyCleared);
}
