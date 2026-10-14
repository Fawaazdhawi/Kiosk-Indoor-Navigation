import Main from "./MainPages/MainPage";
import Admin from "./AdminPages/AdminPage";
import Edit from "./EditPages/EditPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { Route, Routes } from "react-router";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/edit" element={
          <ProtectedRoute>
            <Edit />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

export default App;