import { useState } from 'react'
import './App.css'
import type { IVaga } from './types/IVaga';
import { useEffect } from 'react';
import { getVagas } from './services/api';

function App() {
  const [vagas, setVagas] = useState<IVaga[]>([]);
  useEffect(() => {
    const fetchVagas = async () => {
      const vagasObtidas = await getVagas();
      setVagas(vagasObtidas);
    };
    fetchVagas();
  }, []);
  return (
    <div className="App">
      <h1>Vagas de Emprego</h1>
      <button onClick={() => setVagas([])}>Limpar Vagas</button>
      <ul>
        {vagas.map((vaga) => (
          <li key={vaga.id}>
            <h2>{vaga.titulo}</h2>
            <p><strong>Empresa:</strong> {vaga.empresa}</p>
            <p><strong>Modalidade:</strong> {vaga.modalidade}</p>
            <p><strong>Link:</strong> <a href={vaga.link} target="_blank" rel="noopener noreferrer">{vaga.link}</a></p>
            <p><strong>Data de Publicação:</strong> {vaga.data_publicacao}</p>
            <p><strong>Origem:</strong> {vaga.origem}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
