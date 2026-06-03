// Estado das Server Actions de matrícula (fora de actions.ts porque um módulo
// "use server" só pode exportar funções async).

export interface EnrollState {
  error: string | null;
  notice: string | null;
}

export const initialEnrollState: EnrollState = { error: null, notice: null };
