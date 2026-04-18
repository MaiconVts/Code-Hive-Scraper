import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Home from "./pages/Home";
import VagasDev from "./pages/VagasDev";
import VagasAdv from "./pages/VagasAdv";
import PlanetarySystem from "./components/PlanetarySystem";
import Header from "./components/Header";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/vagas-dev" element={<VagasDev />} />
        <Route path="/vagas-adv" element={<VagasAdv />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <PlanetarySystem />
      <div className="w-full min-h-screen flex flex-col overflow-hidden" style={{ position: 'relative', zIndex: 10 }}>
        <Header />
        <main className="flex-1 w-full relative">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;