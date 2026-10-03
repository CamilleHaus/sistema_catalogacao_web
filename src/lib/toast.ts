import toast from "react-hot-toast";

/** Confirmação de sucesso (criar/editar/salvar). Erros continuam como banner inline. */
export function notifySuccess(message: string) {
  toast.success(message);
}
