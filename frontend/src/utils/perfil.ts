/**
 * Teto da bio, o mesmo que o backend aplica em `BIO_MAX_LENGTH`.
 *
 * As duas telas que editam bio, cadastro e perfil, liam este número de lugares
 * diferentes: uma tinha a constante, a outra tinha o número escrito à mão. Mudar
 * em um só deixaria a outra prometendo o número errado.
 *
 * Mudar aqui pede mudar `BIO_MAX_LENGTH` no backend junto: o contador da tela é
 * só promessa, quem recusa de verdade é a API.
 */
export const BIO_MAX = 1500
