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

export interface Notification {
  id: string
  type: NotificationType
  message: string
  read: boolean
  link_to: string
  created_at: string
}
