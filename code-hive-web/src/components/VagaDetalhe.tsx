import type { IVaga } from '../types/IVaga';

interface IVagaDetalhe {
    vaga: IVaga;
    onClose: () => void;
}


export default function VagaDetalhe({ vaga, onClose }: IVagaDetalhe) {
    return (
        <div className="modal-overlay" style={overlayStyle}>
            <div className="modal-content" style={contentStyle}>
                <button onClick={onClose} style={{ float: 'right' }}>Fechar X</button>
                <h1>Detalhes da Vaga</h1>
                <p><strong>Título:</strong> {vaga.titulo}</p>
                <p><strong>Empresa:</strong> {vaga.empresa}</p>
                <p><strong>Modalidade:</strong> {vaga.modalidade}</p>
                <p><strong>Data de Publicação:</strong> {vaga.data_publicacao}</p>
                <p><strong>Origem:</strong> {vaga.origem}</p>
            </div>
        </div>
    );
}
// Estilos básicos para o modal não cobrir a tela errada
const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
};
const contentStyle: React.CSSProperties = {
    background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px'
};