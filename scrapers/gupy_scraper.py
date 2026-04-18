import requests
from datetime import datetime
from .base_scraper import BaseScraper  # Importando o molde

class GupyScraper(BaseScraper):
    """Implementação do scraper específico para a API da Gupy."""
    
    def __init__(self):
        # Chama o construtor da classe mãe definindo a origem como "Gupy"
        super().__init__(nome_plataforma="Gupy")
    
    def _mapear_modalidade(self, modalidade: str) -> str:
        """Método privado (indicado pelo _) para traduzir o termo."""
        termo = modalidade.lower()
        if "home" in termo or "remoto" in termo:
            return "remote"
        elif "hibrido" in termo or "híbrido" in termo:
            return "hybrid"
        elif "presencial" in termo:
            return "on-site"
        return "remote" # Padrão para evitar erros

    def _mapear_tipo_contrato(self, tipo_api: str) -> str:
        """
        Traduz o campo 'type' da API Gupy para português legível.
        Ex: 'vacancy_type_effective' → 'CLT'
        """
        mapa = {
            'vacancy_type_effective': 'CLT',
            'vacancy_type_internship': 'Estágio',
            'vacancy_type_temporary': 'Temporário',
            'vacancy_type_apprentice': 'Jovem Aprendiz',
            'vacancy_type_independent_contractor': 'PJ',
            'vacancy_legal_entity': 'PJ',
            'vacancy_type_associated': 'Associado',
            'vacancy_type_freelancer': 'Freelancer',
            'vacancy_type_talent_pool': 'Banco de Talentos',
        }
        return mapa.get(tipo_api, tipo_api or 'Não informado')

    def _mapear_workplace_legivel(self, workplace: str) -> str:
        """
        Traduz o workplaceType da API para português.
        Diferente do _mapear_modalidade — aqui convertemos o RETORNO da API,
        não o parâmetro de busca.
        """
        mapa = {
            'remote': 'Remoto',
            'hybrid': 'Híbrido',
            'on-site': 'Presencial',
        }
        return mapa.get(workplace, workplace or 'Não informado')

    def buscar_vagas(self, palavra_chave: str, modalidade: str, limite: int = 25) -> list:
        """Implementação obrigatória do método de busca."""
        url = "https://employability-portal.gupy.io/api/v1/jobs"
        tipo_trabalho = self._mapear_modalidade(modalidade)
        
        parametros = {
            "jobName": palavra_chave,
            "limit": limite,
            "offset": 0,
            "workplaceType": tipo_trabalho
        }
                
        try:
            # Algoritmo Anti-Bloqueio: Exponential Backoff com Jitter.
            response = self.fazer_requisicao_segura(url, params=parametros)
            dados = response.json()
            
            # Aqui sabemos que a chave correta é 'data'
            lista_resultados = dados.get('data', []) if isinstance(dados, dict) else dados
            vagas_formatadas = []
            
            for item in lista_resultados:
                link = item.get('jobUrl', '')
                if not link:
                    continue  # Pula vagas sem link válido
                
                # Usa o método da classe mãe para garantir o padrão!
                # Agora passando TODOS os campos relevantes que a API retorna.
                vaga = self.padronizar_vaga(
                    id_vaga=self.gerar_id_deterministico(link),
                    titulo=item.get('name', 'Título não informado'),
                    empresa=item.get('careerPageName', 'Confidencial'),
                    modalidade=self._mapear_workplace_legivel(item.get('workplaceType')),
                    link=link,
                    data_pub=item.get('publishedDate'),
                    # --- CAMPOS NOVOS ---
                    city=item.get('city'),
                    state=item.get('state'),
                    country=item.get('country'),
                    workplace_type=item.get('workplaceType'),
                    is_remote=item.get('isRemoteWork', False),
                    tipo_contrato=self._mapear_tipo_contrato(item.get('type')),
                    prazo_inscricao=item.get('applicationDeadline'),
                    pcd=item.get('disabilities', False),
                )
                vagas_formatadas.append(vaga)
                
            return vagas_formatadas
        
        except Exception as e:
            print(f"    [ERRO]: Falha ao buscar vagas na Gupy - {str(e)}")
            return []  # Retorna lista vazia para não quebrar o fluxo do programa