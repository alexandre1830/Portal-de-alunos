// Estado das Server Actions de matrícula (fora de actions.ts porque um módulo
// "use server" só pode exportar funções async).

export interface EnrollState {
  error: string | null;
  notice: string | null;
}

export const initialEnrollState: EnrollState = { error: null, notice: null };

export interface CreateStudentState {
  error: string | null;
  notice: string | null;
  // Credenciais exibidas só após o sucesso, para o admin entregar ao aluno.
  credentials: { email: string; password: string } | null;
}

export const initialCreateStudentState: CreateStudentState = {
  error: null,
  notice: null,
  credentials: null,
};
