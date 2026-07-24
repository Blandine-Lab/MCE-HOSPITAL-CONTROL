import { BrowserRouter, Routes, Route } from 'react-router-dom';

function AppMinimal() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div style={{color:'white', fontSize:'30px'}}>Accueil minimal</div>} />
        <Route path="/test" element={<div style={{color:'lime', fontSize:'40px'}}>Test réussi</div>} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppMinimal;