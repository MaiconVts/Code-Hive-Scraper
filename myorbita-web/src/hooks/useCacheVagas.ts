import { useState, useEffect, useCallback } from "react";
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

  /**
   * Busca as vagas de cada rota, priorizando cache local.
   * Só rotas expiradas/sem cache geram fetch real ao Firebase.
   *
   * @param forcar Se true, ignora cache e sempre fetcha do Firebase
   */
  const buscarTodas = useCallback(
    async (forcar: boolean = false) => {
      // Se nenhum cache hit acontecer, timestamps valem Date.now() ao final
      let timestampMaisAntigo = Date.now();
      const rotasParaFetchar: string[] = [];
      const vagasDoCache: IVaga[] = [];

      // 1. Passo: verifica cache de cada rota
      for (const rota of rotas) {
        if (forcar) {
          invalidarCacheRota(rota);
          rotasParaFetchar.push(rota);
          continue;
        }

        const entry = lerCacheRota(rota);
        if (entry) {
          vagasDoCache.push(...entry.vagas);
          // Pra o "atualizado há X" usamos o timestamp mais antigo entre as rotas cacheadas
          if (entry.timestamp < timestampMaisAntigo) {
            timestampMaisAntigo = entry.timestamp;
          }
        } else {
          rotasParaFetchar.push(rota);
        }
      }

      // 2. Passo: se precisa fetchar algo, chama getVagas (que já tem Promise.allSettled)
      if (rotasParaFetchar.length > 0) {
        const vagasFetchadas = await getVagas(rotasParaFetchar);

        // Reagrupa por rota pra salvar cache individual (vagas vieram mescladas)
        for (const rota of rotasParaFetchar) {
          const vagasDessaRota = vagasFetchadas.filter(
            (v) => v.origem && rotaPertenceAOrigem(rota, v.origem)
          );
          salvarCacheRota(rota, vagasDessaRota);
        }

        // Junta tudo: cache + fetch novo
        const todasMescladas = [...vagasDoCache, ...vagasFetchadas];
        setVagas(todasMescladas);
        setAtualizadoEm(Date.now());
      } else {
        // Tudo veio do cache — usa o timestamp mais antigo
        setVagas(vagasDoCache);
        setAtualizadoEm(timestampMaisAntigo);
      }
    },
    [rotas]
  );

  // Carga inicial: roda uma vez no mount
  useEffect(() => {
    (async () => {
      setCarregando(true);
      await buscarTodas(false);
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Força refetch completo, ignorando cache.
   * Usado pelo botão "Atualizar".
   */
  const recarregar = useCallback(async () => {
    setAtualizando(true);
    await buscarTodas(true);
    setAtualizando(false);
  }, [buscarTodas]);

  return { vagas, carregando, atualizando, atualizadoEm, recarregar };
}

/**
 * Helper: verifica se uma rota Firebase corresponde a uma origem.
 * Ex: '/vagas/dev/gupy' → vagas com origem='Gupy'
 *     '/vagas/dev/linkedin' → vagas com origem='LinkedIn'
 *
 * Comparação case-insensitive porque o backend padroniza, mas defensivo.
 */
function rotaPertenceAOrigem(rota: string, origem: string): boolean {
  return rota.toLowerCase().endsWith(`/${origem.toLowerCase()}`);
}