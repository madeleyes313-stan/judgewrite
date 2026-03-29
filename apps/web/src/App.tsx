import { useRef } from "react";

import { AppChrome } from "./components/AppChrome";
import { useJudgewriteApp } from "./hooks/useJudgewriteApp";
import { ArchivePage } from "./pages/ArchivePage";
import { DraftingPage } from "./pages/DraftingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StyleLabPage } from "./pages/StyleLabPage";
import { WorkbenchPage } from "./pages/WorkbenchPage";

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const state = useJudgewriteApp();

  function openFileDialog() {
    fileInputRef.current?.click();
  }

  return (
    <AppChrome
      view={state.view}
      setView={state.setView}
      message={state.message}
      queueStatusLabel={state.queueStatusLabel}
      feedback={state.feedback}
    >
      <input
        ref={fileInputRef}
        data-testid="case-upload-input"
        multiple
        type="file"
        accept=".txt,.md,.pdf,application/pdf"
        className="hidden"
        onChange={(event) => state.handleFilesSelected(event.target.files)}
      />

      {state.view === "upload" && (
        <WorkbenchPage
          selectedFiles={state.selectedFiles}
          uploadResult={state.uploadResult}
          processingFiles={state.processingFiles}
          workflowStages={state.workflowStages}
          uploadProgressBase={state.uploadProgressBase}
          message={state.message}
          busy={state.busy}
          onOpenFileDialog={openFileDialog}
          onFilesSelected={state.handleFilesSelected}
          onUpload={state.handleUpload}
          onExtract={state.handleExtract}
        />
      )}

      {state.view === "generate" && (
        <DraftingPage
          structuredCase={state.structuredCase}
          generationResult={state.generationResult}
          workflowStages={state.workflowStages}
          draft={state.draft}
          setDraft={state.setDraft}
          issueStates={state.issueStates}
          citationStates={state.citationStates}
          busy={state.busy}
          workflowProgress={state.workflowProgress}
          selectedStyleName={state.selectedStyle?.judge_name ?? "待选择画像"}
          reviewSyncStatus={state.reviewSyncStatus}
          exportFormat={state.exportFormat}
          onGenerate={state.handleGenerate}
          onExport={state.handleExport}
          onSaveReview={state.handleSaveReview}
          onIssueStateChange={state.updateIssueState}
          onCitationStateChange={state.updateCitationState}
        />
      )}

      {state.view === "styles" && (
        <StyleLabPage
          styles={state.styles}
          selectedStyleId={state.selectedStyleId}
          selectedStyle={state.selectedStyle}
          stylePreviewInput={state.stylePreviewInput}
          stylePreviewOutput={state.stylePreviewOutput}
          onSelectStyle={state.setSelectedStyleId}
        />
      )}

      {state.view === "archive" && (
        <ArchivePage
          archiveCases={state.archiveCases}
          activeCaseId={state.activeCaseId}
          reviewState={state.reviewState}
          structuredCase={state.structuredCase}
          generationResult={state.generationResult}
          onToggleTraining={state.handleToggleTraining}
          onDelete={state.handleDeleteArchive}
          onOpenCase={state.loadArchiveCase}
        />
      )}

      {state.view === "settings" && (
        <SettingsPage
          settings={state.settings}
          styles={state.styles}
          onChange={(updater) => state.setSettings((current) => (current ? updater(current) : current))}
          onSave={state.handleSaveSettings}
        />
      )}
    </AppChrome>
  );
}

export default App;
