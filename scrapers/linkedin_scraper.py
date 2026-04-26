# scrapers/linkedin_scraper.py
"""
Scraper LinkedIn — Blindagem Anti-Detecção Nível Máximo.

Camadas de proteção (da mais fundamental à mais avançada):

    1. TLS Fingerprint    — curl_cffi com impersonate="chrome" replica o handshake
                            TLS/JA3/HTTP2 idêntico ao Chrome real.

    2. Session Persistente — mantém cookies (JSESSIONID, bcookie, lidc, __cf_bm)
                            entre requests, como um navegador real.

    3. Warm-up 3 Etapas   — Google → Homepage → /jobs/ antes de qualquer busca.

    4. Headers Sec-Fetch   — Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site.

    5. Rotação User-Agent  — 5 variações de Chrome reais.

    6. Delays Gaussianos   — random.gauss() com clamp natural.

    7. Cooldown Keywords   — pausa entre palavras-chave diferentes.

    8. Detecção Tríplice   — authwall + captcha + response size anomaly.

    9. Circuit Breaker     — erros consecutivos > threshold → pausa automática.

   10. Teto Global         — máximo de requests por execução.

   11. Referer Chain       — cada request tem referer da página anterior.

   12. UTF-8 Forçado       — bytes do response decodificados explicitamente como
                            UTF-8 antes de virar HTML, eliminando mojibake nos
                            títulos/empresas com acentos.

Filtros validados empiricamente:
    - geoId=106057199 — força vagas brasileiras apenas
    - f_WT=1/2/3      — Presencial/Remoto/Híbrido (conjuntos disjuntos, 100% eficaz)

Seletores CSS confirmados (Abril/2026):
    Card container:  div.base-card.job-search-card
    Título:          h3.base-search-card__title
    Empresa:         h4.base-search-card__subtitle > a
    Localização:     span.job-search-card__location
    Data:            time.job-search-card__listdate (atributo datetime)
    Link:            a.base-card__full-link (atributo href)
"""
import logging
import random
import time
from urllib.parse import quote_plus

from curl_cffi import requests as cffi_requests
from lxml import html as lxml_html

from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

MODALIDADE_MAP = {
    'remote': 'Remoto',
    'remoto': 'Remoto',
    'on-site': 'Presencial',
    'presencial': 'Presencial',
    'hybrid': 'Híbrido',
    'híbrido': 'Híbrido',
    'hibrido': 'Híbrido',
}

# f_WT=1 (presencial) | f_WT=2 (remoto) | f_WT=3 (híbrido)
F_WT_MAP = {
    'remoto':     ('2', 'Remoto'),
    'presencial': ('1', 'Presencial'),
    'hibrido':    ('3', 'Híbrido'),
    'híbrido':    ('3', 'Híbrido'),
}

# Termos que indicam "país" e não "estado" — usados para detectar quando o
# LinkedIn retorna localização degradada (só "Brasil" sem cidade/UF).
# Quando aparece um desses no campo onde esperaríamos UF, jogamos pra country.
_TERMOS_PAIS = {'brasil', 'brazil', 'brasilien'}

_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

_BLOQUEIO_SIGNALS = [
    'authwall',
    'captcha',
    '/challenge/',
    'checkpoint/challenge',
]

_TAMANHO_MINIMO_RESPONSE = 20_000


class LinkedinScraper(BaseScraper):
    """
    Scraper para vagas públicas do LinkedIn.

    Herda BaseScraper para o contrato de dados (padronizar_vaga, gerar_id_deterministico,
    consertar_mojibake) mas implementa sua própria camada de request via curl_cffi
    com impersonate="chrome".
    """

    # --- Limites de paginação ---
    _VAGAS_POR_PAGINA = 60
    _MAX_PAGINAS = 4

    # --- Limites globais de segurança ---
    _MAX_REQUESTS_POR_EXECUCAO = 2000
    _MAX_ERROS_CONSECUTIVOS = 5
    _TAXA_ERRO_CRITICA = 0.20

    # --- Delays (em segundos) ---
    _DELAY_ENTRE_REQUESTS_MEDIA = 6.0
    _DELAY_ENTRE_REQUESTS_DESVIO = 1.5
    _DELAY_ENTRE_KEYWORDS_MEDIA = 8.0
    _DELAY_ENTRE_KEYWORDS_DESVIO = 2.0

    _PAUSA_INTERMEDIARIA_MEDIA = 25.0
    _PAUSA_INTERMEDIARIA_DESVIO = 2.5
    _PAUSA_INTERMEDIARIA_MIN = 20.0
    _PAUSA_INTERMEDIARIA_MAX = 30.0

    _PAUSA_RECUPERACAO = 120.0

    _GEO_ID_BRASIL = '106057199'

    def __init__(self):
        super().__init__(nome_plataforma="LinkedIn")

        self._session_aquecida: bool = False
        self._iniciar_session()

        self._requests_realizados: int = 0
        self._requests_com_sucesso: int = 0
        self._erros_consecutivos: int = 0
        self._ultimo_referer: str = 'https://www.google.com/'

    # ==================================================================
    # CAMADA 1 — Session e TLS Fingerprint
    # ==================================================================

    def _iniciar_session(self):
        """Cria curl_cffi Session com impersonate='chrome'."""
        self._session: cffi_requests.Session = cffi_requests.Session(impersonate="chrome")
        self._session.headers.update(self._gerar_headers_base())
        logger.info("[LINKEDIN] Session curl_cffi criada com impersonate='chrome'")

    def _gerar_headers_base(self) -> dict:
        """Headers de navegador moderno + Sec-Fetch-*."""
        return {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            # ⚠️ Charset hint explícito para o servidor: queremos UTF-8.
            'Accept-Charset': 'utf-8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Sec-Ch-Ua': '"Chromium";v="125", "Google Chrome";v="125", "Not=A?Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
        }

    def _rotacionar_user_agent(self):
        ua = random.choice(_USER_AGENTS)
        self._session.headers['User-Agent'] = ua

    # ==================================================================
    # CAMADA 2 — Warm-up
    # ==================================================================

    def _aquecer_session(self):
        """Warm-up em 3 etapas: Google → Homepage → /jobs/."""
        if self._session_aquecida:
            return

        logger.info("[LINKEDIN] Aquecendo session (Google → Homepage → /jobs/)...")
        self._rotacionar_user_agent()

        try:
            self._session.headers['Referer'] = 'https://www.google.com/'
            self._session.headers['Sec-Fetch-Site'] = 'cross-site'
            self._session.get('https://www.linkedin.com/', timeout=20)
            self._requests_realizados += 1
            self._delay_gaussiano(3.0, 1.0)

            self._session.headers['Referer'] = 'https://www.linkedin.com/'
            self._session.headers['Sec-Fetch-Site'] = 'same-origin'
            self._session.get('https://www.linkedin.com/jobs/', timeout=20)
            self._requests_realizados += 1
            self._delay_gaussiano(3.0, 1.0)

            self._ultimo_referer = 'https://www.linkedin.com/jobs/'
            self._session_aquecida = True
            logger.info("[LINKEDIN] Session aquecida com sucesso — cookies coletados")

        except Exception as e:
            logger.warning(f"[LINKEDIN] Falha no warm-up: {e} — continuando sem warm-up")
            self._session_aquecida = True

    # ==================================================================
    # CAMADA 3 — Delays Humanizados
    # ==================================================================

    def _delay_gaussiano(self, media: float, desvio: float):
        """Delay com distribuição gaussiana + clamp natural [1.5s, media*3]."""
        delay = random.gauss(media, desvio)
        delay = max(1.5, min(delay, media * 3))
        time.sleep(delay)

    def _delay_gaussiano_clampado(self, media: float, desvio: float, minimo: float, maximo: float) -> float:
        """Variante com clamp customizado [min, max]. Retorna delay aplicado."""
        delay = random.gauss(media, desvio)
        delay = max(minimo, min(delay, maximo))
        time.sleep(delay)
        return delay

    # ==================================================================
    # CAMADA 4 — Detecção de Bloqueio
    # ==================================================================

    def _detectar_bloqueio(self, response) -> str | None:
        """3 sinais: authwall/captcha, response pequeno, ausência de cards."""
        content = response.content
        # Decodifica como UTF-8 para análise — encoding errado aqui não importa
        # porque só procuramos substrings ASCII (authwall, captcha, etc).
        content_text = content.decode('utf-8', errors='ignore').lower()
        content_size = len(content)

        for sinal in _BLOQUEIO_SIGNALS:
            if sinal in content_text:
                if 'job-search-card' in content_text:
                    continue
                return f"authwall/captcha detectado (sinal: '{sinal}')"

        if content_size < _TAMANHO_MINIMO_RESPONSE:
            if 'no-results' in content_text or 'jobs-search' in content_text:
                return None
            return f"response muito pequeno ({content_size} bytes, mínimo: {_TAMANHO_MINIMO_RESPONSE})"

        if content_size > 50_000 and 'job-search-card' not in content_text:
            return "response grande mas sem cards de vaga (possível redirect para login)"

        return None

    # ==================================================================
    # CAMADA 5 — Circuit Breaker e Monitoramento
    # ==================================================================

    def _limite_global_atingido(self) -> bool:
        if self._requests_realizados >= self._MAX_REQUESTS_POR_EXECUCAO:
            logger.warning(
                f"[LINKEDIN] Teto global de {self._MAX_REQUESTS_POR_EXECUCAO} requests atingido. "
                f"Parando graciosamente."
            )
            return True
        return False

    def _circuit_breaker_aberto(self) -> bool:
        if self._erros_consecutivos >= self._MAX_ERROS_CONSECUTIVOS:
            logger.error(
                f"[LINKEDIN] Circuit breaker aberto: {self._erros_consecutivos} erros consecutivos. "
                f"Abortando para evitar ban."
            )
            return True
        return False

    def _verificar_taxa_erro(self):
        if self._requests_realizados < 10:
            return

        taxa = 1 - (self._requests_com_sucesso / self._requests_realizados)
        if taxa > self._TAXA_ERRO_CRITICA:
            logger.warning(
                f"[LINKEDIN] Taxa de erro {taxa:.1%} acima do limiar ({self._TAXA_ERRO_CRITICA:.0%}). "
                f"Pausa de recuperação de {self._PAUSA_RECUPERACAO / 60:.0f} minutos..."
            )
            time.sleep(self._PAUSA_RECUPERACAO)
            self._erros_consecutivos = 0

    def _registrar_sucesso(self):
        self._requests_com_sucesso += 1
        self._erros_consecutivos = 0

    def _registrar_erro(self, motivo: str):
        self._erros_consecutivos += 1
        logger.warning(
            f"[LINKEDIN] Erro #{self._erros_consecutivos}: {motivo} "
            f"(total requests: {self._requests_realizados})"
        )

    # ==================================================================
    # CAMADA 6 — Parsing HTML
    # ==================================================================

    def _decodificar_html_utf8(self, content_bytes: bytes) -> str:
        """
        Decodifica bytes do response como UTF-8 explicitamente.

        Por que não passar bytes direto para lxml.html.fromstring()?
        - lxml tenta detectar encoding pelo meta tag ou Content-Type.
        - Se o LinkedIn mandar charset errado no header (raro mas possível),
          lxml decodifica errado e gera mojibake nos textos extraídos.
        - Decodificar manualmente com 'utf-8' (com fallback de erro 'replace')
          garante consistência total.
        """
        try:
            return content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback: substitui bytes inválidos por '?' em vez de quebrar
            logger.warning("[LINKEDIN] Bytes inválidos no response — usando errors='replace'")
            return content_bytes.decode('utf-8', errors='replace')

    def _extrair_cards(self, html_content: bytes) -> list:
        """Extrai cards de vaga do HTML (bytes → UTF-8 string → lxml)."""
        # ⚠️ FIX UTF-8: decodificamos explicitamente como UTF-8 antes de passar
        # pra lxml, garantindo que acentos sejam interpretados corretamente.
        html_string = self._decodificar_html_utf8(html_content)
        tree = lxml_html.fromstring(html_string)
        return tree.xpath(
            '//div[contains(@class, "base-card") and contains(@class, "job-search-card")]'
        )

    def _parse_card(self, card) -> dict | None:
        """Extrai dados brutos de um único card. Retorna None se inválido."""
        links = card.xpath('.//a[contains(@class, "base-card__full-link")]/@href')
        if not links:
            return None
        link = links[0].split('?')[0].strip()
        if not link:
            return None

        titulos = card.xpath('.//h3[contains(@class, "base-search-card__title")]/text()')
        titulo = titulos[0].strip() if titulos else None

        empresas = card.xpath('.//h4[contains(@class, "base-search-card__subtitle")]//a/text()')
        empresa = empresas[0].strip() if empresas else None

        locais = card.xpath('.//span[contains(@class, "job-search-card__location")]/text()')
        localizacao = locais[0].strip() if locais else None

        datas = card.xpath('.//time[contains(@class, "job-search-card__listdate")]/@datetime')
        if not datas:
            datas = card.xpath('.//time[contains(@class, "job-search-card__listdate--new")]/@datetime')
        data_pub = datas[0].strip() if datas else None

        return {
            'link': link,
            'titulo': titulo,
            'empresa': empresa,
            'localizacao': localizacao,
            'data_publicacao': data_pub,
        }

    # ==================================================================
    # CAMADA 7 — Normalização de Dados
    # ==================================================================

    def _eh_nome_pais(self, valor: str | None) -> bool:
        """Testa se a string é um nome de país (não cidade/UF)."""
        if not valor:
            return False
        return valor.strip().lower() in _TERMOS_PAIS

    def _parse_localizacao(self, localizacao_raw: str | None) -> tuple:
        """
        Separa localização LinkedIn em (city, state, country).

        Casos tratados:
        - "São Paulo, São Paulo, Brasil"  → ("São Paulo", "São Paulo", "Brasil")
        - "São Paulo, Brasil"             → ("São Paulo", None, "Brasil")     ← FIX
        - "Brasil"                        → (None, None, "Brasil")             ← FIX
        - None / vazio                    → (None, None, None)

        ⚠️ FIX bug "Brasil no state":
        Quando a localização tinha 2 partes e a segunda era "Brasil", a versão
        antiga retornava (parte0, "Brasil", None) — colocando o nome do país
        no campo state. Agora detectamos isso e jogamos para country.
        """
        if not localizacao_raw:
            return None, None, None

        partes = [p.strip() for p in localizacao_raw.split(',') if p.strip()]

        if not partes:
            return None, None, None

        # Caso 1: 3+ partes → city, state, country (formato canônico)
        if len(partes) >= 3:
            return partes[0], partes[1], partes[2]

        # Caso 2: 2 partes — pode ser "Cidade, UF" ou "Cidade, Brasil"
        if len(partes) == 2:
            if self._eh_nome_pais(partes[1]):
                # "São Paulo, Brasil" → city=São Paulo, country=Brasil, state=desconhecido
                return partes[0], None, partes[1]
            # "Cidade, UF" formato (ex: "São Paulo, SP")
            return partes[0], partes[1], None

        # Caso 3: 1 parte — pode ser só país ou só cidade
        if self._eh_nome_pais(partes[0]):
            # "Brasil" puro → só preenche country
            return None, None, partes[0]
        # Cidade isolada sem UF (raro, mas possível)
        return partes[0], None, None

    def _inferir_modalidade(self, localizacao_raw: str | None) -> str:
        """Infere modalidade pela localização (fallback)."""
        if not localizacao_raw:
            return 'Não informado'

        loc_lower = localizacao_raw.lower()
        for termo, modalidade in MODALIDADE_MAP.items():
            if termo in loc_lower:
                return modalidade

        return 'Não informado'

    def _normalizar_vaga(self, vaga_raw: dict, modalidade_explicita: str | None = None) -> dict:
        """Conversão dict bruto → formato padronizado MyOrbita."""
        link = vaga_raw['link']
        city_raw, state_raw, country_raw = self._parse_localizacao(vaga_raw.get('localizacao'))

        if modalidade_explicita:
            modalidade = modalidade_explicita
        else:
            modalidade = self._inferir_modalidade(vaga_raw.get('localizacao'))

        is_remote = (modalidade == 'Remoto')

        return self.padronizar_vaga(
            id_vaga=self.gerar_id_deterministico(link),
            titulo=vaga_raw.get('titulo', 'Título não informado'),
            empresa=vaga_raw.get('empresa', 'Confidencial'),
            modalidade=modalidade,
            link=link,
            data_pub=vaga_raw.get('data_publicacao'),
            city=city_raw,
            state=state_raw,
            country=country_raw,
            is_remote=is_remote,
        )

    def _extrair_vagas_da_pagina(self, html_content: bytes, modalidade_explicita: str | None = None) -> list:
        """Processa HTML de uma página e retorna vagas normalizadas."""
        cards = self._extrair_cards(html_content)
        vagas = []
        for card in cards:
            vaga_raw = self._parse_card(card)
            if vaga_raw:
                vagas.append(self._normalizar_vaga(vaga_raw, modalidade_explicita))
        return vagas

    # ==================================================================
    # CAMADA 8 — Request com Todas as Proteções
    # ==================================================================

    def _montar_url(self, palavra_chave: str, offset: int = 0, f_wt: str | None = None) -> str:
        """
        Monta URL de busca do LinkedIn.

        ⚠️ quote_plus garante UTF-8 correto na URL: keywords como "C# .NET"
        viram "C%23+.NET" (não corrompe acentos em queries em português).
        """
        keyword_encoded = quote_plus(palavra_chave)
        url = (
            f"https://www.linkedin.com/jobs/search"
            f"?keywords={keyword_encoded}"
            f"&location=Brasil"
            f"&geoId={self._GEO_ID_BRASIL}"
            f"&start={offset}"
        )
        if f_wt:
            url += f"&f_WT={f_wt}"
        return url

    def _fazer_request(self, url: str):
        """Request com todas as proteções ativas."""
        if self._limite_global_atingido():
            return None
        if self._circuit_breaker_aberto():
            return None

        self._rotacionar_user_agent()
        self._session.headers['Referer'] = self._ultimo_referer
        self._session.headers['Sec-Fetch-Site'] = 'same-origin'

        self._delay_gaussiano(self._DELAY_ENTRE_REQUESTS_MEDIA, self._DELAY_ENTRE_REQUESTS_DESVIO)

        try:
            response = self._session.get(url, timeout=20)
            self._requests_realizados += 1

            if response.status_code == 200:
                motivo_bloqueio = self._detectar_bloqueio(response)
                if motivo_bloqueio:
                    self._registrar_erro(motivo_bloqueio)
                    return None

                self._registrar_sucesso()
                self._ultimo_referer = url
                return response

            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                self._registrar_erro(f"Rate limit (429) — aguardando {retry_after}s")
                time.sleep(retry_after)
                return None

            if response.status_code == 403:
                self._registrar_erro("Bloqueio permanente (403)")
                self._erros_consecutivos += 2
                return None

            self._registrar_erro(f"HTTP {response.status_code}")
            return None

        except Exception as e:
            self._requests_realizados += 1
            self._registrar_erro(f"Exceção: {e}")
            return None

    # ==================================================================
    # MÉTODO PÚBLICO — Contrato BaseScraper
    # ==================================================================

    def buscar_vagas(self, palavra_chave: str, modalidade: str, limite: int = 50) -> list:
        """
        Implementação obrigatória do método de busca.

        Fluxo de pausas:
        - Entre requests da mesma keyword: delay curto (~6s gaussiano)
        - Entre páginas da mesma keyword: pausa intermediária [20-30s]
          (só se houver próxima página — nunca após a última)
        - Entre keywords diferentes: cooldown (~8s)
        """
        if self._limite_global_atingido():
            return []
        if self._circuit_breaker_aberto():
            return []

        self._aquecer_session()
        self._verificar_taxa_erro()

        modalidade_normalizada = modalidade.lower().strip() if modalidade else ''
        f_wt_code, modalidade_rotulo = F_WT_MAP.get(modalidade_normalizada, (None, None))

        todas_vagas = []

        max_paginas = min(
            (limite + self._VAGAS_POR_PAGINA - 1) // self._VAGAS_POR_PAGINA,
            self._MAX_PAGINAS
        )

        for pagina in range(max_paginas):
            offset = pagina * 25
            url = self._montar_url(palavra_chave, offset, f_wt=f_wt_code)

            response = self._fazer_request(url)

            if not response:
                logger.warning(f"[LINKEDIN] Paginação interrompida na página {pagina + 1}")
                break

            vagas_pagina = self._extrair_vagas_da_pagina(response.content, modalidade_rotulo)

            if not vagas_pagina:
                logger.info(f"[LINKEDIN] Página {pagina + 1} vazia — fim dos resultados")
                break

            todas_vagas.extend(vagas_pagina)

            logger.info(
                f"[LINKEDIN] Página {pagina + 1}: {len(vagas_pagina)} vagas "
                f"(acumulado: {len(todas_vagas)})"
            )

            eh_ultima_pagina = (pagina == max_paginas - 1)
            if not eh_ultima_pagina:
                delay_real = self._delay_gaussiano_clampado(
                    self._PAUSA_INTERMEDIARIA_MEDIA,
                    self._PAUSA_INTERMEDIARIA_DESVIO,
                    self._PAUSA_INTERMEDIARIA_MIN,
                    self._PAUSA_INTERMEDIARIA_MAX,
                )
                logger.info(
                    f"[LINKEDIN] Pausa intermediária de {delay_real:.1f}s "
                    f"antes da página {pagina + 2}"
                )

        rotulo_log = modalidade_rotulo or 'todas'
        logger.info(f"[LINKEDIN] '{palavra_chave}' ({rotulo_log}): {len(todas_vagas)} vagas coletadas")

        self._delay_gaussiano(self._DELAY_ENTRE_KEYWORDS_MEDIA, self._DELAY_ENTRE_KEYWORDS_DESVIO)

        return todas_vagas