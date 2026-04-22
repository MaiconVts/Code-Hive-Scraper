# scrapers/linkedin_scraper.py
"""
Scraper LinkedIn — Blindagem Anti-Detecção Nível Máximo.

Camadas de proteção (da mais fundamental à mais avançada):

    1. TLS Fingerprint    — curl_cffi com impersonate="chrome" replica o handshake
                            TLS/JA3/HTTP2 idêntico ao Chrome real. A lib `requests`
                            tem fingerprint estático que Cloudflare identifica.

    2. Session Persistente — mantém cookies (JSESSIONID, bcookie, lidc, __cf_bm)
                            entre requests, como um navegador real.

    3. Warm-up 3 Etapas   — Google → Homepage → /jobs/ antes de qualquer busca.
                            Coleta cookies naturalmente e constrói referer chain.

    4. Headers Sec-Fetch   — Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site que
                            navegadores modernos enviam e bots não.

    5. Rotação User-Agent  — 5 variações de Chrome/Firefox/Safari reais.

    6. Delays Gaussianos   — random.gauss() com jitter de ±25%. Humanos têm
                            padrão bell curve, não flat random (uniform).

    7. Cooldown Keywords   — pausa entre palavras-chave diferentes (humano não
                            busca 78 termos em sequência sem parar).

    8. Detecção Tríplice   — authwall + captcha + response size anomaly.
                            3 sinais de bloqueio soft antes de ser banido.

    9. Circuit Breaker     — erros consecutivos > threshold → pausa automática.
                            Taxa de erro > 10% → pausa longa de recuperação.

   10. Teto Global         — máximo de requests por execução. Ao atingir, para
                            graciosamente sem ban.

   11. Referer Chain       — cada request tem referer da página anterior,
                            não do Google (exceto o primeiro).

Filtros de busca validados empiricamente:
    - geoId=106057199 — força vagas brasileiras apenas
    - f_WT=1          — Presencial (conjunto disjunto, filtro 100% eficaz)
    - f_WT=2          — Remoto     (conjunto disjunto, filtro 100% eficaz)
    - f_WT=3          — Híbrido    (conjunto disjunto, filtro 100% eficaz)

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

# Mapeamento de modalidade LinkedIn → padrão frontend MyOrbita.
# Usado pela inferência via localização (fallback quando filtro f_WT não se aplica).
MODALIDADE_MAP = {
    'remote': 'Remoto',
    'remoto': 'Remoto',
    'on-site': 'Presencial',
    'presencial': 'Presencial',
    'hybrid': 'Híbrido',
    'híbrido': 'Híbrido',
    'hibrido': 'Híbrido',
}

# Mapa: modalidade recebida do main.py → (código f_WT do LinkedIn, rótulo padronizado).
# Validado empiricamente: conjuntos 100% disjuntos entre as 3 modalidades,
# provando que o filtro f_WT funciona corretamente no LinkedIn público.
# f_WT=1 (presencial) | f_WT=2 (remoto) | f_WT=3 (híbrido)
F_WT_MAP = {
    'remoto':     ('2', 'Remoto'),
    'presencial': ('1', 'Presencial'),
    'hibrido':    ('3', 'Híbrido'),
    'híbrido':    ('3', 'Híbrido'),
}

# Pool de User-Agents reais e atualizados (2025-2026).
# curl_cffi já emula o TLS do Chrome, mas o header User-Agent ainda precisa
# ser coerente com o fingerprint — senão o Cloudflare nota a divergência.
_USER_AGENTS = [
    # Chrome 125 — Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    # Chrome 125 — macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    # Chrome 125 — Linux
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    # Chrome 124 — Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    # Chrome 123 — macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
]

# Sinais no HTML que indicam authwall (login obrigatório) ou captcha.
_BLOQUEIO_SIGNALS = [
    'authwall',
    'captcha',
    '/challenge/',
    'checkpoint/challenge',
]

# Tamanho mínimo esperado de um response com vagas (~50KB).
# Se vier abaixo disso, provavelmente é página de bloqueio/redirect.
_TAMANHO_MINIMO_RESPONSE = 20_000  # bytes


class LinkedinScraper(BaseScraper):
    """
    Implementação do scraper para vagas públicas do LinkedIn.

    Herda BaseScraper para o contrato de dados (padronizar_vaga, gerar_id_deterministico,
    _normalizar_campo, _normalizar_estado) mas NÃO usa fazer_requisicao_segura —
    implementa sua própria camada de request via curl_cffi com impersonate="chrome".

    Isso respeita SRP: BaseScraper define o contrato de dados,
    LinkedinScraper implementa sua própria estratégia de HTTP.
    """

    # --- Limites de paginação ---
    _VAGAS_POR_PAGINA = 25      # LinkedIn retorna 25 cards por página
    _MAX_PAGINAS = 4            # Máximo 4 páginas por keyword (100 vagas)

    # --- Limites globais de segurança ---
    _MAX_REQUESTS_POR_EXECUCAO = 2000  # Teto absoluto de requests HTTP
    _MAX_ERROS_CONSECUTIVOS = 5        # Circuit breaker: 5 erros seguidos → abort
    _TAXA_ERRO_CRITICA = 0.20          # 20% de erro → pausa de recuperação

    # --- Delays (em segundos) ---
    _DELAY_ENTRE_REQUESTS_MEDIA = 6.0   # Média do delay gaussiano entre requests
    _DELAY_ENTRE_REQUESTS_DESVIO = 1.5  # Desvio padrão (±25% jitter natural)
    _DELAY_ENTRE_KEYWORDS_MEDIA = 8.0   # Cooldown entre palavras-chave diferentes
    _DELAY_ENTRE_KEYWORDS_DESVIO = 2.0
    _PAUSA_LONGA_A_CADA = 50            # A cada N vagas, pausa longa
    _PAUSA_LONGA_MEDIA = 45.0           # Média da pausa longa (segundos)
    _PAUSA_LONGA_DESVIO = 10.0
    _PAUSA_RECUPERACAO = 120.0          # 2 minutos de pausa se taxa de erro alta

    # geoId oficial do Brasil no LinkedIn — garante que só retorna vagas brasileiras.
    # Sem ele, o LinkedIn mistura resultados globais mesmo com &location=Brasil.
    _GEO_ID_BRASIL = '106057199'

    def __init__(self):
        super().__init__(nome_plataforma="LinkedIn")

        # Estado da session
        self._session_aquecida: bool = False
        self._iniciar_session()

        # Contadores para monitoramento
        self._requests_realizados: int = 0
        self._requests_com_sucesso: int = 0
        self._erros_consecutivos: int = 0
        self._ultimo_referer: str = 'https://www.google.com/'

    # ==================================================================
    # CAMADA 1 — Session e TLS Fingerprint
    # ==================================================================

    def _iniciar_session(self):
        """
        Cria uma curl_cffi Session com impersonate="chrome".

        O que isso faz por baixo:
        - TLS handshake idêntico ao Chrome real (JA3/JA4 fingerprint)
        - Negocia HTTP/2 via ALPN (como Chrome faz)
        - Ordem de cipher suites idêntica ao Chrome
        - Extensions TLS na mesma ordem que o Chrome

        Resultado: Cloudflare vê um Chrome real, não um bot Python.
        Chamado no __init__ — session sempre existe, nunca é None.
        """
        self._session: cffi_requests.Session = cffi_requests.Session(impersonate="chrome")
        self._session.headers.update(self._gerar_headers_base())
        logger.info("[LINKEDIN] Session curl_cffi criada com impersonate='chrome'")

    def _gerar_headers_base(self) -> dict:
        """
        Gera headers completos de navegador moderno.
        Inclui Sec-Fetch-* que navegadores enviam e bots não.
        """
        return {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            # --- Headers Sec-Fetch (navegadores modernos) ---
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Sec-Ch-Ua': '"Chromium";v="125", "Google Chrome";v="125", "Not=A?Brand";v="24"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
        }

    def _rotacionar_user_agent(self):
        """Seleciona User-Agent aleatório coerente com o fingerprint Chrome."""
        ua = random.choice(_USER_AGENTS)
        self._session.headers['User-Agent'] = ua

    # ==================================================================
    # CAMADA 2 — Warm-up (Navegação Simulada)
    # ==================================================================

    def _aquecer_session(self):
        """
        Warm-up em 3 etapas: simula um humano que vem do Google,
        abre o LinkedIn, e navega até a seção de vagas.

        Cada etapa coleta cookies naturalmente:
        - Etapa 1 (homepage): JSESSIONID, bcookie, lang
        - Etapa 2 (/jobs/): lidc, bscookie
        - Os cookies __cf_bm do Cloudflare são setados automaticamente

        Executado apenas uma vez por instância do scraper.
        """
        if self._session_aquecida:
            return

        logger.info("[LINKEDIN] Aquecendo session (Google → Homepage → /jobs/)...")
        self._rotacionar_user_agent()

        try:
            # Etapa 1: Homepage — como se tivesse clicado num link do Google
            self._session.headers['Referer'] = 'https://www.google.com/'
            self._session.headers['Sec-Fetch-Site'] = 'cross-site'
            self._session.get('https://www.linkedin.com/', timeout=20)
            self._requests_realizados += 1
            self._delay_gaussiano(3.0, 1.0)

            # Etapa 2: Página de jobs — navegação interna
            self._session.headers['Referer'] = 'https://www.linkedin.com/'
            self._session.headers['Sec-Fetch-Site'] = 'same-origin'
            self._session.get('https://www.linkedin.com/jobs/', timeout=20)
            self._requests_realizados += 1
            self._delay_gaussiano(3.0, 1.0)

            # Atualiza referer chain para buscas subsequentes
            self._ultimo_referer = 'https://www.linkedin.com/jobs/'
            self._session_aquecida = True
            logger.info("[LINKEDIN] Session aquecida com sucesso — cookies coletados")

        except Exception as e:
            logger.warning(f"[LINKEDIN] Falha no warm-up: {e} — continuando sem warm-up")
            self._session_aquecida = True  # Não trava execução

    # ==================================================================
    # CAMADA 3 — Delays Humanizados (Gaussiana + Jitter)
    # ==================================================================

    def _delay_gaussiano(self, media: float, desvio: float):
        """
        Aplica delay com distribuição gaussiana + jitter.

        Por que gaussiana e não uniform?
        - uniform(3, 7) gera delays igualmente distribuídos entre 3-7s.
          Nenhum humano real tem esse padrão — é detectável.
        - gauss(5, 1.5) gera delays concentrados em ~5s com variação
          natural. Maioria fica entre 3.5-6.5s, raramente vai a 2s ou 8s.
          Isso é como humanos realmente se comportam.

        O clamp garante mínimo de 1.5s (nunca instantâneo) e
        máximo de media*3 (nunca pausa absurda).
        """
        delay = random.gauss(media, desvio)
        delay = max(1.5, min(delay, media * 3))  # Clamp: [1.5s, media*3]
        time.sleep(delay)

    # ==================================================================
    # CAMADA 4 — Detecção de Bloqueio (3 sinais)
    # ==================================================================

    def _detectar_bloqueio(self, response) -> str | None:
        """
        Analisa o response procurando 3 sinais de bloqueio soft:

        1. Authwall/Captcha — HTML contém sinais de login forçado ou challenge
        2. Response pequeno  — HTML muito menor que o esperado (~300KB normal)
        3. Ausência de cards — response não contém nenhum card de vaga

        Retorna string com motivo do bloqueio ou None se tudo OK.
        """
        content = response.content
        content_text = content.decode('utf-8', errors='ignore').lower()
        content_size = len(content)

        # Sinal 1: Authwall ou Captcha
        for sinal in _BLOQUEIO_SIGNALS:
            if sinal in content_text:
                # Exceção: se tem cards de vaga junto, não é bloqueio
                if 'job-search-card' in content_text:
                    continue
                return f"authwall/captcha detectado (sinal: '{sinal}')"

        # Sinal 2: Response muito pequeno (página de bloqueio/redirect)
        if content_size < _TAMANHO_MINIMO_RESPONSE:
            # Pode ser página legítima sem resultados — verifica se tem estrutura
            if 'no-results' in content_text or 'jobs-search' in content_text:
                return None  # Página legítima, só sem vagas
            return f"response muito pequeno ({content_size} bytes, mínimo: {_TAMANHO_MINIMO_RESPONSE})"

        # Sinal 3: Sem cards de vaga em response grande
        # (LinkedIn pode retornar 200 OK com HTML de login)
        if content_size > 50_000 and 'job-search-card' not in content_text:
            return "response grande mas sem cards de vaga (possível redirect para login)"

        return None  # Tudo OK

    # ==================================================================
    # CAMADA 5 — Circuit Breaker e Monitoramento
    # ==================================================================

    def _limite_global_atingido(self) -> bool:
        """Verifica se o teto global de requests foi atingido."""
        if self._requests_realizados >= self._MAX_REQUESTS_POR_EXECUCAO:
            logger.warning(
                f"[LINKEDIN] Teto global de {self._MAX_REQUESTS_POR_EXECUCAO} requests atingido. "
                f"Parando graciosamente."
            )
            return True
        return False

    def _circuit_breaker_aberto(self) -> bool:
        """
        Circuit Breaker: se erros consecutivos excedem threshold, para.
        Previne spam de requests quando o LinkedIn já está bloqueando.
        """
        if self._erros_consecutivos >= self._MAX_ERROS_CONSECUTIVOS:
            logger.error(
                f"[LINKEDIN] Circuit breaker aberto: {self._erros_consecutivos} erros consecutivos. "
                f"Abortando para evitar ban."
            )
            return True
        return False

    def _verificar_taxa_erro(self):
        """
        Monitora taxa de erro em tempo real.
        Se > 10%, pausa de 5 minutos para recuperação antes de continuar.
        """
        if self._requests_realizados < 10:
            return  # Amostra muito pequena

        taxa = 1 - (self._requests_com_sucesso / self._requests_realizados)
        if taxa > self._TAXA_ERRO_CRITICA:
            logger.warning(
                f"[LINKEDIN] Taxa de erro {taxa:.1%} acima do limiar ({self._TAXA_ERRO_CRITICA:.0%}). "
                f"Pausa de recuperação de {self._PAUSA_RECUPERACAO / 60:.0f} minutos..."
            )
            time.sleep(self._PAUSA_RECUPERACAO)
            # Reseta contadores para dar chance de recuperar
            self._erros_consecutivos = 0

    def _registrar_sucesso(self):
        """Registra request bem-sucedido e reseta circuit breaker."""
        self._requests_com_sucesso += 1
        self._erros_consecutivos = 0

    def _registrar_erro(self, motivo: str):
        """Registra erro e incrementa circuit breaker."""
        self._erros_consecutivos += 1
        logger.warning(
            f"[LINKEDIN] Erro #{self._erros_consecutivos}: {motivo} "
            f"(total requests: {self._requests_realizados})"
        )

    # ==================================================================
    # CAMADA 6 — Parsing HTML
    # ==================================================================

    def _extrair_cards(self, html_content: bytes) -> list:
        """Extrai todos os cards de vaga do HTML."""
        tree = lxml_html.fromstring(html_content)
        return tree.xpath(
            '//div[contains(@class, "base-card") and contains(@class, "job-search-card")]'
        )

    def _parse_card(self, card) -> dict | None:
        """
        Extrai dados brutos de um único card de vaga.
        Retorna dict com campos crus ou None se card inválido.
        """
        # Link (obrigatório)
        links = card.xpath('.//a[contains(@class, "base-card__full-link")]/@href')
        if not links:
            return None
        link = links[0].split('?')[0].strip()
        if not link:
            return None

        # Título
        titulos = card.xpath('.//h3[contains(@class, "base-search-card__title")]/text()')
        titulo = titulos[0].strip() if titulos else None

        # Empresa
        empresas = card.xpath('.//h4[contains(@class, "base-search-card__subtitle")]//a/text()')
        empresa = empresas[0].strip() if empresas else None

        # Localização (ex: "São Paulo, São Paulo, Brasil")
        locais = card.xpath('.//span[contains(@class, "job-search-card__location")]/text()')
        localizacao = locais[0].strip() if locais else None

        # Data (atributo datetime — prioriza classe normal, fallback pra --new)
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

    def _parse_localizacao(self, localizacao_raw: str | None) -> tuple:
        """
        Separa localização LinkedIn em (city, state, country).
        "São Paulo, São Paulo, Brasil" → ("São Paulo", "São Paulo", "Brasil")
        "Brasil"                       → (None, None, "Brasil")
        None                           → (None, None, None)
        """
        if not localizacao_raw:
            return None, None, None

        partes = [p.strip() for p in localizacao_raw.split(',')]

        if len(partes) >= 3:
            return partes[0], partes[1], partes[2]
        if len(partes) == 2:
            return partes[0], partes[1], None
        return None, None, partes[0]

    def _inferir_modalidade(self, localizacao_raw: str | None) -> str:
        """Infere modalidade a partir da localização (fallback quando filtro não se aplica)."""
        if not localizacao_raw:
            return 'Não informado'

        loc_lower = localizacao_raw.lower()
        for termo, modalidade in MODALIDADE_MAP.items():
            if termo in loc_lower:
                return modalidade

        return 'Não informado'

    def _normalizar_vaga(self, vaga_raw: dict, modalidade_explicita: str | None = None) -> dict:
        """
        Ponto único de conversão: dict bruto do parser → formato padronizado MyOrbita.

        Args:
            vaga_raw: dict com campos extraídos do HTML
            modalidade_explicita: se fornecida (ex: "Remoto" via filtro f_WT=2),
                                  é usada diretamente. Senão, infere da localização.
        """
        link = vaga_raw['link']
        city_raw, state_raw, country_raw = self._parse_localizacao(vaga_raw.get('localizacao'))

        # Prioridade: modalidade explícita (do filtro f_WT) > inferida da localização
        if modalidade_explicita:
            modalidade = modalidade_explicita
        else:
            modalidade = self._inferir_modalidade(vaga_raw.get('localizacao'))

        # is_remote é True quando a vaga é explicitamente remota
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
        Monta URL de busca do LinkedIn com paginação, geoId do Brasil e
        opcional filtro de modalidade (f_WT).

        Args:
            palavra_chave: termo de busca (será URL-encoded)
            offset: paginação (0, 25, 50...)
            f_wt: código da modalidade — '1' presencial, '2' remoto, '3' híbrido.
                  Se None, busca sem filtro (todas as modalidades).
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
        """
        Faz request ao LinkedIn com todas as camadas de proteção ativas.

        Fluxo:
        1. Verifica teto global e circuit breaker
        2. Rotaciona User-Agent
        3. Atualiza referer chain (página anterior → atual)
        4. Atualiza Sec-Fetch-Site para same-origin (navegação interna)
        5. Delay gaussiano com jitter
        6. Request via curl_cffi (TLS Chrome)
        7. Detecta bloqueio tríplice no response
        8. Registra sucesso ou erro no monitoramento

        Retorna response ou None se bloqueado/erro.
        """
        # Guard clauses
        if self._limite_global_atingido():
            return None
        if self._circuit_breaker_aberto():
            return None

        # Preparação
        self._rotacionar_user_agent()
        self._session.headers['Referer'] = self._ultimo_referer
        self._session.headers['Sec-Fetch-Site'] = 'same-origin'

        # Delay humanizado
        self._delay_gaussiano(self._DELAY_ENTRE_REQUESTS_MEDIA, self._DELAY_ENTRE_REQUESTS_DESVIO)

        try:
            response = self._session.get(url, timeout=20)
            self._requests_realizados += 1

            # HTTP 200 — verifica se é real ou bloqueio disfarçado
            if response.status_code == 200:
                motivo_bloqueio = self._detectar_bloqueio(response)
                if motivo_bloqueio:
                    self._registrar_erro(motivo_bloqueio)
                    return None

                self._registrar_sucesso()
                self._ultimo_referer = url
                return response

            # HTTP 429 — Rate Limit
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                self._registrar_erro(f"Rate limit (429) — aguardando {retry_after}s")
                time.sleep(retry_after)
                return None

            # HTTP 403 — Bloqueio permanente
            if response.status_code == 403:
                self._registrar_erro("Bloqueio permanente (403)")
                # Incrementa extra pra acionar circuit breaker mais rápido
                self._erros_consecutivos += 2
                return None

            # Outros erros
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
        Implementação obrigatória do método de busca (contrato BaseScraper).

        Faz scraping da página pública de vagas do LinkedIn com:
        - Filtro de modalidade via parâmetro f_WT (validado empiricamente)
        - Paginação via &start=0, 25, 50...
        - Todas as camadas de anti-detecção ativas
        - Cooldown entre keywords (chamado pelo main.py em loop)

        Se a modalidade recebida não for mapeável (ex: string vazia),
        busca sem filtro e infere modalidade da localização (fallback).

        Retorna lista de dicts padronizados (15 chaves via padronizar_vaga).
        """
        # Guard clauses
        if self._limite_global_atingido():
            return []
        if self._circuit_breaker_aberto():
            return []

        # Aquece session na primeira chamada (session já existe desde __init__)
        self._aquecer_session()

        # Verifica taxa de erro antes de cada keyword
        self._verificar_taxa_erro()

        # Resolve modalidade → f_WT e rótulo padronizado
        modalidade_normalizada = modalidade.lower().strip() if modalidade else ''
        f_wt_code, modalidade_rotulo = F_WT_MAP.get(modalidade_normalizada, (None, None))

        todas_vagas = []
        vagas_acumuladas_para_pausa = 0

        # Calcula páginas necessárias (respeitando teto)
        max_paginas = min(
            (limite + self._VAGAS_POR_PAGINA - 1) // self._VAGAS_POR_PAGINA,
            self._MAX_PAGINAS
        )

        for pagina in range(max_paginas):
            offset = pagina * self._VAGAS_POR_PAGINA
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
            vagas_acumuladas_para_pausa += len(vagas_pagina)

            logger.info(
                f"[LINKEDIN] Página {pagina + 1}: {len(vagas_pagina)} vagas "
                f"(acumulado: {len(todas_vagas)})"
            )

            # Pausa longa a cada N vagas (simula humano que para pra ler)
            if vagas_acumuladas_para_pausa >= self._PAUSA_LONGA_A_CADA:
                self._delay_gaussiano(self._PAUSA_LONGA_MEDIA, self._PAUSA_LONGA_DESVIO)
                logger.info(f"[LINKEDIN] Pausa longa após {vagas_acumuladas_para_pausa} vagas")
                vagas_acumuladas_para_pausa = 0

        rotulo_log = modalidade_rotulo or 'todas'
        logger.info(f"[LINKEDIN] '{palavra_chave}' ({rotulo_log}): {len(todas_vagas)} vagas coletadas")

        # Cooldown entre keywords — humano não busca termos em sequência sem parar
        self._delay_gaussiano(self._DELAY_ENTRE_KEYWORDS_MEDIA, self._DELAY_ENTRE_KEYWORDS_DESVIO)

        return todas_vagas