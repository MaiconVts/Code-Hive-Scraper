import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import VagasDev from "./pages/VagasDev";
import VagasAdv from "./pages/VagasAdv";
import CosmosBackground from "./components/CosmosBackground";

function App() {
  return (
    <>
      <CosmosBackground />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vagas-dev" element={<VagasDev />} />
          <Route path="/vagas-adv" element={<VagasAdv />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
