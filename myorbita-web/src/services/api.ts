import { ref, get } from "firebase/database";
import { database } from "./firebase";
import type { IVaga } from "../types/IVaga";

/**
 * Busca vagas de uma única rota do Firebase Realtime Database.
 * Retorna array vazio se a rota não existir ou estiver vazia.
 */
const buscarRota = async (rota: string): Promise<IVaga[]> => {
    const referencia = ref(database, rota);
    const snapshot = await get(referencia);
    const dados = snapshot.val();
    return Object.values(dados || {});
};

/**
 * Busca vagas de múltiplas rotas em paralelo e retorna a união (achatada).
 *
 * Usa Promise.allSettled em vez de Promise.all para tolerância a falhas:
 * se uma rota falhar (ex: LinkedIn ainda não foi populado), as outras
 * continuam sendo retornadas normalmente — o usuário vê as vagas que existem.
 *
 * @param rotas Array de caminhos do Firebase (ex: ROUTES.FIREBASE_VAGAS_DEV_GUPY)
 * @returns Array único com todas as vagas das rotas que responderam
 */
export const getVagas = async (rotas: string[]): Promise<IVaga[]> => {
    const resultados = await Promise.allSettled(rotas.map(buscarRota));

    return resultados.flatMap((resultado, indice) => {
        if (resultado.status === "fulfilled") {
            return resultado.value;
        }
        // Loga falha sem quebrar a aplicação — outras rotas seguem normais.
        console.warn(`[api] Falha ao buscar rota '${rotas[indice]}':`, resultado.reason);
        return [];
    });
};