import { business } from '../src/config/business';
import { publicationMediaRights } from '../src/content/publication-media';
import { publicationIssues } from '../src/lib/publication';

const issues = publicationIssues(business, publicationMediaRights);
if (issues.length) {
  console.error(`Publicare blocată:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.info('Configurația și drepturile media permit verificarea finală înainte de publicare.');
}
