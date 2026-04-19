import requests
import logging
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class GupyScraper(BaseScraper):
    """Implementação do scraper específico para a API da Gupy."""

    def __init__(self):
        super().__init__(nome_plataforma="Gupy")

    def _mapear_modalidade(self, modalidade: str) -> str:
        """
        Converte o termo de busca do usuário para o parâmetro da API.
        Apenas 3 valores válidos após remoção de modalidades redundantes.
        """
        termo = modalidade.lower()
        if "remoto" in termo:
            return "remote"
        elif "hibrido" in termo or "híbrido" in termo:
            return "hybrid"
        elif "presencial" in termo:
            return "on-site"
        return "remote"

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
        Traduz o workplaceType retornado pela API para português.
        Diferente do _mapear_modalidade — aqui convertemos o RETORNO da API,
        não o parâmetro de busca.
        """
        mapa = {
            'remote': 'Remoto',
            'hybrid': 'Híbrido',
            'on-site': 'Presencial',
        }
        return mapa.get(workplace, workplace or 'Não informado')

    def _extrair_vagas_da_pagina(self, lista_resultados: list) -> list:
        """
        Processa uma página de resultados da API e retorna vagas padronizadas.
        Método extraído para evitar duplicação entre primeira página e paginação.
        """
        vagas = []

        for item in lista_resultados:
            link = item.get('jobUrl', '')
            if not link:
                continue

            vaga = self.padronizar_vaga(
                id_vaga=self.gerar_id_deterministico(link),
                titulo=item.get('name', 'Título não informado'),
                empresa=item.get('careerPageName', 'Confidencial'),
                modalidade=self._mapear_workplace_legivel(item.get('workplaceType')),
                link=link,
                data_pub=item.get('publishedDate'),
                city=item.get('city'),
                state=item.get('state'),
                country=item.get('country'),
                workplace_type=item.get('workplaceType'),
                is_remote=item.get('isRemoteWork', False),
                tipo_contrato=self._mapear_tipo_contrato(item.get('type')),
                prazo_inscricao=item.get('applicationDeadline'),
                pcd=item.get('disabilities', False),
            )
            vagas.append(vaga)

        return vagas

    def buscar_vagas(self, palavra_chave: str, modalidade: str, limite: int = 50) -> list:
        """
        Implementação obrigatória do método de busca.
        Agora com paginação inteligente: se a API reporta mais vagas do que
        o limite por página, faz requests adicionais incrementando o offset.
        O delay anti-ban do fazer_requisicao_segura continua ativo entre cada request.
        """
        url = "https://employability-portal.gupy.io/api/v1/jobs"
        tipo_trabalho = self._mapear_modalidade(modalidade)

        parametros = {
            "jobName": palavra_chave,
            "limit": limite,
            "offset": 0,
            "workplaceType": tipo_trabalho,
        }

        try:
            # --- Primeira página ---
            response = self.fazer_requisicao_segura(url, params=parametros)

            # Se não for 200 (ex: 403, 404), retorna vazio sem quebrar
            if response.status_code != 200:
                logger.warning(f"HTTP {response.status_code} para '{palavra_chave}' + '{modalidade}'")
                return []

            dados = response.json()
            lista_resultados = dados.get('data', []) if isinstance(dados, dict) else dados
            todas_vagas = self._extrair_vagas_da_pagina(lista_resultados)

            # --- Paginação: se há mais vagas além desta página ---
            total_disponivel = dados.get('pagination', {}).get('total', 0)

            if total_disponivel > limite:
                paginas_restantes = (total_disponivel - limite + limite - 1) // limite
                # Teto de segurança: máximo 10 páginas extras (500 vagas por query)
                # Evita loops infinitos se a API reportar total absurdo
                paginas_restantes = min(paginas_restantes, 10)

                logger.info(f"Paginando '{palavra_chave}' ({modalidade}): {total_disponivel} vagas, {paginas_restantes} páginas extras")

                for pagina in range(1, paginas_restantes + 1):
                    parametros['offset'] = pagina * limite

                    response = self.fazer_requisicao_segura(url, params=parametros)
                    if response.status_code != 200:
                        logger.warning(f"Paginação interrompida na página {pagina + 1} — HTTP {response.status_code}")
                        break

                    dados_pagina = response.json()
                    resultados_pagina = dados_pagina.get('data', []) if isinstance(dados_pagina, dict) else dados_pagina

                    if not resultados_pagina:
                        break  # API retornou página vazia — não há mais vagas

                    vagas_pagina = self._extrair_vagas_da_pagina(resultados_pagina)
                    todas_vagas.extend(vagas_pagina)

            return todas_vagas

        except Exception as e:
            logger.error(f"Falha ao buscar vagas na Gupy — {str(e)}")
            return []