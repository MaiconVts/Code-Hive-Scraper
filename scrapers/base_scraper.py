# scrapers/base_scraper.py
from abc import ABC, abstractmethod
from typing import Any
import requests
import random
import time
import hashlib
import logging

logger = logging.getLogger(__name__)

# Mapa completo: Nome do estado → Sigla (UF)
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
STATUS_SEM_RETRY = {400, 403, 404}

# ---------------------------------------------------------------------------
# DETECÇÃO DE DOUBLE-ENCODING UTF-8 (Mojibake)
# ---------------------------------------------------------------------------
# Mojibake clássico ocorre quando bytes UTF-8 são interpretados como Latin-1
# e depois reencodados como UTF-8. Ex: "Estágio" → "EstÃ¡gio".
#
# Estratégia de detecção: textos em português brasileiro NUNCA contêm:
# - 'Ã' seguido de outro caractere com bit alto (Ã¡, Ã©, Ã­, Ã³, Ãº, Ãª, Ã§, Ã£)
# - 'â€' (smart quotes mojibake)
# - 'Â' isolado no meio de palavras
#
# Se detectar esses padrões, tenta o caminho reverso: encode latin-1 → decode utf-8.
# Se der erro ou texto piorar, mantém original (defensivo).
_PADROES_MOJIBAKE = (
    'Ã¡', 'Ã©', 'Ã­', 'Ã³', 'Ãº',  # á é í ó ú
    'Ãª', 'Ã´', 'Ã¢',                # ê ô â
    'Ã§', 'Ã£', 'Ãµ',                # ç ã õ
    'Ã‰', 'Ã“', 'Ã‚',                # É Ó Â (maiúsculas)
    'â€"', 'â€™', 'â€œ', 'â€',       # smart quotes/dashes
)


def _texto_parece_mojibake(texto: str) -> bool:
    """Testa se a string contém padrões clássicos de double-encoding."""
    if not texto or len(texto) < 2:
        return False
    return any(padrao in texto for padrao in _PADROES_MOJIBAKE)


def consertar_mojibake(texto: Any) -> Any:
    """
    Tenta reverter double-encoding UTF-8 (Mojibake).

    Quando bytes UTF-8 corretos são interpretados como Latin-1 e reencodados,
    cada caractere acentuado vira 2-3 caracteres "lixo". Esse processo é
    REVERSÍVEL: encode('latin-1') → decode('utf-8') retorna o texto original.

    Aplicada defensivamente em padronizar_vaga: se o scraper já entregou
    texto correto, este método não altera nada (não bate em _PADROES_MOJIBAKE).
    Se entregou texto corrompido, conserta antes de salvar no Firebase.

    Não-strings (None, bool, int) passam direto.
    """
    if not isinstance(texto, str):
        return texto
    if not _texto_parece_mojibake(texto):
        return texto

    try:
        # O fix: bytes que estavam mascarados como latin-1 voltam a ser UTF-8
        consertado = texto.encode('latin-1').decode('utf-8')
        # Validação: o texto consertado não deve ter mais padrões de mojibake
        if not _texto_parece_mojibake(consertado):
            return consertado
        return texto  # piorou, mantém original
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Texto não é representável em latin-1 (já era UTF-8 puro com mojibake parcial)
        return texto


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
        """Método abstrato — classes filhas implementam sua estratégia."""
        pass

    def _normalizar_campo(self, valor: Any, default: Any = 'Não informado') -> Any:
        """
        Sanitiza qualquer campo antes de salvar.

        Comportamento polimórfico intencional:
        - None                → retorna `default`
        - bool                → retorna o próprio bool (sem strip)
        - str vazia/espaços   → retorna `default`
        - str válida          → retorna a string com strip + conserto de mojibake
        - qualquer outro tipo → retorna o valor cru

        Equivalente em C#: public T NormalizarCampo<T>(T valor, T defaultValue)
        """
        if valor is None:
            return default
        if isinstance(valor, bool):
            return valor
        if isinstance(valor, str):
            valor = valor.strip()
            if not valor:
                return default
            # Rede de proteção: se algum scraper deixou passar texto corrompido,
            # consertamos aqui antes de chegar no Firebase
            return consertar_mojibake(valor)
        return valor

    def _normalizar_estado(self, state_nome: str | None) -> str:
        """
        Converte nome completo do estado para sigla (UF).
        Aplica conserto de mojibake antes de buscar no mapa.
        """
        if not state_nome or not state_nome.strip():
            return 'Não informado'
        state_consertado: str = consertar_mojibake(state_nome.strip())
        return ESTADOS_SIGLAS.get(state_consertado, state_consertado)

    def padronizar_vaga(
        self,
        id_vaga: str,
        titulo: str,
        empresa: str,
        modalidade: str,
        link: str,
        data_pub: str | None,
        city: str | None = None,
        state: str | None = None,
        country: str | None = None,
        workplace_type: str | None = None,
        is_remote: bool | None = None,
        tipo_contrato: str | None = None,
        prazo_inscricao: str | None = None,
        pcd: bool | None = None,
    ) -> dict:
        """
        Monta o dicionário padronizado da vaga.
        Todos os campos textuais passam por _normalizar_campo (que aplica
        conserto de mojibake automaticamente).
        """
        return {
            "id": id_vaga,
            "titulo": consertar_mojibake(titulo),
            "empresa": consertar_mojibake(empresa),
            "modalidade": consertar_mojibake(modalidade),
            "link": link,  # URL não tem mojibake (já é ASCII após URL-encoding)
            "data_publicacao": data_pub,
            "origem": self.nome_plataforma,
            "city": self._normalizar_campo(city),
            "state": self._normalizar_estado(state),
            "country": self._normalizar_campo(country, default='Brasil'),
            "workplace_type": self._normalizar_campo(workplace_type),
            "is_remote": self._normalizar_campo(is_remote, default=False),
            "tipo_contrato": self._normalizar_campo(tipo_contrato),
            "prazo_inscricao": self._normalizar_campo(prazo_inscricao),
            "pcd": self._normalizar_campo(pcd, default=False),
        }

    def fazer_requisicao_segura(self, url: str, params: dict | None = None) -> requests.Response:
        """
        Algoritmo Anti-Bloqueio: Exponential Backoff com Jitter.

        Diferencial UTF-8: força encoding UTF-8 no response antes de retornar,
        impedindo que .json() ou .text decodifiquem como Latin-1 (default do
        requests quando o servidor não envia charset explícito).
        """
        tentativas_maximas = 4

        for tentativa in range(tentativas_maximas):
            try:
                delay_humano = random.uniform(1.5, 3.5)
                time.sleep(delay_humano)

                response = requests.get(url, headers=self.headers_padrao, params=params, timeout=15)

                # ⚠️ FIX UTF-8: força encoding antes de qualquer decodificação.
                # Servidores que mandam JSON sem charset no Content-Type fazem
                # `requests` assumir Latin-1 (RFC 7159 antigo) — origem do mojibake.
                response.encoding = 'utf-8'

                if response.status_code == 200:
                    return response

                if response.status_code in STATUS_SEM_RETRY:
                    logger.warning(f"HTTP {response.status_code} para {url} — abortando (retry inútil)")
                    return response

                if response.status_code == 429:
                    raise requests.exceptions.RequestException("Rate Limit Excedido (HTTP 429)")

                response.raise_for_status()
                return response

            except requests.exceptions.RequestException as e:
                if tentativa == tentativas_maximas - 1:
                    logger.error(f"[FALHA CRÍTICA]: Limite de tentativas excedido para {url}. Erro: {e}")
                    raise e

                tempo_espera = (2 ** tentativa) + random.uniform(1, 2)
                logger.warning(f"[ANTI-BAN]: Aguardando {tempo_espera:.2f}s — Tentativa {tentativa + 1}/{tentativas_maximas}")
                time.sleep(tempo_espera)

        raise RuntimeError(f"fazer_requisicao_segura: todas as tentativas falharam para {url}")