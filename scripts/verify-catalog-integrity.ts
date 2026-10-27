import {
  auditCatalogSeeds,
  formatCatalogIntegrityReport,
} from '../src/data/catalogIntegrity';

const report = auditCatalogSeeds();
console.log(formatCatalogIntegrityReport(report));

if (!report.ok) {
  process.exit(1);
}
