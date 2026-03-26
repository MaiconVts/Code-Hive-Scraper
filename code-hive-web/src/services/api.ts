import {ref, get } from "firebase/database";
import { database } from "./firebase";
import type { IVaga } from "../types/IVaga";
import { ROUTES } from "../constants/routes";

export const getVagas = async (rota: string = ROUTES.VAGAS_DEV): Promise<IVaga[]> => {
    const referencia = ref(database, rota);
    const snapshot = await get(referencia);
    const dados = snapshot.val();
    return Object.values(dados || {});
}

//Exemplos de uso da função getVagas para obter as vagas de desenvolvimento e de advocacia, respectivamente.
//getVagas(ROUTES.VAGAS_DEV)
//getVagas(ROUTES.VAGAS_ADV)

