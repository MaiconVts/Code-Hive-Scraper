import { useState, useEffect } from 'react';
import { getVagas } from '../services/api';
import type { IVaga } from '../types/IVaga';
import { ROUTES } from '../constants/routes';
import VagaDetalhe from '../components/VagaDetalhe';


export default function VagasDev() {
    const [vagas, setVagas] = useState<IVaga[]>([]);


    const [vagaSelecionada, setVagaSelecionada] = useState<IVaga | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchVagas = async () => {
            const vagasObtidas = await getVagas(ROUTES.VAGAS_DEV);
            setVagas(vagasObtidas);
        };
        fetchVagas();
    }, []);

    // Quando clicado, exibe os detalhes da vaga em um modal
    const handleClick = (vaga: IVaga) => {
        setVagaSelecionada(vaga);
        setIsModalOpen(true);
    }
    const fecharModal = () => {
        setIsModalOpen(false);
        setVagaSelecionada(null);
    }   
    return (
        <div>
            <h1>Vagas de Desenvolvimento</h1>
            {vagas.map((vaga) => (
                <div key={vaga.id} onClick={() => handleClick(vaga)} style={{ cursor: 'pointer', border: '1px solid #ccc', margin: '10px' }}>
                    <h2>{vaga.titulo}</h2>
                    <p>{vaga.empresa}</p>
                    <p>{vaga.modalidade}</p>
                    <a href={vaga.link} target="_blank" rel="noopener noreferrer">
                        Ver detalhes
                    </a>
                    <p>{vaga.data_publicacao}</p>
                    <p>{vaga.origem}</p>
                </div>
            ))}
            {/* Renderização do modal */}
            {isModalOpen && vagaSelecionada && (
                <VagaDetalhe 
                    vaga={vagaSelecionada}
                    onClose={fecharModal}
                />
            )}
        </div>
    )






}
