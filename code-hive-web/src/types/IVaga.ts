export interface IVaga {
    id: string;
    titulo: string;
    empresa: string;
    modalidade: string;
    link: string;
    data_publicacao: string;
    origem: string;

    // Campos novos — opcionais para compatibilidade com vagas antigas no Firebase
    city?: string;
    state?: string;
    country?: string;
    workplace_type?: string;
    is_remote?: boolean;
    tipo_contrato?: string;
    prazo_inscricao?: string;
    pcd?: boolean;
}