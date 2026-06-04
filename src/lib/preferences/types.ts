// Tipos e estado inicial das Server Actions de preferências. Ficam fora de
// actions.ts porque um módulo "use server" só pode exportar funções async.

export interface PreferencesState {
  error: string | null;
  notice: string | null;
}

export const initialPreferencesState: PreferencesState = {
  error: null,
  notice: null,
};
