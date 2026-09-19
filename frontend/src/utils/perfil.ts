/**
 * Teto da bio, o mesmo que o backend aplica em `BIO_MAX_LENGTH`.
 *
 * As duas telas que editam bio, cadastro e perfil, liam este número de lugares
 * diferentes: uma tinha a constante, a outra tinha 500 escrito à mão. Mudar em
 * um só deixaria a outra prometendo o número errado.
 */
export const BIO_MAX = 500
