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

    def buscar_vagas(self, palavra_chave: str, modalidade: str, limite: int = 25) -> list:
        """Implementação obrigatória do método de busca."""
        url = "https://employability-portal.gupy.io/api/v1/jobs"
        tipo_trabalho = self._mapear_modalidade(modalidade)
        
        parametros = {
            "jobName": palavra_chave,
            "limit": limite,  # Limite de Requisições, pode ser necessario aumentar para 50-100 dependendo do volume de vagas
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
                
                # Usa o metoda da classe mãe para garantir o padrão!
                vaga = self.padronizar_vaga(
                    id_vaga=self.gerar_id_deterministico(link),  # Gerando um ID único determinístico a partir do link
                    titulo=item.get('name', 'Título não informado'),
                    empresa=item.get('careerPageName', 'Confidencial'),
                    modalidade=modalidade,
                    link=link,
                    data_pub=item.get('publishedDate')  # Data atual, pois a API não fornece data de publicação
                )
                vagas_formatadas.append(vaga)
                
            return vagas_formatadas
        
        except Exception as e:
            print(f"    [ERRO]: Falha ao buscar vagas na Gupy - {str(e)}")
            return []  # Retorna lista vazia para não quebrar o fluxo do programa