import { useState, useEffect, useCallback, useRef } from "react";
import { getVagas } from "../services/api";
import type { IVaga } from "../types/IVaga";

/**
 * Cache de vagas em localStorage com TTL.
 *
 * Estratégia:
 * - Cada rota Firebase tem sua própria entrada no cache (chave individual).
 * - Em cada mount: tenta ler do cache → se válido, usa instantâneo sem rede.
 * - Se expirado ou ausente, busca do Firebase e atualiza o cache.
 * - Expor recarregar() permite forçar fetch (botão "Atualizar").
 *
 * SRP: este hook só gerencia cache + fetch. Filtragem/paginação fica no useFiltrosVagas.
 *
 * Analogia C#: é como um IMemoryCache.GetOrCreateAsync() por rota, mas rodando no
 * browser em vez do servidor, usando localStorage como backing store.
 */

// TTL de 1 hora (valor em milissegundos)
const CACHE_TTL_MS = 60 * 60 * 1000;

// Prefixo das chaves no localStorage — evita conflito com outras libs
const CACHE_PREFIX = "myorbita:cache:vagas:";
const CACHE_TS_SUFFIX = ":ts";

type CacheEntry = {
  vagas: IVaga[];
  timestamp: number;
};

/**
 * Lê o cache de uma rota específica.
 * Retorna null se não existir, estiver corrompido ou expirado.
 */
const lerCacheRota = (rota: string): CacheEntry | null => {
  try {
    const chaveVagas = `${CACHE_PREFIX}${rota}`;
    const chaveTs = `${chaveVagas}${CACHE_TS_SUFFIX}`;

    const rawVagas = localStorage.getItem(chaveVagas);
    const rawTs = localStorage.getItem(chaveTs);

    if (!rawVagas || !rawTs) return null;

    const timestamp = parseInt(rawTs, 10);
    if (isNaN(timestamp)) return null;

    // Cache expirado?
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;

    const vagas = JSON.parse(rawVagas) as IVaga[];
    if (!Array.isArray(vagas)) return null;

    return { vagas, timestamp };
  } catch (e) {
    console.warn(`[cache] Falha ao ler cache da rota '${rota}':`, e);
    return null;
  }
};

/**
 * Salva no cache o resultado de uma rota, junto com timestamp da escrita.
 */
const salvarCacheRota = (rota: string, vagas: IVaga[]): void => {
  try {
    const chaveVagas = `${CACHE_PREFIX}${rota}`;
    const chaveTs = `${chaveVagas}${CACHE_TS_SUFFIX}`;
    localStorage.setItem(chaveVagas, JSON.stringify(vagas));
    localStorage.setItem(chaveTs, String(Date.now()));
  } catch (e) {
    // localStorage cheio ou modo privado no Safari — falha silenciosamente
    console.warn(`[cache] Falha ao salvar cache da rota '${rota}':`, e);
  }
};

/**
 * Invalida (remove) o cache de uma rota específica.
 * Usado por recarregar() antes de buscar novamente do Firebase.
 */
const invalidarCacheRota = (rota: string): void => {
  try {
    const chaveVagas = `${CACHE_PREFIX}${rota}`;
    const chaveTs = `${chaveVagas}${CACHE_TS_SUFFIX}`;
    localStorage.removeItem(chaveVagas);
    localStorage.removeItem(chaveTs);
  } catch (e) {
    console.warn(`[cache] Falha ao invalidar cache da rota '${rota}':`, e);
  }
};

type UseCacheVagasReturn = {
  /** Array mesclado de vagas de todas as rotas solicitadas. */
  vagas: IVaga[];
  /** True enquanto a primeira carga do Firebase está em andamento. */
  carregando: boolean;
  /** Timestamp (ms) da última vez que as vagas foram atualizadas (cache ou fetch). */
  atualizadoEm: number | null;
  /** Força invalidação do cache e refetch do Firebase. */
  recarregar: () => Promise<void>;
  /** True enquanto um refetch manual está acontecendo (distinto de carregando). */
  atualizando: boolean;
  /** Mensagem de erro da última tentativa de fetch (null se bem-sucedida). */
  erro: string | null;
};

/**
 * Hook que busca vagas de múltiplas rotas do Firebase com cache local.
 *
 * @param rotas Array de rotas Firebase (ex: [ROUTES.FIREBASE_VAGAS_DEV_GUPY, ROUTES.FIREBASE_VAGAS_DEV_LINKEDIN])
 * @returns Objeto com vagas mescladas, estados de loading e função de recarregar
 */
export function useCacheVagas(rotas: string[]): UseCacheVagasReturn {
  const [vagas, setVagas] = useState<IVaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Estabiliza a referência de `rotas` pelo conteúdo, não pela identidade do array.
  // Evita que o consumidor passando `[ROUTE_A, ROUTE_B]` inline a cada render
  // invalide useCallback/useEffect desnecessariamente.
  const rotasRef = useRef<string[]>(rotas);
  const rotasAssinatura = rotas.join("|");
  if (rotasRef.current.join("|") !== rotasAssinatura) {
    rotasRef.current = rotas;
  }

  /**
   * Busca as vagas de cada rota, priorizando cache local.
   * Só rotas expiradas/sem cache geram fetch real ao Firebase.
   *
   * Cada rota é fetchada individualmente (Promise.all) para garantir isolamento:
   * os dados de /vagas/dev/gupy jamais contaminam /vagas/adv/gupy no cache,
   * mesmo que ambas tenham o mesmo campo 'origem'.
   *
   * @param forcar Se true, ignora cache e sempre fetcha do Firebase
   */
  const buscarTodas = useCallback(
    async (forcar: boolean = false) => {
      const rotasAtuais = rotasRef.current;

      // null = nenhum cache hit ainda; vamos preencher conforme lemos cache.
      let timestampMaisAntigo: number | null = null;
      const rotasParaFetchar: string[] = [];
      const vagasDoCache: IVaga[] = [];

      // 1. Passo: verifica cache de cada rota
      for (const rota of rotasAtuais) {
        if (forcar) {
          invalidarCacheRota(rota);
          rotasParaFetchar.push(rota);
          continue;
        }

        const entry = lerCacheRota(rota);
        if (entry) {
          vagasDoCache.push(...entry.vagas);
          // Pra o "atualizado há X" usamos o timestamp mais antigo entre as rotas cacheadas
          if (timestampMaisAntigo === null || entry.timestamp < timestampMaisAntigo) {
            timestampMaisAntigo = entry.timestamp;
          }
        } else {
          rotasParaFetchar.push(rota);
        }
      }

      // 2. Passo: se precisa fetchar algo, busca cada rota individualmente em paralelo.
      // Buscar rota por rota é essencial: getVagas retorna vagas mescladas sem metadado
      // de origem-rota, e tentar reagrupar por campo 'origem' contamina o cache entre
      // categorias (dev/adv compartilham origem Gupy/LinkedIn).
      if (rotasParaFetchar.length > 0) {
        const fetchesParalelos = await Promise.all(
          rotasParaFetchar.map(async (rota) => {
            const vagasRota = await getVagas([rota]);
            salvarCacheRota(rota, vagasRota);
            return vagasRota;
          })
        );
        const vagasFetchadas = fetchesParalelos.flat();

        const todasMescladas = [...vagasDoCache, ...vagasFetchadas];
        setVagas(todasMescladas);

        // Se TODAS as rotas foram fetchadas agora, atualizadoEm = agora.
        // Se foi um hit parcial (parte cache, parte fetch), o valor mais antigo
        // reflete a realidade melhor do que mentir "atualizado agora".
        if (rotasParaFetchar.length === rotasAtuais.length) {
          setAtualizadoEm(Date.now());
        } else {
          setAtualizadoEm(timestampMaisAntigo ?? Date.now());
        }
      } else {
        // Tudo veio do cache — usa o timestamp mais antigo
        setVagas(vagasDoCache);
        setAtualizadoEm(timestampMaisAntigo ?? Date.now());
      }
    },
    // rotasAssinatura muda quando o CONTEÚDO do array muda.
    // Não depende da identidade do array passado pelo consumidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rotasAssinatura]
  );

  // Carga inicial: roda uma vez no mount (e quando o conteúdo das rotas muda)
  useEffect(() => {
    let cancelado = false;

    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        await buscarTodas(false);
      } catch (e) {
        if (!cancelado) {
          const msg = e instanceof Error ? e.message : "Erro desconhecido ao buscar vagas";
          console.error("[useCacheVagas] Falha ao carregar:", e);
          setErro(msg);
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [buscarTodas]);

  /**
   * Força refetch completo, ignorando cache.
   * Usado pelo botão "Atualizar".
   */
  const recarregar = useCallback(async () => {
    setAtualizando(true);
    setErro(null);
    try {
      await buscarTodas(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido ao recarregar vagas";
      console.error("[useCacheVagas] Falha ao recarregar:", e);
      setErro(msg);
    } finally {
      setAtualizando(false);
    }
  }, [buscarTodas]);

  return { vagas, carregando, atualizando, atualizadoEm, recarregar, erro };
}