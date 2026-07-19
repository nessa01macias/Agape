import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Editor } from "./pages/Editor";
import { Landing } from "./pages/Landing";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
};
