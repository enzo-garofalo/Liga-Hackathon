export type NotificationType =
  | 'team_invite'
  | 'join_request'
  | 'invite_accepted'
  | 'invite_declined'
  | 'join_accepted'
  | 'join_declined'
  | 'team_submitted'
  | 'team_approved'
  | 'team_rejected'
  | 'team_removed'
  | 'team_disbanded'
  // Processo seletivo (v3)
  | 'application_confirmed'
  | 'stage_advanced'
  | 'application_approved'
  | 'application_rejected'
  | 'custom_communication'

export interface Notification {
  id: string
  type: NotificationType
  /** Rótulo humano do tipo, vindo de NotificationType.CHOICES no backend. */
  type_display: string
  /**
   * Primeira linha: o resumo que aparece na lista do sino.
   * Depois da linha em branco: o detalhe, lido no pop-up.
   */
  message: string
  read: boolean
  link_to: string
  created_at: string
}
