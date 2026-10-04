export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Incluye al menos una mayúscula, una minúscula y un número.";
  }
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return "";
}
