# Modelos de dados

## Team
| Campo       | Tipo         | Observação                        |
|-------------|--------------|-----------------------------------|
| id          | UUID PK      | auto                              |
| name        | CharField    | nome da equipe, único             |
| title       | CharField    | título do projeto                 |
| proposal    | TextField    | descrição da proposta             |
| status      | CharField    | choices: pending/approved/rejected|
| created_at  | DateTimeField| auto_now_add                      |
| updated_at  | DateTimeField| auto_now                          |

## Participant
| Campo       | Tipo         | Observação                        |
|-------------|--------------|-----------------------------------|
| id          | UUID PK      | auto                              |
| team        | FK → Team    | on_delete=CASCADE                 |
| full_name   | CharField    |                                   |
| email       | EmailField   |                                   |
| phone       | CharField    | formato livre                     |
| ra          | CharField    | Registro Acadêmico                |
| github      | URLField     | blank=True, null=True             |
| is_leader   | BooleanField | default=False                     |

## Validações no nível do model / serializer
- Team deve ter exatamente 4 participantes para ser submetida.
- Team deve ter exatamente 1 participante com is_leader=True.
- Não permitir is_leader=True em mais de um participante da mesma equipe.
- Máximo de 10 equipes com status=approved (validar no view de aprovação).