# scrapers/base_scraper.py
from abc import ABC, abstractmethod
import requests
import random
import time
import hashlib
import logging

logger = logging.getLogger(__name__)

# Mapa completo: Nome do estado → Sigla (UF)
# Usado para padronizar o campo 'state' que a API Gupy retorna por extenso.
ESTADOS_SIGLAS = {
    'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
    'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF',
    'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA',
    'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG',
    'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE',
    'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR',
    'Santa Catarina': 'SC', 'São Paulo': 'SP', 'Sergipe': 'SE',
    'Tocantins': 'TO',
}

# Status HTTP que NÃO fazem sentido tentar novamente.
# 400 = request malformado, 403 = bloqueado, 404 = não existe.
# Retry só vale pra 429 (rate limit) e 5xx (erro do servidor).
STATUS_SEM_RETRY = {400, 403, 404}


class BaseScraper(ABC):
    """
    Classe Abstrata que define o contrato obrigatório para todos os scrapers.
    Padrão de Projeto: Template Method.
    """

    def __init__(self, nome_plataforma: str):
        self.nome_plataforma = nome_plataforma

        # Simula navegadores reais para burlar bloqueios primários
        self.headers_padrao = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    def gerar_id_deterministico(self, link: str) -> str:
        """Gera um ID único e determinístico a partir de uma URL."""
        return hashlib.md5(link.encode('utf-8')).hexdigest()[:16]

    @abstractmethod
    def buscar_vagas(self, palavra_chave: str, modalidade: str) -> list:
        """
        Método abstrato. Obriga as classes filhas (Gupy, LinkedIn, etc)
        a implementarem sua própria lógica de busca na web ou API.
        """
        pass

    def _normalizar_campo(self, valor, default='Não informado'):
        """
        Sanitiza qualquer campo de texto antes de salvar.
        Trata None, strings vazias, e strings só com espaços.
        Equivalente em C#: value?.Trim() ?? defaultValue
        """
        if valor is None:
            return default
        if isinstance(valor, bool):
            return valor
        if isinstance(valor, str):
            valor = valor.strip()
            return valor if valor else default
        return valor

    def _normalizar_estado(self, state_nome: str) -> str:
        """
        Converte nome completo do estado para sigla (UF).
        'São Paulo' → 'SP', 'Minas Gerais' → 'MG'
        Se não encontrar no mapa, retorna o valor original (pode ser sigla já).
        Se vazio/None, retorna 'Não informado'.
        """
        if not state_nome or not state_nome.strip():
            return 'Não informado'
        state_nome = state_nome.strip()
        return ESTADOS_SIGLAS.get(state_nome, state_nome)

    def padronizar_vaga(
        self,
        id_vaga: str,
        titulo: str,
        empresa: str,
        modalidade: str,
        link: str,
        data_pub: str,
        # --- CAMPOS NOVOS (opcionais para não quebrar scrapers existentes) ---
        city: str = None,
        state: str = None,
        country: str = None,
        workplace_type: str = None,
        is_remote: bool = None,
        tipo_contrato: str = None,
        prazo_inscricao: str = None,
        pcd: bool = None,
    ) -> dict:
        """
        Monta o dicionário padronizado da vaga.
        Complexidade de Tempo: O(1) para a criação do registro.

        Parâmetros novos usam default None — scrapers antigos continuam
        funcionando sem passar esses valores (não quebra assinatura).
        O _normalizar_campo trata None/vazio antes de salvar.
        """
        return {
            "id": id_vaga,
            "titulo": titulo,
            "empresa": empresa,
            "modalidade": modalidade,
            "link": link,
            "data_publicacao": data_pub,
            "origem": self.nome_plataforma,
            # --- CAMPOS NOVOS ---
            "city": self._normalizar_campo(city),
            "state": self._normalizar_estado(state),
            "country": self._normalizar_campo(country, default='Brasil'),
            "workplace_type": self._normalizar_campo(workplace_type),
            "is_remote": self._normalizar_campo(is_remote, default=False),
            "tipo_contrato": self._normalizar_campo(tipo_contrato),
            "prazo_inscricao": self._normalizar_campo(prazo_inscricao),
            "pcd": self._normalizar_campo(pcd, default=False),
        }

    def fazer_requisicao_segura(self, url: str, params: dict = None) -> requests.Response:
        """
        Algoritmo Anti-Bloqueio: Exponential Backoff com Jitter.
        Evita bans permanentes (Rate Limiting) ao lidar com grandes volumes de dados.

        Retry seletivo:
        - 429 (Rate Limit) e 5xx (erro servidor) → tenta novamente com backoff
        - 400, 403, 404 → aborta imediatamente (retry não resolve)
        """
        tentativas_maximas = 4

        for tentativa in range(tentativas_maximas):
            try:
                # Simula o delay humano de leitura antes de fazer a requisição (Jitter)
                delay_humano = random.uniform(1.5, 3.5)
                time.sleep(delay_humano)

                response = requests.get(url, headers=self.headers_padrao, params=params, timeout=15)

                # Sucesso — retorna direto
                if response.status_code == 200:
                    return response

                # Erro sem chance de recovery — aborta sem gastar tentativas
                if response.status_code in STATUS_SEM_RETRY:
                    logger.warning(f"HTTP {response.status_code} para {url} — abortando (retry inútil)")
                    return response

                # Rate limit — aplica backoff
                if response.status_code == 429:
                    raise requests.exceptions.RequestException("Rate Limit Excedido (HTTP 429)")

                # Outros erros (5xx) — tenta novamente
                response.raise_for_status()
                return response

            except requests.exceptions.RequestException as e:
                if tentativa == tentativas_maximas - 1:
                    logger.error(f"[FALHA CRÍTICA]: Limite de tentativas excedido para {url}. Erro: {e}")
                    raise e

                # Exponential Backoff: (2, 4, 8 segundos) + Jitter de 1 a 2 segundos
                tempo_espera = (2 ** tentativa) + random.uniform(1, 2)
                logger.warning(f"[ANTI-BAN]: Aguardando {tempo_espera:.2f}s — Tentativa {tentativa + 1}/{tentativas_maximas}")
                time.sleep(tempo_espera)