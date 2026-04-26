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
        """Traduz o campo 'type' da API Gupy para português legível."""
        mapa = {
            'vacancy_type_effective': 'CLT',
            'vacancy_type_internship': 'Estágio',
            'vacancy_type_temporary': 'Temporário',
            'vacancy_type_apprentice': 'Jovem Aprendiz',
            'vacancy_type_independent_contractor': 'PJ',
            'vacancy_legal_entity': 'PJ',
            'vacancy_type_associated': 'Associado',
            'vacancy_type_associate': 'Associado',
            'vacancy_type_freelancer': 'Freelancer',
            'vacancy_type_talent_pool': 'Banco de Talentos',
            'vacancy_type_autonomous': 'Autônomo',
            'vacancy_type_lecturer': 'Professor',
            'vacancy_type_outsource': 'Terceirizado',
            'vacancy_type_trainee': 'Trainee',
        }
        return mapa.get(tipo_api, tipo_api or 'Não informado')

    def _mapear_workplace_legivel(self, workplace: str) -> str:
        """Traduz o workplaceType retornado pela API para português."""
        mapa = {
            'remote': 'Remoto',
            'hybrid': 'Híbrido',
            'on-site': 'Presencial',
        }
        return mapa.get(workplace, workplace or 'Não informado')

    def _decodificar_json_utf8(self, response) -> dict | list:
        """
        Decodifica JSON forçando UTF-8 nos bytes crus.

        Por que não usar response.json() diretamente?
        A lib `requests` decodifica usando o charset do Content-Type. Se o
        servidor não enviar charset, ela ASSUME Latin-1 — gerando mojibake
        em strings com acentos. Mesmo com response.encoding = 'utf-8' setado
        no base_scraper, .json() pode ignorar isso em algumas versões.
        Decodificar bytes manualmente garante UTF-8 puro.
        """
        import json
        try:
            # Decodifica bytes crus como UTF-8 (garantido)
            texto = response.content.decode('utf-8')
            return json.loads(texto)
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            logger.warning(f"[GUPY] Falha decodificando UTF-8: {e}. Tentando response.json() como fallback.")
            return response.json()

    def _extrair_vagas_da_pagina(self, lista_resultados: list) -> list:
        """Processa uma página de resultados da API e retorna vagas padronizadas."""
        vagas = []

        for item in lista_resultados:
            link = item.get('jobUrl', '')
            if not link:
                continue

            # padronizar_vaga (do BaseScraper) já aplica consertar_mojibake
            # automaticamente em titulo/empresa/modalidade — protege mesmo que
            # algum byte UTF-8 tenha vazado mal-decodificado.
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

        Paginação inteligente: se a API reporta mais vagas do que o limite
        por página, faz requests adicionais incrementando o offset.
        Decodificação JSON forçada como UTF-8 para evitar mojibake em
        títulos/empresas com acentos.
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

            if response.status_code != 200:
                logger.warning(f"HTTP {response.status_code} para '{palavra_chave}' + '{modalidade}'")
                return []

            # ⚠️ FIX UTF-8: decodifica via bytes em vez de response.json()
            dados = self._decodificar_json_utf8(response)
            lista_resultados = dados.get('data', []) if isinstance(dados, dict) else dados
            todas_vagas = self._extrair_vagas_da_pagina(lista_resultados)

            # --- Paginação ---
            total_disponivel = dados.get('pagination', {}).get('total', 0) if isinstance(dados, dict) else 0

            if total_disponivel > limite:
                paginas_restantes = (total_disponivel - limite + limite - 1) // limite
                paginas_restantes = min(paginas_restantes, 10)  # teto de segurança

                logger.info(f"Paginando '{palavra_chave}' ({modalidade}): {total_disponivel} vagas, {paginas_restantes} páginas extras")

                for pagina in range(1, paginas_restantes + 1):
                    parametros['offset'] = pagina * limite

                    response = self.fazer_requisicao_segura(url, params=parametros)
                    if response.status_code != 200:
                        logger.warning(f"Paginação interrompida na página {pagina + 1} — HTTP {response.status_code}")
                        break

                    dados_pagina = self._decodificar_json_utf8(response)
                    resultados_pagina = dados_pagina.get('data', []) if isinstance(dados_pagina, dict) else dados_pagina

                    if not resultados_pagina:
                        break

                    vagas_pagina = self._extrair_vagas_da_pagina(resultados_pagina)
                    todas_vagas.extend(vagas_pagina)

            return todas_vagas

        except Exception as e:
            logger.error(f"Falha ao buscar vagas na Gupy — {str(e)}")
            return []