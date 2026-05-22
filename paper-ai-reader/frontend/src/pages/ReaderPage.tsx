import { AiReadingPanel } from "../components/ai/AiReadingPanel";
import { PdfWorkspace } from "../components/reader/PdfWorkspace";

export function ReaderPage() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <PdfWorkspace />
      <AiReadingPanel />
    </div>
  );
}
