"use client";

// Wrapper de <form action={serverAction}> que pede confirmação ao usuário
// antes de submeter. Se a pessoa cancelar, a Server Action não roda.
//
// Uso típico (sem mudar Server Actions existentes):
//   <ConfirmForm action={deleteLesson} message="Tem certeza...?">
//     <input type="hidden" name="id" value={lesson.id} />
//     <Button type="submit" variant="ghost" size="sm">
//       <TrashIcon className="h-4 w-4" />
//     </Button>
//   </ConfirmForm>

import { type ComponentProps } from "react";

type FormProps = ComponentProps<"form">;

export function ConfirmForm({
  action,
  message,
  className,
  children,
  ...rest
}: {
  action: FormProps["action"];
  message: string;
  className?: string;
  children: React.ReactNode;
} & Omit<FormProps, "action" | "onSubmit" | "className" | "children">) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className={className}
      {...rest}
    >
      {children}
    </form>
  );
}
