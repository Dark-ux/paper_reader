import { Route, Routes } from "react-router-dom";

import { AppShell } from "../components/layout/AppShell";
import { LibraryPage } from "../pages/LibraryPage";
import { ReaderPage } from "../pages/ReaderPage";
import { SettingsPage } from "../pages/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LibraryPage />} />
        <Route path="/reader" element={<ReaderPage />} />
        <Route path="/reader/:paperId" element={<ReaderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
