// docx -> pdf through LibreOffice in Docker (image built from docker/pdf).
import { $ } from "bun";
import { basename, dirname } from "node:path";

export const PDF_IMAGE = "ref-office-pdf:1";

export async function toPdf(docxPath: string): Promise<string> {
  const dir = dirname(docxPath);
  await $`docker run --rm -v ${dir}:/work ${PDF_IMAGE} --convert-to pdf --outdir /work /work/${basename(docxPath)}`.quiet();
  const pdf = docxPath.replace(/\.docx$/i, ".pdf");
  if (!(await Bun.file(pdf).exists())) throw new Error(`LibreOffice produced no PDF for ${basename(docxPath)}`);
  return pdf;
}
